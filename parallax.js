(() => {
  const section = document.querySelector('.philosophy');
  if (!section) return;

  const details = [...section.querySelectorAll('[data-parallax-range]')].map(element => ({
    element,
    range: Number(element.dataset.parallaxRange) || 0,
    offset: 0,
  }));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let frame = 0;
  let lastTime = 0;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function schedule() {
    if (!frame && visible && !reducedMotion.matches && !document.hidden) {
      frame = requestAnimationFrame(update);
    }
  }

  function update(time) {
    frame = 0;
    if (!visible || reducedMotion.matches || document.hidden) return;

    // One layout read for the whole section; individual images only receive transforms.
    const bounds = section.getBoundingClientRect();
    const viewport = window.innerHeight;
    const progress = Math.max(-1, Math.min(1,
      (viewport / 2 - bounds.top - bounds.height / 2) / ((viewport + bounds.height) / 2)
    ));
    const intensity = window.innerWidth <= 1023 ? 0.3 : 1;
    const elapsed = lastTime ? Math.min(time - lastTime, 64) : 16;
    const easing = 1 - Math.exp(-elapsed / 160);
    let settling = false;
    lastTime = time;

    for (const detail of details) {
      const target = progress * detail.range * intensity;
      const difference = target - detail.offset;
      detail.offset = Math.abs(difference) < 0.05 ? target : detail.offset + difference * easing;
      if (Math.abs(target - detail.offset) >= 0.05) settling = true;
      detail.element.style.setProperty('--parallax-offset', `${detail.offset.toFixed(3)}px`);
    }

    if (settling) schedule();
    else lastTime = 0;
  }

  function syncMotion() {
    section.classList.toggle('philosophy--parallax-active', visible && !reducedMotion.matches);
    if (reducedMotion.matches) {
      stop();
      for (const detail of details) {
        detail.offset = 0;
        detail.element.style.removeProperty('--parallax-offset');
      }
    } else schedule();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
    syncMotion();
  }, { rootMargin: '100px 0px' }).observe(section);

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else schedule();
  });
})();
