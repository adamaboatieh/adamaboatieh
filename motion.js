(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Hero name: split into letters for the staggered rise */
  let i = 0;
  const letters = [];
  $$('.name .line').forEach(line => {
    const text = line.textContent;
    line.textContent = '';
    for (const c of text) {
      const s = document.createElement('span');
      s.className = 'ch' + (c === '.' ? ' dot' : '');
      s.textContent = c === ' ' ? ' ' : c;
      s.style.setProperty('--i', i++);
      line.append(s);
      letters.push(s);
    }
  });

  /* Live local time in Lebanon next to the location */
  const clock = $('.clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Beirut' });
    const tick = () => { $('time', clock).textContent = fmt.format(new Date()); };
    tick(); clock.hidden = false; setInterval(tick, 15000);
  }

  /* Scroll progress bar */
  const bar = $('.progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  /* Light panels open like a card: flat and full width once their top edge is 45% up the screen */
  const sheets = reduce ? [] : $$('.sheet');
  const openSheets = () => sheets.forEach(el => {
    const t = Math.min(1, Math.max(0, (innerHeight - el.offsetTop + scrollY) / (innerHeight * 0.55)));
    el.style.setProperty('--p', (t * t * (3 - 2 * t)).toFixed(3));
  });
  let ticking = false;
  addEventListener('scroll', () => {
    onScroll();
    if (!ticking) { ticking = true; requestAnimationFrame(() => { openSheets(); ticking = false; }); }
  }, { passive: true });
  addEventListener('resize', openSheets);
  onScroll(); openSheets();

  /* Ticker: repeat the run so each half is wider than any screen and the loop never shows a gap */
  $$('.ticker-run').forEach(run => { run.innerHTML = run.innerHTML.repeat(run.children.length > 8 ? 8 : 16); });

  /* One-time reveals */
  const once = new IntersectionObserver((entries, o) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.dataset.count) countUp(e.target);
      o.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  $$('.reveal-line, .about, .contact, .ev-grid, .gantt li, [data-count]').forEach(el => once.observe(el));

  function countUp(el) {
    const end = +el.dataset.count;
    if (reduce) { el.textContent = end; return; }
    const t0 = performance.now(), dur = 1300;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* CHIA sketch: 250 dots and an attention grid */
  const dots = $('.dots'), attn = $('.attn'), count = $('.chia-count b');
  if (dots) {
    dots.innerHTML = '<i></i>'.repeat(250);
    let h = '';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) {
      const o = (0.18 + 0.82 * Math.exp(-Math.abs(c - r * 2) / 2.2)).toFixed(2);
      h += `<i style="--o:${o};--d:${(1.6 + Math.random() * 2.6).toFixed(2)}s;--dl:-${(Math.random() * 3).toFixed(2)}s"></i>`;
    }
    attn.innerHTML = h;
    if (reduce) $$('i', dots).forEach(d => d.classList.add('on'));
  }
  let chiaTimer = 0, chiaN = 0;
  function chiaStep() {
    const all = dots.children;
    if (chiaN >= 250) {
      chiaTimer = setTimeout(() => {
        for (const d of all) d.classList.remove('on', 'head');
        chiaN = 0; count.textContent = 0; chiaStep();
      }, 2200);
      return;
    }
    all[chiaN - 1]?.classList.remove('head');
    all[chiaN].classList.add('on', 'head');
    count.textContent = ++chiaN;
    if (chiaN === 250) all[249].classList.remove('head');
    chiaTimer = setTimeout(chiaStep, 26);
  }

  /* Helmet sketch: three scrolling traces */
  const traces = $$('.trace');
  let waveRaf = 0;
  function wave(t) {
    const x0 = 46, x1 = 474, n = 72;
    traces.forEach((p, k) => {
      const base = 285 + k * 45, amp = 14 - k * 2, sp = t / (520 + k * 170);
      let pts = '';
      for (let j = 0; j <= n; j++) {
        const u = j / n * 9 + sp;
        const y = base + Math.sin(u * (1.3 + k * 0.5)) * amp * 0.6
          + Math.sin(u * 3.1 + k) * amp * 0.3
          + (k === 2 ? Math.max(0, Math.sin(u * 0.9)) ** 16 * -26 : 0);
        pts += `${(x0 + (x1 - x0) * j / n).toFixed(1)},${y.toFixed(1)} `;
      }
      p.setAttribute('points', pts);
    });
    if (t !== 0) waveRaf = requestAnimationFrame(wave);
  }
  if (traces.length) wave(0);

  /* Run each sketch only while it is on screen */
  const live = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const svg = $('svg', e.target), kind = e.target.dataset.viz, on = e.isIntersecting && !reduce;
      if (svg) on ? svg.unpauseAnimations() : svg.pauseAnimations();
      if (kind === 'wave') { cancelAnimationFrame(waveRaf); if (on) waveRaf = requestAnimationFrame(wave); }
      if (kind === 'chia') { clearTimeout(chiaTimer); if (on) chiaStep(); }
    });
  }, { threshold: 0.15 });
  $$('[data-viz]').forEach(v => live.observe(v));
  const end = $('.end-track');
  if (end && !reduce) new IntersectionObserver(([e]) => e.isIntersecting ? end.unpauseAnimations() : end.pauseAnimations()).observe(end);
  if (reduce) $$('svg').forEach(s => s.pauseAnimations && s.pauseAnimations());
})();
