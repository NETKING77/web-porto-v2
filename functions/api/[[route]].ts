import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import {
  BRAND_NAME,
  OWNER_NAME,
  JOB_TITLE,
  HEADLINE,
  COMPANY,
  SOCIAL_LINKS,
  GITHUB_USERNAME,
  WAKATIME_USERNAME,
} from '../../src/config/Identity';

export interface Env {
  GEMINI_API_KEY?: string;
  AI_MODEL_PRIMARY?: string;
  AI_MODEL_FALLBACK?: string;
  GITHUB_USERNAME?: string;
  GITHUB_TOKEN?: string;
  WAKATIME_APP_SECRET?: string;
  COINGECKO_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// --- AI Chat ---
const tokenize = (text: string) => text.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fa5]{1,4}/g) || [];

const NAV_VERBS = new Set([
  'show', 'see', 'view', 'open', 'go', 'goto', 'visit', 'browse', 'take',
  'navigate', 'jump', 'bring', 'redirect',
  'lihat', 'tampilkan', 'buka', 'pergi', 'kunjungi', 'arahkan', 'tuju',
  '打开', '查看', '浏览', '转到', '前往', '跳转', '访问', '显示', '去',
]);

const NAV_PHRASES = [
  /\b(?:go|take me|bring me|jump|navigate)\s+to\b/,
  /\b(?:show|take|bring)\s+me\b/,
  /\b(?:bawa|antar)\s+saya\s+ke\b/,
  /\bpergi\s+ke\b/,
  /\bke\s+halaman\b/,
  /\bliat(?:h)?\s+(?:halaman|proyek|projek)\b/,
  /(?:带我去|去|前往|查看|打开|跳转到)(?:页面|项目|证书|关于|主页|联系)/,
];

const REDIRECT_MAP: Record<string, string[]> = {
  '/': ['home', 'homepage', 'beranda', 'landing', '首页', '主页'],
  '/talk': ['contact', 'kontak', 'hubungi', 'talk', '联系', '沟通', '合作'],
  '/#about': ['about', 'tentang', 'profil', '关于', '个人介绍'],
  '/#skills': ['skill', 'skills', 'kemampuan', 'keahlian', '技能', '技术栈'],
  '/career': ['career', 'karir', 'pengalaman', 'experience', '经历', '履历', '职业历程'],
  '/roadmap': ['roadmap', 'belajar', 'learn', '路线图'],
  '/projects': ['project', 'projects', 'projek', 'portfolio', 'portofolio', 'proyek', '项目', '作品集', '案例'],
  '/certification': ['certificates', 'certificate', 'certifications', 'sertifikat', 'certification', '证书', '资质', '认证'],
};

const SOCIAL_MAP: Record<string, string[]> = {
  [SOCIAL_LINKS.tiktok]: ['tiktok'],
  [SOCIAL_LINKS.instagram]: ['instagram', 'insta'],
  [SOCIAL_LINKS.youtube]: ['youtube'],
  [SOCIAL_LINKS.linkedin]: ['linkedin'],
  [SOCIAL_LINKS.github]: ['github'],
};

const isNavigationIntent = (text: string, tokens: string[]) => {
  if (tokens.some((t) => NAV_VERBS.has(t))) return true;
  return NAV_PHRASES.some((re) => re.test(text));
};

const SYSTEM_PROMPT = `
System instruction:

You are an AI assistant on ${BRAND_NAME}'s personal website.

About ${BRAND_NAME}:
- ${JOB_TITLE}
- ${HEADLINE}
- Founder of ${COMPANY.name} (${COMPANY.url})

STRICT SCOPE GUARDRAIL (MANDATORY):
- You MUST ONLY answer questions directly related to ${BRAND_NAME} (${OWNER_NAME}), their skills, portfolio, experience, projects, achievements, career, education, or their company ${COMPANY.name}.
- NEVER answer general knowledge questions, math problems, recipes, coding tutorials/troubleshooting for unrelated projects, or any topic unrelated to ${BRAND_NAME}.
- If a question is outside this scope, politely decline and redirect to ${BRAND_NAME}'s profile, portfolio, projects and skills.

Your job:
- Answer questions about ${BRAND_NAME}'s skills, background, and work.
- Help visitors understand their technical projects and expertise.
- Be concise, professional, and tech-savvy.
- FORMATTING (STRICT): Reply in clean PLAIN TEXT only. NEVER use Markdown formatting symbols (such as **, *, #, \`, ~, or >) and NEVER use emojis, icons, or decorative symbols.
- LANGUAGE ADAPTATION: You MUST always detect and respond in the EXACT SAME LANGUAGE as the user's prompt or preferred language (e.g. if the user writes in Chinese / Mandarin, reply in fluent, natural Simplified Chinese; if in Indonesian, reply in Bahasa Indonesia; if in English, reply in English).
`;

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5MB decoded

