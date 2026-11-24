# Frontend Architecture

- **Entry**: `src/main.tsx` mounts React app with `react-router-dom` and `react-helmet-async`.
- **Pages**:
  - `Home.tsx` (`/`)
  - `Projects.tsx` (`/projects`) & `ProjectDetail.tsx` (`/projects/:id`)
  - `Career.tsx` (`/career`)
  - `Certificates.tsx` (`/certificates`)
  - `Contact.tsx` (`/contact`) - Direct WhatsApp dispatch.
  - `NotFound.tsx` - Custom `Upclose404` animated component.
  - `MaintenancePage.tsx` (`/maintenance`).
- **Maintenance Mode**:
  - Configured in `src/maintenance/config.ts`.
  - Toggle via `MAINTENANCE_CONFIG.enabled` (`true`/`false`) or environment variable `VITE_MAINTENANCE_MODE`.
  - Countdown component: `src/maintenance/VaporCountdown.tsx`.
  - In `src/main.tsx`, when `isMaintenanceActive()` is true, all routes render `<MaintenancePage />`.
- **Identity & Branding**: `src/config/Identity.ts` is the single source of truth for name, brand (`ANDRI.`), company (`GGStore.Id`), contacts, phone/WhatsApp (`+6287713349338`), and social links.
- **SEO & Prerendering**: `src/config/Seo.ts` and `vite.config.ts` prerender HTML route shells into `dist/` with valid `<meta>` and JSON-LD structured data.
