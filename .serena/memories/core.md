# Core Architecture & Source Map

Single repository personal portfolio with unified frontend and Cloudflare Pages backend.

## Structure
- `src/`: React 19 SPA frontend (Vite, TypeScript, Tailwind v4).
- `functions/`: Cloudflare Pages Functions backend powered by Hono (`functions/api/[[route]].ts`).
- `public/`: Static assets (`favicon.ico`, `icon.webp`, `og-image.png`, `robots.txt`, etc.).
- `scripts/`: Verification and build scripts.
- `.github/workflows/ci.yml`: GitHub Actions CI pipeline running typecheck, lint, and build on push.

## Critical Invariants
- `SITE_ORIGIN`: Set in `src/config/Identity.ts`, canonical `https://andrisetiyanto.my.id`.
- Backend routes are mounted at `/api/*` on the same domain without CORS friction.
- AI Assistant Origin Whitelist: Hostnames must be allowed in `functions/api/[[route]].ts` (`isAllowedHost`).
- User preference: NEVER delete or alter unrelated existing code (`#JANGAN MENGHAPUS KODE YANG TIDAK SAYA MINTA`).

## Sub-domain Memories
- For tech stack details and dependencies: `mem:tech_stack`
- For developer commands and Windows shell details: `mem:suggested_commands`
- For coding style, safety rules, and project patterns: `mem:conventions`
- For definition of done and verification commands: `mem:task_completion`
- For frontend architecture, routes, and maintenance mode: `mem:frontend/core`
- For backend Hono routes and API integrations: `mem:backend/core`
- For Cloudflare Pages deployment, DNS, and environment secrets: `mem:deployment`
