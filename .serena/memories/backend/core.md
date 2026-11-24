# Backend Architecture (Cloudflare Pages Functions)

- **Entry**: `functions/api/[[route]].ts` powered by Hono (`hono/cloudflare-pages`).
- **Middleware**: `functions/_middleware.js` ensures missing static files return a genuine 404 rather than falling back to SPA `index.html`.
- **API Routes**:
  - `POST /api/v1/ai/generate`: Proxies queries to Gemini AI (`gemini-3.5-flash-lite`), includes intent matching, fallback model discovery, and strict origin validation (`isAllowedHost`).
  - `GET /api/v1/github/contributions`: Fetches GitHub contribution calendar via GraphQL API using `GITHUB_TOKEN`.
  - `GET /api/v1/wakatime`: Fetches live coding stats using `WAKATIME_APP_SECRET` with fallback to public profile.
  - `GET /api/v1/crypto`: Fetches live BTC/ETH/SOL rates from CoinGecko with static fallback.
  - `GET /api/v1/social/stats`: Returns social media stats.