function cleanModelId(raw?: string): string {
  return (raw ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^models\//i, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function extractGoogleError(rawText: string): string {
  try {
    const parsed = JSON.parse(rawText) as { error?: { message?: string } | Array<{ error?: { message?: string } }> };
    if (Array.isArray(parsed)) return parsed[0]?.error?.message ?? '';
    return (parsed.error as { message?: string } | undefined)?.message ?? '';
  } catch {
    return rawText.slice(0, 160);
  }
}

function scoreModel(id: string): number {
  if (id === 'gemini-3.5-flash-lite') return 1000;
  if (id === 'gemini-flash-lite-latest') return 950;
  const verMatch = id.match(/gemini-(\d+(?:\.\d+)?)/);
  const ver = verMatch ? parseFloat(verMatch[1]) : id.includes('latest') ? 3.5 : 1.0;
  let score = ver * 100;
  if (/flash/i.test(id)) score += 30;
  if (/lite/i.test(id) && ver >= 3) score += 25;
  if (!/exp|001|002|8b|customtools|preview/i.test(id)) score += 15;
  if (/latest$/i.test(id)) score += 20;
  return score;
}

app.post('/v1/ai/generate', async (c) => {
  const origin = c.req.header('origin');
  if (origin) {
    try {
      const { hostname } = new URL(origin);
      const isAllowedHost =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.pages.dev') ||
        hostname === 'andrisetiyanto.my.id' ||
        hostname.endsWith('.andrisetiyanto.my.id') ||
        hostname === 'fiqtor.com' ||
        hostname.endsWith('.fiqtor.com');
      if (!isAllowedHost) {
        return c.json({ status: 'failed', text: 'Cross-origin request rejected' }, 403);
      }
    } catch {
      return c.json({ status: 'failed', text: 'Invalid Origin' }, 403);
    }
  }

  const env = c.env;
  let body: Record<string, unknown> = {};
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ status: 'failed', text: 'Invalid JSON request' }, 400);
  }

  let { input, history = [], file, lang } = body as {
    input?: string;
    history?: Array<{ role?: string; parts?: Array<{ text?: string } | string> }>;
    file?: { data?: string; mimeType?: string };
    lang?: string;
  };
  input = typeof input === 'string' ? input.trim().substring(0, 1200) : '';

  if (!input && !file) {
    return c.json({ status: 'failed', text: 'Input or file is required.' }, 400);
  }

  const tokens = input ? tokenize(input) : [];

  // Check navigation intent
  if (input && isNavigationIntent(input.toLowerCase(), tokens)) {
    for (const [path, keywords] of Object.entries(REDIRECT_MAP)) {
      if (tokens.some((t) => keywords.includes(t))) {
        return new Response(`data: ${JSON.stringify({ type: 'redirectLocal', url: path })}\n\ndata: [DONE]\n\n`, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
          },
        });
      }
    }

    for (const [url, keywords] of Object.entries(SOCIAL_MAP)) {
      if (tokens.some((t) => keywords.includes(t))) {
        return new Response(
          `data: ${JSON.stringify({ type: 'redirect', platform: url, text: `Opening ${url}...` })}\n\ndata: [DONE]\n\n`,
          {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
            },
          },
        );
      }
    }
  }

  const apiKey = env.GEMINI_API_KEY?.trim().replace(/^['"]|['"]$/g, '');
  if (!apiKey) {
    return new Response(
      `data: ${JSON.stringify({ status: 'failed', text: 'AI key not configured on server.' })}\n\ndata: [DONE]\n\n`,
      {
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      },
    );
  }

  const configuredModel = cleanModelId(env.AI_MODEL_PRIMARY);
  const primaryModel =
    /^[a-z0-9][a-z0-9._-]*$/.test(configuredModel) && configuredModel !== 'gemini-2.5-flash-lite'
      ? configuredModel
      : 'gemini-3.5-flash-lite';

  // Construct Gemini REST contents
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }],
    },
    {
      role: 'model',
      parts: [{ text: `Understood. I am the AI assistant for ${BRAND_NAME}'s personal website.` }],
    },
  ];

  if (lang) {
    contents.push(
      {
        role: 'user',
        parts: [
          {
            text: `[System note: The visitor's current website language is '${lang}'. Respond in ${
              lang === 'zh' ? 'Simplified Chinese (简体中文)' : lang === 'id' ? 'Bahasa Indonesia' : 'English'
            }.]`,
          },
        ],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood, I will match this language preference.' }],
      },
    );
  }

  if (Array.isArray(history)) {
    for (const h of history.slice(-10)) {
      if (h && h.role && h.parts && Array.isArray(h.parts)) {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: h.parts.map((p) => (typeof p === 'string' ? { text: p } : (p as Record<string, unknown>))),
        });
      }
    }
  }

  const userParts: Array<Record<string, unknown>> = [];
  if (file && typeof file.data === 'string' && typeof file.mimeType === 'string') {
    const mime = file.mimeType.toLowerCase();
    if (ALLOWED_MIME_TYPES.has(mime) && file.data.length <= MAX_BASE64_LENGTH) {
      userParts.push({
        inlineData: {
          data: file.data,
          mimeType: mime,
        },
      });
    }
  }
  if (input) {
    userParts.push({ text: input });
  }

  contents.push({ role: 'user', parts: userParts });

  const callGeminiStream = (targetModel: string) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(12000),
      },
    );

  try {
    let upstreamRes = await callGeminiStream(primaryModel);
    let lastStatus = upstreamRes.status;
    let lastErrorMsg = '';

    if (!upstreamRes.ok) {
      // Always consume failed response body so Cloudflare workerd never stalls subsequent fetches
      const errRaw = await upstreamRes.text().catch(() => '');
      lastErrorMsg = extractGoogleError(errRaw);
      console.warn(`[AI] model=${primaryModel} status=${lastStatus} error=${lastErrorMsg}`);

      if (lastStatus === 404 || lastStatus === 400 || lastStatus === 429 || lastStatus === 503) {
        let fallbackCandidates: string[] = [
          'gemini-3.5-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-3.5-flash',
          'gemini-flash-latest',
        ].filter((m) => m !== primaryModel);
        try {
          const listRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
            { signal: AbortSignal.timeout(6000) },
          );
          if (listRes.ok) {
            const listJson = (await listRes.json()) as {
              models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
            };
            const discovered = (listJson.models ?? [])
              .filter(
                (m) =>
                  m.name &&
                  m.supportedGenerationMethods?.includes('generateContent') &&
                  !/embedding|imagen|veo|aqa|tts|audio|image|robotics|computer-use|learnlm|gemma/i.test(m.name),
              )
              .map((m) => m.name!.replace(/^models\//, ''))
              .filter((m) => m !== primaryModel)
              .toSorted((a, b) => scoreModel(b) - scoreModel(a));
            if (discovered.length > 0) {
              fallbackCandidates = Array.from(new Set([...discovered.slice(0, 4), ...fallbackCandidates])).slice(0, 4);
            }
          } else {
            const listErr = await listRes.text().catch(() => '');
            console.warn(`[AI] models.list status=${listRes.status} error=${extractGoogleError(listErr)}`);
          }
        } catch {
          // Use default fallbackCandidates if discovery fails
        }

        for (const candidate of fallbackCandidates) {
          upstreamRes = await callGeminiStream(candidate);
          lastStatus = upstreamRes.status;
          if (upstreamRes.ok && upstreamRes.body) {
            console.info(`[AI] succeeded with fallback model=${candidate}`);
            break;
          }
          const fbErr = await upstreamRes.text().catch(() => '');
          lastErrorMsg = extractGoogleError(fbErr) || lastErrorMsg;
          console.warn(`[AI] fallback model=${candidate} status=${lastStatus} error=${lastErrorMsg}`);
          if (lastStatus !== 404 && lastStatus !== 400 && lastStatus !== 429 && lastStatus !== 503) break;
        }
      }
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      if (lastStatus === 429) {
        return c.json({ status: 'failed', error: 'Rate limit reached' }, 429);
      }
      const detail = lastErrorMsg ? ` (${lastErrorMsg})` : '';
      return new Response(
        `data: ${JSON.stringify({ status: 'failed', text: `AI service unavailable: ${lastStatus}${detail}` })}\n\ndata: [DONE]\n\n`,
        { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstreamRes.body.getReader();
    let buffer = '';

    const extractAndEnqueue = (line: string, controller: ReadableStreamDefaultController<Uint8Array>) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) return;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') return;
      try {
        const parsed = JSON.parse(jsonStr);
        const parts = parsed?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part && !part.thought && typeof part.text === 'string' && part.text) {
              const cleanText = part.text.replace(/\*\*|__|`/g, '').replace(/^#{1,6}\s+/gm, '');
              if (cleanText) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: cleanText })}\n\n`));
              }
            }
          }
        }
      } catch {
        // Ignore malformed SSE JSON chunk
      }
    };

    const readable = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              for (const line of buffer.split(/\r?\n/)) {
                extractAndEnqueue(line, controller);
              }
              buffer = '';
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            extractAndEnqueue(line, controller);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'failed', text: message })}\n\ndata: [DONE]\n\n`));
          controller.close();
        }
      },
      cancel() {
        void reader.cancel();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return new Response(
      `data: ${JSON.stringify({ status: 'failed', text: message })}\n\ndata: [DONE]\n\n`,
      { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } },
    );
  }
});

// --- GitHub Contributions ---
app.get('/v1/github/contributions', async (c) => {
  const env = c.env;
  const username = env.GITHUB_USERNAME || GITHUB_USERNAME;
  const token = env.GITHUB_TOKEN;

  if (!token) {
    return c.json({ status: 'error', message: 'GITHUB_TOKEN not configured' }, 500);
  }

  const query = `query {
    user(login: "${username}") {
      contributionsCollection {
        contributionCalendar {
          colors
          totalContributions
          months { firstDay name totalWeeks }
          weeks {
            contributionDays { color contributionCount date }
            firstDay
          }
        }
      }
    }
  }`;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'fiqtor-portfolio-api',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    const data = (await res.json()) as { data?: unknown; errors?: Array<{ message: string }> };
    if (data.errors && data.errors.length > 0) throw new Error(data.errors[0].message);

    return c.json(data.data, 200, {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ status: 'error', message }, 500);
  }
});

// --- WakaTime Stats ---
app.get('/v1/wakatime', async (c) => {
  const env = c.env;
  const apiKey = env.WAKATIME_APP_SECRET?.trim().replace(/^['"]|['"]$/g, '');
  let upstreamStatus = 0;

  // 1. Prefer authenticated current-user API when WAKATIME_APP_SECRET is configured
  if (apiKey) {
    const authHeader =
      apiKey.startsWith('Basic ') || apiKey.startsWith('Bearer ')
        ? apiKey
        : apiKey.startsWith('waka_tok_')
        ? `Bearer ${apiKey}`
        : `Basic ${btoa(apiKey)}`;

    try {
      const res = await fetch(
        `https://wakatime.com/api/v1/users/current/all_time_since_today?api_key=${encodeURIComponent(apiKey)}`,
        {
          headers: { Authorization: authHeader, 'User-Agent': 'PersonalWebsite/1.0' },
        },
      );
      upstreamStatus = res.status;

      if (res.ok) {
        const json = (await res.json()) as {
          data?: { text?: string; range?: { start_text?: string } };
        };
        if (json.data?.text) {
          return c.json(
            {
              status: 200,
              message: 'Success',
              source: 'live',
              data: json.data,
            },
            200,
            {
              'Cache-Control': 'public, max-age=300, s-maxage=300',
            },
          );
        }
      }
    } catch {
      // Fall back to public profile stats below
    }
  }

  // 2. Fall back to public profile stats if available
  const candidateUsers = Array.from(
    new Set([WAKATIME_USERNAME, GITHUB_USERNAME, WAKATIME_USERNAME.toLowerCase().replace(/\s+/g, '')].filter(Boolean)),
  );
  for (const user of candidateUsers) {
    try {
      const pubRes = await fetch(`https://wakatime.com/api/v1/users/${encodeURIComponent(user)}/stats`, {
        headers: { 'User-Agent': 'PersonalWebsite/1.0' },
      });
      if (pubRes.ok) {
        const pubJson = (await pubRes.json()) as {
          data?: {
            human_readable_total?: string;
            human_readable_range?: string;
          };
        };
        if (pubJson.data?.human_readable_total) {
          return c.json(
            {
              status: 200,
              message: 'Success',
              source: 'public_profile',
              data: {
                text: pubJson.data.human_readable_total,
                range: {
                  start_text: pubJson.data.human_readable_range?.replace(/^since\s+/i, '') ?? '',
                },
              },
            },
            200,
            {
              'Cache-Control': 'public, max-age=1800, s-maxage=1800',
            },
          );
        }
      }
    } catch {
      // Try next candidate
    }
  }

  return c.json(
    {
      status: 200,
      source: 'unavailable',
      upstreamStatus,
      message:
        upstreamStatus === 401 || upstreamStatus === 403
          ? 'WakaTime key rejected (use Personal Secret API Key from https://wakatime.com/settings/api-key, not an OAuth App Secret)'
          : 'WakaTime stats unavailable',
      data: null,
    },
    200,
  );
});

