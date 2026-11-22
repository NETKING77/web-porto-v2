import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { isReducedMotion } from '../lib/utils';

/**
 * Upclose404 — standalone 404 page inspired by
 * https://404s.design/sites/upclose (upclose.studio/404).
 *
 * Mounted outside <Layout /> so no Navbar, Footer, AI chat widget, or other
 * page chrome is rendered — only the infinite fractal-zooming 404 SVG and
 * the minimal UPCLOSE typography over the existing canvas background.
 */
const SVG_W = 3020;
const SVG_H = 1167;
const CX = SVG_W / 2;
const CY = SVG_H / 2;

const ERROR_404_PATH =
  'M7278.631,336.284L7278.631,967.943L7423.163,967.943L7423.163,1223.105L7278.631,1223.105L7278.631,1460.423L6980.645,1460.423L6980.645,1223.105L6431.066,1223.105L6431.066,946.531L6914.624,336.284L7278.631,336.284ZM6980.645,600.368L6689.796,967.943L6980.645,967.943L6980.645,600.368ZM8454.516,898.354C8454.516,1083.926 8408.123,1228.458 8315.337,1330.166C8222.551,1431.874 8099.431,1481.835 7945.977,1481.835C7794.308,1481.835 7671.188,1431.874 7576.617,1330.166C7483.831,1228.458 7437.438,1083.926 7437.438,898.354C7437.438,712.782 7483.831,570.034 7576.617,468.326C7671.188,366.618 7794.308,314.872 7945.977,314.872C8099.431,314.872 8222.551,366.618 8315.337,468.326C8408.123,570.034 8454.516,712.782 8454.516,898.354ZM8135.118,898.354C8135.118,668.173 8081.588,559.328 7945.977,559.328C7810.367,559.328 7758.621,668.173 7758.621,898.354C7758.621,1128.535 7810.367,1237.38 7945.977,1237.38C8081.588,1237.38 8135.118,1128.535 8135.118,898.354ZM9305.65,336.284L9305.65,967.943L9450.182,967.943L9450.182,1223.105L9305.65,1223.105L9305.65,1460.423L9007.664,1460.423L9007.664,1223.105L8458.085,1223.105L8458.085,946.531L8941.643,336.284L9305.65,336.284ZM9007.664,600.368L8716.815,967.943L9007.664,967.943L9007.664,600.368Z';

function applyLayer(el: SVGUseElement | null, progress: number, layerIndex: number) {
  if (!el) return;
  const r = progress - layerIndex * 3;
  const scale = 2 ** (r - 3);
  const fadeIn = Math.min(r, 1);
  const fadeOut = Math.min(Math.max(4.5 - r, 0), 1);
  const opacity = Math.max(0, Math.min(fadeIn, fadeOut));
  el.setAttribute('transform', `translate(${CX} ${CY}) scale(${scale}) translate(${-CX} ${-CY})`);
  el.setAttribute('opacity', String(opacity));
}

export function Upclose404() {
  const use0Ref = useRef<SVGUseElement>(null);
  const use1Ref = useRef<SVGUseElement>(null);

  useEffect(() => {
    // Ensure loader lock classes are cleared if user lands directly on a 404 URL
    document.documentElement.classList.remove('ld');
    document.body.classList.remove('nosc');

    let progress = 3;
    let velocity = 0;
    let impulse = 0;
    let lastTouchY: number | undefined;
    let rafId = 0;
    let lastTime = performance.now();

    const addImpulse = (delta: number) => {
      impulse = Math.min(Math.max(impulse + delta * 0.004, -4), 4);
    };

    const onWheel = (e: WheelEvent) => {
      const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      addImpulse(e.deltaY * mult);
    };

    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y !== undefined && lastTouchY !== undefined) {
        addImpulse((lastTouchY - y) * 2);
        lastTouchY = y;
      }
    };

    const updateDom = () => {
      const n = Math.floor(progress / 3);
      applyLayer(use0Ref.current, progress, n - 1);
      applyLayer(use1Ref.current, progress, n);
    };

    updateDom();

    const tick = (now: number) => {
      const dt = Math.min(now - lastTime, 50) / 1000;
      lastTime = now;
      const baseDrift = isReducedMotion() ? 0 : 0.04;
      impulse *= Math.exp(-dt / 0.3);
      velocity += (baseDrift + impulse - velocity) * (1 - Math.exp(-dt / 0.25));
      progress += velocity * dt;
      updateDom();
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div className="upclose-404-stage">
      <main className="upclose-404-main">
        <p className="upclose-404-mini">UPS! TERLALU DEKAT</p>
        <h1 className="upclose-404-title">Halaman ini tidak ditemukan.</h1>
        <Link to="/" className="upclose-404-back">
          ← Kembali ke beranda
        </Link>
      </main>

      <svg
        className="upclose-404"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ fillRule: 'evenodd', clipRule: 'evenodd', strokeLinejoin: 'round', strokeMiterlimit: 2 }}
      >
        <defs>
          <g id="upcloseErrorCode">
            <g transform="matrix(1,0,0,1,-6430.558279,-314.872144)">
              <g transform="matrix(1,0,0,1,-0.507814,0)">
                <path d={ERROR_404_PATH} className="upclose-404-path" />
              </g>
            </g>
          </g>
        </defs>
        <use ref={use0Ref} href="#upcloseErrorCode" />
        <use ref={use1Ref} href="#upcloseErrorCode" />
      </svg>
    </div>
  );
}

export default Upclose404;
