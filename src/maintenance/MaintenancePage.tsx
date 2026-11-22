import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  BRAND_NAME,
  COMPANY,
  CONTACT_EMAIL,
  WHATSAPP_NUMBER,
  whatsappUrl,
} from '../config/Identity';
import { useLanguage, type Language } from '../lib/catalog';
import { useTheme } from '../lib/theme';
import { Logo } from '../components/Logo';
import { getMaintenanceTargetDate, isMaintenanceActive, MAINTENANCE_CONFIG } from './config';
import { VaporCountdown, type VaporLabels } from './VaporCountdown';
import './maintenance.css';

const COUNTDOWN_LABELS: Record<Language, VaporLabels> = {
  en: ['YEARS', 'DAYS', 'HOURS', 'MINUTES', 'SECONDS'],
  id: ['TAHUN', 'HARI', 'JAM', 'MENIT', 'DETIK'],
  zh: ['年', '天', '时', '分', '秒'],
};

const LANGS: readonly { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'id', label: 'ID' },
  { code: 'zh', label: '中文' },
];

export default function MaintenancePage() {
  const { lang, setLang } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const [paused, setPaused] = useState(false);
  const [year] = useState(() => new Date().getFullYear());

  const targetIso = getMaintenanceTargetDate();
  const globalActive = isMaintenanceActive();

  useEffect(() => {
    document.documentElement.classList.remove('ld');
    document.body.classList.remove('nosc');
  }, []);

  const t = (en: string, id: string, zh: string) =>
    lang === 'zh' ? zh : lang === 'id' ? id : en;

  const formattedTarget = (() => {
    const d = new Date(targetIso);
    if (Number.isNaN(d.getTime())) return targetIso;
    const locale = lang === 'id' ? 'id-ID' : lang === 'zh' ? 'zh-CN' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(d);
  })();

  const waHref = whatsappUrl(
    t(
      `Hi ${BRAND_NAME}, I saw the maintenance page and wanted to get in touch.`,
      `Halo ${BRAND_NAME}, saya melihat halaman maintenance dan ingin menghubungi Anda.`,
      `你好 ${BRAND_NAME}，我看到了维护页面，想直接联系你。`,
    ),
  );

  return (
    <>
      <Helmet>
        <title>{`${t('Maintenance', 'Pemeliharaan', '系统维护')} | ${BRAND_NAME}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mt-page">
        <header className="mt-topbar">
          <div className="mt-brand">
            <Logo size={26} title={BRAND_NAME} />
            <span>{BRAND_NAME}</span>
          </div>

          <div className="mt-controls">
            <div className="lang-sw" role="group" aria-label={t('Language', 'Bahasa', '语言')}>
              {LANGS.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={lang === item.code ? 'on' : undefined}
                  onClick={() => setLang(item.code)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="theme-sw"
              onClick={(e) => toggleTheme(e)}
              aria-label={t('Toggle theme', 'Ganti tema', '切换主题')}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main className="mt-center">
          <div className="mt-badge">
            <i aria-hidden="true" />
            <span>{MAINTENANCE_CONFIG.badge[lang] || MAINTENANCE_CONFIG.badge.en}</span>
          </div>

          <h1 className="mt-title">{MAINTENANCE_CONFIG.title[lang] || MAINTENANCE_CONFIG.title.en}</h1>

          <p className="mt-desc">{MAINTENANCE_CONFIG.message[lang] || MAINTENANCE_CONFIG.message.en}</p>

          <section className="mt-stage" aria-label={t('Maintenance countdown', 'Hitung mundur pemeliharaan', '维护倒计时')}>
            <VaporCountdown
              targetDate={targetIso}
              labels={COUNTDOWN_LABELS[lang] || COUNTDOWN_LABELS.en}
              paused={paused}
            />

            <p className="mt-until">
              {t('Estimated completion:', 'Estimasi selesai:', '预计完成时间：')} {formattedTarget}
            </p>

            <button
              type="button"
              className="mt-motion-btn"
              onClick={() => setPaused((p) => !p)}
            >
              {paused
                ? t('Resume particle motion', 'Lanjutkan animasi partikel', '恢复粒子动效')
                : t('Pause particle motion', 'Jeda animasi partikel', '暂停粒子动效')}
            </button>
          </section>

          <div className="mt-actions">
            <a className="cta" href={waHref} target="_blank" rel="noopener noreferrer">
              {t('Contact via WhatsApp', 'Hubungi lewat WhatsApp', '通过 WhatsApp 联系')}
            </a>
            <a className="btn2" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            {!globalActive && (
              <Link className="btn2" to="/">
                {t('Back to portfolio', 'Kembali ke portofolio', '返回主页')}
              </Link>
            )}
          </div>
        </main>

        <footer className="mt-foot">
          <span>
            © {year} {BRAND_NAME} · {COMPANY.name}
          </span>
          <span>
            WhatsApp{' '}
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              +{WHATSAPP_NUMBER}
            </a>
          </span>
        </footer>
      </div>
    </>
  );
}
