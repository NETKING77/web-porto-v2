# Suggested Commands

Developed on Windows (PowerShell / cmd).

## Project Commands
- Start dev server: `npm run dev`
- Build frontend & prerender route shells: `npm run build` (`tsc -b && vite build`)
- Typecheck without emit: `npm run typecheck` (`tsc -b --noEmit`)
- Run linter: `npm run lint` (`oxlint`)
- Preview build locally: `npm run preview`
- Preview with Cloudflare Pages Functions & local `.dev.vars`: `npm run preview:cf` (`wrangler pages dev ./dist`)
- Deploy build output to Cloudflare Pages: `npm run deploy` (`wrangler pages deploy ./dist`)

## Windows Shell Conventions
- In PowerShell, chain commands with `;` and check `$LASTEXITCODE`, or use standard PowerShell control flow.
- To inspect files, use `Select-String` (PowerShell equivalent to `grep`).
