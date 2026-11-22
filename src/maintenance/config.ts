/**
 * Central control panel for Maintenance Mode.
 *
 * To toggle maintenance mode via code:
 *   1. Set `enabled: true` (or `false` to restore the live portfolio).
 *   2. Set `targetDate` to any ISO date/time (supports multi-year countdowns).
 *
 * You can also override via build-time env vars in `.env` / Cloudflare Pages:
 *   VITE_MAINTENANCE_MODE=true
 *   VITE_MAINTENANCE_UNTIL=2028-01-01T00:00:00+07:00
 */

export interface MaintenanceConfig {
  /** Master switch — true puts the entire site into maintenance mode. */
  enabled: boolean;
  /** Target completion timestamp (ISO string, Date, or epoch ms). */
  targetDate: string;
  /** Localized eyebrow badge text. */
  badge: { en: string; id: string; zh: string };
  /** Localized headline. */
  title: { en: string; id: string; zh: string };
  /** Localized description below the headline. */
  message: { en: string; id: string; zh: string };
}

export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: true, /** Untuk aktif/nonaktifkan maintenance */
  targetDate: '2028-01-01T00:00:00+07:00',
  badge: {
    en: 'Scheduled Maintenance',
    id: 'Pemeliharaan Terjadwal',
    zh: '系统维护升级中',
  },
  title: {
    en: 'Upgrading systems for what comes next.',
    id: 'Sedang meningkatkan sistem untuk pembaruan berikutnya.',
    zh: '正在全面升级架构与服务体验。',
  },
  message: {
    en: 'The site is temporarily offline while core infrastructure and features are being rebuilt. Check the live countdown below or reach out directly anytime.',
    id: 'Website sedang dalam proses pemeliharaan dan pembaruan sistem. Pantau hitungan mundur di bawah atau hubungi langsung kapan saja.',
    zh: '网站核心系统与功能正在维护升级中。请查看下方实时倒计时，或随时通过以下方式直接联系我。',
  },
};

export function isMaintenanceActive(): boolean {
  const envFlag = String(import.meta.env.VITE_MAINTENANCE_MODE ?? '')
    .trim()
    .toLowerCase();
  if (envFlag === 'true' || envFlag === '1' || envFlag === 'on') return true;
  if (envFlag === 'false' || envFlag === '0' || envFlag === 'off') return false;
  return MAINTENANCE_CONFIG.enabled;
}

export function getMaintenanceTargetDate(): string {
  const envUntil = String(import.meta.env.VITE_MAINTENANCE_UNTIL ?? '').trim();
  return envUntil || MAINTENANCE_CONFIG.targetDate;
}
