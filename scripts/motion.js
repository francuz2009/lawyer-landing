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

  const formatCounter = (el, value) => {
    const pad = parseInt(el.dataset.pad, 10) || 0
    return String(value).padStart(pad, '0')
  }

  function runCounter(el) {
    const target = parseInt(el.dataset.target, 10) || 0
    if (reduceMotion) {
      el.textContent = formatCounter(el, target)
      return
    }
    const duration = 1200
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      el.textContent = formatCounter(el, Math.round(target * eased))
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
    counters.forEach((el) => {
      el.textContent = formatCounter(el, el.dataset.target)
    })
  }

  /* ========== 3. СКРОЛЛ: прогресс-бар, шапка, параллакс, mobile CTA, «наверх» ========== */
  const progressBar = document.querySelector('.scroll-progress')
  const header = document.querySelector('.site-header')
  const parallaxEls = document.querySelectorAll('[data-parallax]')
  const mobileCta = document.querySelector('.mobile-cta')
  const hero = document.querySelector('.hero')
  const toTop = document.querySelector('.to-top')

  // фактическая высота шапки -> CSS-переменная для scroll-padding
  function syncHeaderHeight() {
    if (!header) return
    document.documentElement.style.setProperty(
      '--header-h',
      header.offsetHeight + 'px'
    )
  }

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

    // кнопка «наверх»
    if (toTop) toTop.classList.toggle('visible', y > 700)

    ticking = false
  }

  function requestTick() {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(onScroll)
    }
  }

  window.addEventListener('scroll', requestTick, { passive: true })
  window.addEventListener(
    'resize',
    () => {
      syncHeaderHeight()
      requestTick()
    },
    { passive: true }
  )
  syncHeaderHeight()
  onScroll()

  /* ========== 4. ПЛАВНЫЙ СКРОЛЛ К ЯКОРЯМ ========== */
  // Своя анимация с easeInOutCubic: учитывает липкую шапку,
  // отменяется при действии пользователя, уважает reduced motion.
  let scrollRaf = null

  const headerOffset = () => (header ? header.offsetHeight : 0) + 14

  function cancelSmoothScroll() {
    if (scrollRaf !== null) {
      cancelAnimationFrame(scrollRaf)
      scrollRaf = null
    }
  }

  // пользователь перехватил управление — останавливаем анимацию
  ;['wheel', 'touchstart', 'keydown'].forEach((evt) =>
    window.addEventListener(evt, cancelSmoothScroll, { passive: true })
  )

  function smoothScrollTo(targetY, onDone) {
    cancelSmoothScroll()
    const startY = window.scrollY || window.pageYOffset
    const maxY = document.documentElement.scrollHeight - window.innerHeight
    const endY = Math.max(0, Math.min(targetY, maxY))
    const distance = endY - startY

    if (reduceMotion || Math.abs(distance) < 2) {
      window.scrollTo(0, endY)
      if (onDone) onDone()
      return
    }

    // длительность зависит от расстояния: 450–900 мс
    const duration = Math.min(900, Math.max(450, Math.abs(distance) * 0.5))
    const start = performance.now()
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const step = (now) => {
      const p = Math.min((now - start) / duration, 1)
      window.scrollTo(0, startY + distance * easeInOutCubic(p))
      if (p < 1) {
        scrollRaf = requestAnimationFrame(step)
      } else {
        scrollRaf = null
        if (onDone) onDone()
      }
    }
    scrollRaf = requestAnimationFrame(step)
  }

  function focusTarget(el) {
    // переводим фокус на секцию для скринридеров и клавиатуры
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]')
    if (!link) return
    const hash = link.getAttribute('href')
    if (!hash || hash === '#') return // служебные ссылки (попап политики и т.п.)

    const target = document.querySelector(hash)
    if (!target) return

    e.preventDefault()
    const targetY =
      hash === '#top'
        ? 0
        : target.getBoundingClientRect().top +
          (window.scrollY || window.pageYOffset) -
          headerOffset()

    smoothScrollTo(targetY, () => focusTarget(target))

    if (history.pushState) {
      history.pushState(null, '', hash)
    }
  })

  // кнопка «наверх»
  if (toTop) {
    toTop.addEventListener('click', () => {
      smoothScrollTo(0, () => {
        if (history.pushState) history.pushState(null, '', '#top')
      })
    })
  }

  /* ========== 5. SCROLLSPY: подсветка активного пункта меню ========== */
  // учитываем только якорные ссылки текущей страницы (межстраничные — пропускаем)
  const navLinks = Array.from(
    document.querySelectorAll('.site-nav .nav-link')
  ).filter((link) => (link.getAttribute('href') || '').startsWith('#'))
  const spySections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean)

  function setActiveLink(id) {
    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === '#' + id
      link.classList.toggle('active', active)
      if (active) {
        link.setAttribute('aria-current', 'true')
      } else {
        link.removeAttribute('aria-current')
      }
    })
  }

  if ('IntersectionObserver' in window && spySections.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.id)
        })
      },
      // «полоса» внимания: середина экрана
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    )
    spySections.forEach((section) => spyObserver.observe(section))

    // сброс подсветки у самого верха страницы
    window.addEventListener(
      'scroll',
      () => {
        if ((window.scrollY || window.pageYOffset) < 120) setActiveLink('')
      },
      { passive: true }
    )
  }

  /* ========== 6. АКТУАЛЬНЫЙ ГОД В ФУТЕРЕ ========== */
  document.querySelectorAll('.year').forEach((el) => {
    el.textContent = String(new Date().getFullYear())
  })
})()
