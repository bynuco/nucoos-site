// Motion layer for the promo site. The pages work fully without it.
(() => {
  const io = 'IntersectionObserver' in window;
  const reveal = (els) => {
    if (!io) return els.forEach((e) => e.classList.add('in'));
    const ob = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); ob.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => ob.observe(e));
  };
  reveal([...document.querySelectorAll('.rv')]);

  // ---- a game's share link (/games/<id>/?s=<source>, studio/core/growth.gd): every store button carries the source and
  // a phone goes straight to its own store, so tools/metrics can count installs per source (Play: utm_* in the install
  // referrer; App Store: ct campaign) ----
  const src = (new URLSearchParams(location.search).get('s') || '').replace(/[^\w-]/g, '').slice(0, 30);
  // only a game's own page (the home page lists several games' buttons), and never for crawlers (a search bot with a
  // phone user agent would be sent away from the page it came to index; independent review 2026-11-24)
  const gamePage = document.documentElement.classList.contains('game');
  if (src && gamePage && !/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent)) {
    for (const a of document.querySelectorAll('[data-store=android]')) {
      const u = new URL(a.href);
      u.searchParams.set('referrer', `utm_source=${src}&utm_medium=game&utm_campaign=${a.dataset.game || ''}`);
      a.href = u.toString();
    }
    for (const a of document.querySelectorAll('[data-store=ios]')) {
      const u = new URL(a.href);
      if (a.dataset.pt) u.searchParams.set('pt', a.dataset.pt);
      u.searchParams.set('ct', src);
      u.searchParams.set('mt', '8');
      a.href = u.toString();
    }
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const go = document.querySelector(/Android/.test(ua) ? '[data-store=android]' : ios ? '[data-store=ios]' : 'none');
    if (go) location.replace(go.href);
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---- hero parallax: pointer, device tilt, scroll and a slow idle drift ----
  const hero = document.querySelector('[data-parallax]');
  if (hero) {
    let tx = 0, ty = 0, x = 0, y = 0, input = 0, visible = true;
    const set = (nx, ny) => { tx = Math.max(-1, Math.min(1, nx)); ty = Math.max(-1, Math.min(1, ny)); input = performance.now(); };
    addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') set(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); }, { passive: true });
    addEventListener('deviceorientation', (e) => { if (e.gamma != null) set(e.gamma / 25, (e.beta - 45) / 25); }, { passive: true });
    if (io) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(hero);
    const tick = (now) => {
      if (!visible) return;
      if (now - input > 2500) { tx = Math.sin(now / 3200) * 0.45; ty = Math.cos(now / 4100) * 0.3; }
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      hero.style.setProperty('--px', x.toFixed(4));
      hero.style.setProperty('--py', y.toFixed(4));
      hero.style.setProperty('--sy', Math.min(scrollY, innerHeight).toFixed(1));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // ---- floating light motes (embers in the game's accent colour) ----
    const cv = hero.querySelector('.motes');
    const ctx = cv && cv.getContext('2d');
    if (ctx) {
      const css = getComputedStyle(hero);
      const cols = [css.getPropertyValue('--accent').trim() || '#ffb347', css.getPropertyValue('--brand').trim() || '#3fd8cc'];
      const sprite = cols.map((c) => {
        const s = document.createElement('canvas'); s.width = s.height = 64;
        const g = s.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        r.addColorStop(0, '#fff'); r.addColorStop(0.18, c); r.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = r; g.fillRect(0, 0, 64, 64); return s;
      });
      let W, H, dpr, parts = [];
      const spawn = (p, any) => Object.assign(p, {
        x: Math.random() * W, y: any ? Math.random() * H : H + 20, z: 0.3 + Math.random() * 0.9,
        s: 4 + Math.random() * 10, v: 0.15 + Math.random() * 0.5, ph: Math.random() * 6.28, c: Math.random() < 0.75 ? 0 : 1,
      });
      const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, 1.5);
        W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
        const n = Math.round(Math.min(70, W * H / 16000));
        parts = Array.from({ length: n }, () => spawn({}, true));
      };
      resize(); addEventListener('resize', resize);
      const draw = (now) => {
        if (!visible || document.hidden) return requestAnimationFrame(draw);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        for (const p of parts) {
          p.y -= p.v * p.z; p.x += Math.sin(now / 1400 + p.ph) * 0.25 * p.z;
          if (p.y < -20) spawn(p, false);
          const fl = 0.55 + 0.45 * Math.sin(now / 300 + p.ph * 3);
          const sz = p.s * p.z;
          ctx.globalAlpha = fl * Math.min(1, (H - p.y) / 200) * 0.9;
          ctx.drawImage(sprite[p.c], p.x - x * 30 * p.z - sz, p.y - y * 20 * p.z - sz, sz * 2, sz * 2);
        }
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    }
  }

  // ---- 3D tilt + glare on game cards ----
  for (const el of document.querySelectorAll('[data-tilt]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
      el.classList.add('tilting');
      el.style.setProperty('--ry', `${(u - 0.5) * 16}deg`);
      el.style.setProperty('--rx', `${(0.5 - v) * 12}deg`);
      el.style.setProperty('--gx', `${u * 100}%`);
      el.style.setProperty('--gy', `${v * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }
})();
