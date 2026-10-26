;(function () {
  'use strict'

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  /* ========== 1. SCROLL REVEAL + STAGGER ========== */
  const revealEls = document.querySelectorAll(
    '[data-rv], [data-rv-left], [data-rv-right], [data-rv-zoom]'
  )

  // расставляем задержки для детей stagger-контейнеров
  document.querySelectorAll('[data-rv-stagger]').forEach((group) => {
    group
      .querySelectorAll(
        '[data-rv], [data-rv-left], [data-rv-right], [data-rv-zoom]'
      )
      .forEach((el, i) => {
        el.style.transitionDelay = Math.min(i * 90, 540) + 'ms'
      })
  })

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('rv-in'))
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('rv-in')
          entry.target.style.willChange = 'auto'
          revealObserver.unobserve(entry.target)
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    revealEls.forEach((el) => revealObserver.observe(el))
  }

  /* ========== 2. АНИМИРОВАННЫЕ СЧЁТЧИКИ ========== */
  const counters = document.querySelectorAll('.counter')

  function runCounter(el) {
    const target = parseInt(el.dataset.target, 10) || 0
    if (reduceMotion) {
      el.textContent = String(target)
      return
    }
    const duration = 1500
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      el.textContent = String(Math.round(target * eased))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          runCounter(entry.target)
          counterObserver.unobserve(entry.target)
        })
      },
      { threshold: 0.6 }
    )
    counters.forEach((el) => counterObserver.observe(el))
  } else {
    counters.forEach((el) => (el.textContent = el.dataset.target))
  }

  /* ========== 3. СКРОЛЛ: прогресс-бар, шапка, параллакс, mobile CTA ========== */
  const progressBar = document.querySelector('.scroll-progress')
  const header = document.querySelector('.site-header')
  const parallaxEls = document.querySelectorAll('[data-parallax]')
  const mobileCta = document.querySelector('.mobile-cta')
  const hero = document.querySelector('.hero')

  let ticking = false

  function onScroll() {
    const y = window.scrollY || window.pageYOffset

    // прогресс-бар
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight
      progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%'
    }

    // компактная шапка
    if (header) header.classList.toggle('scrolled', y > 12)

    // параллакс фоновых изображений
    if (!reduceMotion) {
      parallaxEls.forEach((img) => {
        const band = img.closest('section') || img.parentElement
        const rect = band.getBoundingClientRect()
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return
        const speed = parseFloat(img.dataset.parallax) || 0.15
        const centerDelta = rect.top + rect.height / 2 - window.innerHeight / 2
        img.style.transform =
          'translateY(' + (centerDelta * speed).toFixed(1) + 'px)'
      })
    }

    // мобильная CTA-панель: показываем, когда герой ушёл с экрана
    if (mobileCta && hero) {
      const trigger = hero.offsetHeight - 120
      mobileCta.classList.toggle('visible', y > trigger)
    }

    ticking = false
  }

  function requestTick() {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(onScroll)
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true })
  window.addEventListener('resize', requestTick, { passive: true })
  onScroll()

  /* ========== 4. АКТУАЛЬНЫЙ ГОД В ФУТЕРЕ ========== */
  document.querySelectorAll('.year').forEach((el) => {
    el.textContent = String(new Date().getFullYear())
  })
})()
