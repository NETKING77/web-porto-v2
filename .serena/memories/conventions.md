# Project Conventions & Safety Rules

## Strict Safety Rules (from AGENTS.md)
1. **No Auto Build/Lint**: NEVER run `npm run build`, `npx tsc`, or `oxlint` unless explicitly instructed by the user.
2. **Strict Exclusions**: NEVER read or scan `node_modules`, `dist`, `build`, `.git`, `.next`, `coverage`, lock files (`package-lock.json`), `.env*`, `.log`, or binary assets.
3. **Targeted Tooling**: Active context max 2-3 files. Drop unneeded files. Use search/grep rather than reading whole directories. Use targeted surgical edits.
4. **Code Quality**: Strict TypeScript typings (no `any` unless strictly needed). Zero residual code: strip unused imports, dead variables, commented-out code, and temporary logs.
5. **Preservation Rule**: NEVER delete code or features unless explicitly requested by the user (`#JANGAN MENGHAPUS KODE YANG TIDAK SAYA MINTA`).

## Code Patterns
- Helper functions inside route handlers or components that do not capture closure variables should be hoisted to module scope (prevents `unicorn(consistent-function-scoping)`).
- Avoid mutating arrays in modern JS/TS; prefer `.toSorted()` over `.sort()`.
- Pure React render: do not call impure `new Date().getFullYear()` directly in JSX rendering; store in `useState(() => new Date().getFullYear())` to satisfy React Compiler purity.
- Contact flow: Form validates and directs to WhatsApp chat (`https://wa.me/...`) directly rather than sending emails via SMTP.
