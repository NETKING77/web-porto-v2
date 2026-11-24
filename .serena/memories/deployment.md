# Deployment & Infrastructure

- **Platform**: Cloudflare Pages (`web-porto-v2`).
- **Production Domain**: `https://andrisetiyanto.my.id` (with fallback `https://web-porto-v2.pages.dev`).
- **DNS / Nameservers**: Managed on Cloudflare (`dean.ns.cloudflare.com`, `natasha.ns.cloudflare.com`) via registrar DomaiNesia.
- **Wrangler Config**: `wrangler.jsonc` sets `name: "web-porto-v2"`, `pages_build_output_dir: "./dist"`.
- **Cloudflare Secrets**:
  - `GEMINI_API_KEY`: Google Gemini API key.
  - `AI_MODEL_PRIMARY`: Primary Gemini model ID (`gemini-3.5-flash-lite`).
  - `GITHUB_TOKEN`: GitHub personal access token (`read:user`).
  - `GITHUB_USERNAME`: GitHub username (`NETKING77`).
  - `WAKATIME_APP_SECRET`: Personal Secret API Key from WakaTime.
  - `COINGECKO_API_KEY`: CoinGecko API key (optional).
