/* ═══════════════════════════════════════
   CONSTRUCTION PRO — ScrollCanvas Engine (Native Scroll)
   ═══════════════════════════════════════ */
'use strict';

/* ── Constants ──────────────────────────── */
const TOTAL_FRAMES = 576;
const PAGE_COUNT = 6;
const LERP = 0.02;
const CONCURRENCY = 48;

/* ── State ──────────────────────────────── */
let currentFrame = 0;
let targetFrame = 0;
let images = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isReady = false;
let preloaderDismissed = false;
const PRELOADER_THRESHOLD = 15;
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;

/* ── DOM refs ───────────────────────────── */
const canvas = document.getElementById('scrollCanvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const loaderFill = document.getElementById('loaderFill');
const loaderPct = document.getElementById('loaderPct');
const pages = Array.from(document.querySelectorAll('.page'));
const navLinks = document.querySelectorAll('.nav-link');
const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobileNav');

/* ── Canvas sizing ──────────────────────── */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (isReady) drawFrame(Math.round(currentFrame));
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ── Frame path ─────────────────────────── */
function framePath(i) {
  const dir = isMobile ? 'frames-mobile' : 'frames-webp';
  const num = String(i).padStart(6, '0');
  return `${dir}/frame_${num}.webp`;
}

/* ── Preload frames ─────────────────────── */
let failCount = 0;
function preloadFrames() {
  let idx = 0;
  let active = 0;

  const fallbackTimer = setTimeout(() => {
    if (loadedCount === 0 || failCount >= CONCURRENCY) finishLoading();
  }, 3000);

  function next() {
    while (active < CONCURRENCY && idx < TOTAL_FRAMES) {
      const i = idx++;
      active++;
      const img = new Image();
      img.onload = () => { images[i] = img; active--; loadedCount++; progress(); next(); };
      img.onerror = () => { active--; failCount++; loadedCount++; progress(); next(); };
      img.src = framePath(i + 1);
    }
  }

  function progress() {
    const realPct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
    if (!preloaderDismissed) {
      const visualPct = Math.min(Math.round((realPct / PRELOADER_THRESHOLD) * 100), 100);
      if (loaderFill) loaderFill.style.width = visualPct + '%';
      if (loaderPct) loaderPct.textContent = visualPct + '%';
      if (!isReady && loadedCount === 1) { isReady = true; drawFrame(0); }
      if (realPct >= PRELOADER_THRESHOLD) {
        preloaderDismissed = true; clearTimeout(fallbackTimer); finishLoading();
        const slb = document.getElementById('siteLoadingBar');
        setTimeout(() => { if(slb) slb.style.opacity='1';slb.style.visibility='visible'; }, 600);
      }
    } else {
      const fill = document.getElementById('siteLoadingFillInner');
      const txt = document.getElementById('siteLoadingText');
      const phase2Pct = Math.round(((realPct - PRELOADER_THRESHOLD) / (100 - PRELOADER_THRESHOLD)) * 100);
      if (fill) fill.style.width = phase2Pct + '%';
      if (txt) txt.textContent = 'Loading video ' + realPct + '%';
      if (loadedCount >= TOTAL_FRAMES) {
        const sbar = document.getElementById('siteLoadingBar');
        if (txt) txt.textContent = 'Loading complete';
        setTimeout(() => { if(sbar) { sbar.style.opacity='0';setTimeout(function(){if(sbar)sbar.remove()},600); } }, 800);
      }
    }
  }

  next();
}

function finishLoading() {
  isReady = true;
  loader.style.transition='opacity 0.7s';loader.style.opacity='0';setTimeout(function(){loader.style.display='none'},700);
  const slb = document.getElementById('siteLoadingBar');
  const slbTxt = document.getElementById('siteLoadingText');
  if (slbTxt) slbTxt.textContent = 'Loading complete';
  setTimeout(() => { if(slb) { slb.style.opacity='0';setTimeout(function(){if(slb)slb.remove()},600); } }, 800);
  // First page is-active
  if (pages[0]) pages[0].classList.add('is-active');
}

/* ── Draw frame ─────────────────────────── */
function drawFrame(frameIdx) {
  const idx = Math.min(Math.max(Math.round(frameIdx), 0), TOTAL_FRAMES - 1);
  const img = images[idx];
  if (!img) return;

  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ── SCROLL → FRAME MAPPING (native) ──── */
window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

/* ── Animation loop ─────────────────────── */
function animate() {
  currentFrame += (targetFrame - currentFrame) * LERP;
  if (isReady) drawFrame(Math.round(currentFrame));
  requestAnimationFrame(animate);
}

/* ── IntersectionObserver — page activation ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      navLinks.forEach(l => {
        const s = parseInt(l.dataset.section);
        l.classList.toggle('active', s === idx);
      });
    }
  });
}, { root: null, rootMargin: '-40% 0px -40% 0px' });

pages.forEach(p => observer.observe(p));

/* ── Nav clicks (scroll to section) ─────── */
document.querySelectorAll('[data-section]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    const s = parseInt(el.dataset.section);
    if (pages[s]) pages[s].scrollIntoView({ behavior: 'smooth' });
    if (mobileNav) { mobileNav.classList.remove('open'); }
    if (burger) { burger.classList.remove('open'); }
  });
});

