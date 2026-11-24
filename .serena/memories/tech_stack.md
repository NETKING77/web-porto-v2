# Tech Stack & Dependencies

- **Runtime & Platform**: Node.js v20/v24, Cloudflare Pages & Pages Functions (`@cloudflare/workers-types`).
- **Frontend**: React 19 (`19.2.0`), React DOM, TypeScript (`~5.9.3`), Vite (`^8.3.4`), Tailwind CSS v4, `react-router-dom` (`^7.18.4`), `gsap` (`^3.15.0`), `react-helmet-async` (`^3.0.0`), `qrcode.react`.
- **Backend**: Hono (`^4.13.16`) running on Cloudflare Pages Functions (`hono/cloudflare-pages`).
- **Linter & Type Checker**: `oxlint` (`^1.88.0`), `tsc` (`typescript ~5.9.3` with project references `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.functions.json`).
- **Deployment / CLI**: `wrangler` (`^4.156.0`), GitHub Actions CI.