// --- Crypto Prices ---
import cryptoConfig from './config/crypto';

const toRatio = (pct: unknown) => (typeof pct === 'number' ? 1 + pct / 100 : 1);

app.get('/v1/crypto', async (c) => {
  const env = c.env;
  const apiKey = env.COINGECKO_API_KEY;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=false&price_change_percentage=24h,30d',
      { headers },
    );

    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
    const markets = (await res.json()) as Array<{
      id: string;
      current_price: number;
      price_change_percentage_30d_in_currency?: number;
      price_change_percentage_30d?: number;
      price_change_percentage_24h_in_currency?: number;
      price_change_percentage_24h?: number;
    }>;

    if (!Array.isArray(markets)) throw new Error('Malformed data');

    const byId = new Map(markets.map((m) => [m.id, m]));
    const btc = byId.get('bitcoin');
    const eth = byId.get('ethereum');
    const sol = byId.get('solana');

    if (!btc?.current_price || !eth?.current_price || !sol?.current_price) {
      throw new Error('Incomplete coin prices');
    }

    const payload = {
      btc: {
        code: 'BTC',
        rate: Number(btc.current_price),
        delta: {
          month: toRatio(btc.price_change_percentage_30d_in_currency ?? btc.price_change_percentage_30d),
          day: toRatio(btc.price_change_percentage_24h_in_currency ?? btc.price_change_percentage_24h),
        },
      },
      eth: {
        code: 'ETH',
        rate: Number(eth.current_price),
        delta: {
          month: toRatio(eth.price_change_percentage_30d_in_currency ?? eth.price_change_percentage_30d),
          day: toRatio(eth.price_change_percentage_24h_in_currency ?? eth.price_change_percentage_24h),
        },
      },
      sol: {
        code: 'SOL',
        rate: Number(sol.current_price),
        delta: {
          month: toRatio(sol.price_change_percentage_30d_in_currency ?? sol.price_change_percentage_30d),
          day: toRatio(sol.price_change_percentage_24h_in_currency ?? sol.price_change_percentage_24h),
        },
      },
    };

    return c.json(
      {
        status: 'success',
        source: 'live',
        data: payload,
      },
      200,
      {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    );
  } catch {
    return c.json(
      {
        status: 'success',
        source: 'static',
        data: cryptoConfig,
      },
      200,
    );
  }
});

// --- Social Stats ---
import socialConfig from './config/social';

app.get('/v1/social/stats', (c) => {
  return c.json(
    {
      success: true,
      source: 'default',
      data: {
        tiktok: socialConfig.tiktok,
        instagram: socialConfig.instagram,
        lastUpdated: new Date().toISOString(),
      },
    },
    200,
    {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  );
});

export const onRequest = handle(app);
export default app;