/* ── Burger ──────────────────────────────── */
if (burger) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    if (mobileNav) mobileNav.classList.toggle('open');
  });
}

/* ── Init ────────────────────────────────── */
preloadFrames();
requestAnimationFrame(animate);

/* ── Form submit ─────────────────────────── */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.textContent = '✓ Request submitted!';
    btn.style.background = '#4ECDC4';
    setTimeout(() => { btn.textContent = 'Order Website'; btn.style.background = ''; }, 3000);
  });
}


// Site loading bar CSS (Phase 2 - deferred)
const siteBarStyle = document.createElement('style');
siteBarStyle.textContent = '.site-loading-bar{position:fixed;bottom:0;left:0;width:100%;height:28px;background:rgba(10,10,10,.85);backdrop-filter:blur(8px);z-index:9998;display:flex;align-items:center;padding:0 16px;gap:10px;opacity:0;visibility:hidden;transition:opacity .5s,visibility .5s;border-top:1px solid rgba(255,255,255,.08)}.site-loading-bar.active{opacity:1;visibility:visible}.site-loading-bar.done{opacity:0;visibility:hidden}.site-loading-fill{flex:1;height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}.site-loading-fill-inner{height:100%;width:0;background:linear-gradient(90deg,var(--gold,var(--accent,#c9a84c)),var(--gold-light,#e8c97a));border-radius:2px;transition:width .2s}.site-loading-text{font-size:11px;color:rgba(255,255,255,.5);white-space:nowrap}';
document.head.appendChild(siteBarStyle);

// === SITE LOADING BAR (Phase 2 — deferred) ===
(function(){
  if (document.getElementById('siteLoadingBar')) return;
  var el = document.createElement('div');
  el.id = 'siteLoadingBar';
  el.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:32px;background:rgba(10,10,10,.88);backdrop-filter:blur(10px);z-index:9998;display:flex;align-items:center;padding:0 20px;gap:12px;opacity:0;visibility:hidden;transition:opacity .5s,visibility .5s;border-top:1px solid rgba(255,255,255,.08);';
  el.innerHTML = '<div style="flex:1;height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;"><div id="slbFill" style="height:100%;width:0;background:linear-gradient(90deg,var(--gold,var(--accent,#c9a84c)),#e8c97a);border-radius:2px;transition:width .25s;"></div></div><span id="siteLoadingText" style="font-size:11px;color:rgba(255,255,255,.5);white-space:nowrap;">Loading video...</span>';
  document.body.appendChild(el);
})();
