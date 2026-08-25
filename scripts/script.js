;(function () {
  if (window._optimizedScriptLoaded) return
  window._optimizedScriptLoaded = true

  // ===== СЕЛЕКТОРЫ =====
  const SELECTORS = {
    consultPopup: '#consultPopup',
    successPopup: '#successPopup',
    privacyPopup: '#privacyPopup',
    openPopupBtns: '.open-popup-btn',
    closePopupBtns: '.close-popup-btn',
    faqItem: '.faq-item',
    faqQuestion: '.faq-question',
    faqAnswer: '.faq-answer',
    fileInput: 'input[type="file"]',
    contactForm: '.contact-form',
    submitBtn: '.submit-btn',
    privacyLink: '.open-privacy-popup',
    toast: '#toast',
    fileWrapper: '.file-upload-wrapper',
    fileNameDisplay: '.file-name-display',
    popupModal: '.popup-modal',
    privacyContent: '.privacy-content',
  }

  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => document.querySelectorAll(sel)

  const consultPopup = $(SELECTORS.consultPopup)
  const successPopup = $(SELECTORS.successPopup)
  const privacyPopup = $(SELECTORS.privacyPopup)
  const toast = $(SELECTORS.toast)

  // ===== УПРАВЛЕНИЕ ТАЙМЕРАМИ (для очистки) =====
  const timers = {
    ids: [],
    add(fn, delay) {
      const id = setTimeout(fn, delay)
      this.ids.push(id)
      return id
    },
    clearAll() {
      this.ids.forEach((id) => clearTimeout(id))
      this.ids = []
    },
  }

  let lastFocusedElement = null

  // ===== ФУНКЦИИ ПОПАПОВ =====
  function openPopup(popup) {
    if (!popup) return
    lastFocusedElement = document.activeElement
    popup.classList.add('active')
    document.body.classList.add('no-scroll')
    $$(SELECTORS.openPopupBtns).forEach((btn) =>
      btn.setAttribute('aria-expanded', 'true')
    )

    timers.add(() => {
      const firstInput = popup.querySelector(
        'input:not([type="hidden"]):not([type="checkbox"])'
      )
      const closeBtn = popup.querySelector('.popup-close')
      const focusTarget = firstInput || closeBtn
      if (focusTarget) focusTarget.focus()
    }, 100)
  }

  function closePopup(popup) {
    if (!popup) return
    popup.classList.remove('active')
    document.body.classList.remove('no-scroll')
    $$(SELECTORS.openPopupBtns).forEach((btn) =>
      btn.setAttribute('aria-expanded', 'false')
    )

    // Сброс трансформации от свайпа
    const modal = popup.querySelector(SELECTORS.popupModal)
    if (modal) {
      modal.style.transform = ''
      modal.style.transition = ''
    }

    if (lastFocusedElement) {
      lastFocusedElement.focus()
      lastFocusedElement = null
    }
    // Очищаем все таймеры при закрытии любого попапа
    timers.clearAll()
  }

  // ===== ИНИЦИАЛИЗАЦИЯ ПОПАПОВ =====
  $$(SELECTORS.openPopupBtns).forEach((btn) => {
    btn.addEventListener('click', () => openPopup(consultPopup))
  })

  $$(SELECTORS.closePopupBtns).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const popup = btn.closest('.popup-overlay')
      if (popup) closePopup(popup)
    })
  })
  ;[consultPopup, successPopup, privacyPopup].forEach((popup) => {
    if (!popup) return
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closePopup(popup)
    })
  })

  // ===== FAQ (делегирование) =====
  document.addEventListener('click', (e) => {
    const question = e.target.closest(SELECTORS.faqQuestion)
    if (!question) return
    const item = question.closest(SELECTORS.faqItem)
    if (!item) return
    const answer = item.querySelector(SELECTORS.faqAnswer)
    if (!answer) return

    const isActive = item.classList.contains('active')

    // Закрываем все остальные
    $$(SELECTORS.faqItem).forEach((other) => {
      if (other !== item && other.classList.contains('active')) {
        const otherAnswer = other.querySelector(SELECTORS.faqAnswer)
        other.classList.remove('active')
        other
          .querySelector(SELECTORS.faqQuestion)
          .setAttribute('aria-expanded', 'false')
        if (otherAnswer) otherAnswer.style.maxHeight = null
      }
    })

    if (isActive) {
      item.classList.remove('active')
      question.setAttribute('aria-expanded', 'false')
      answer.style.maxHeight = null
    } else {
      item.classList.add('active')
      question.setAttribute('aria-expanded', 'true')
      answer.style.maxHeight = answer.scrollHeight + 'px'
    }
  })

  // ===== ОБНОВЛЕНИЕ ВЫСОТЫ FAQ ПРИ RESIZE (debounce) =====
  let resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      document
        .querySelectorAll(`${SELECTORS.faqItem}.active ${SELECTORS.faqAnswer}`)
        .forEach((answer) => {
          answer.style.maxHeight = answer.scrollHeight + 'px'
        })
    }, 250)
  })

  // ===== ОТОБРАЖЕНИЕ ИМЁН ФАЙЛОВ (делегирование) =====
  document.addEventListener('change', (e) => {
    const input = e.target.closest(SELECTORS.fileInput)
    if (!input) return
    const wrapper = input.closest(SELECTORS.fileWrapper)
    if (!wrapper) return
    const display = wrapper.querySelector(SELECTORS.fileNameDisplay)
    if (!display) return

    if (input.files.length > 0) {
      const names = Array.from(input.files)
        .map((f) => f.name)
        .join(', ')
      display.textContent =
        names.length > 40 ? names.substring(0, 40) + '...' : names
      display.style.color = '#fff'
      display.style.fontWeight = '600'
    } else {
      display.textContent = 'Нажмите или перетащите файлы'
      display.style.color = ''
      display.style.fontWeight = ''
    }
  })

  // ===== TOAST =====
  function showToast(message, type = 'success') {
    if (!toast) return
    toast.textContent = message
    toast.className = `toast ${type} show`
    timers.add(() => toast.classList.remove('show'), 4000)
  }

  // ===== ОТПРАВКА ФОРМ (делегирование) =====
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest(SELECTORS.contactForm)
    if (!form) return

    e.preventDefault()

    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    const submitBtn = form.querySelector(SELECTORS.submitBtn)
    if (!submitBtn) return

    submitBtn.disabled = true
    submitBtn.classList.add('loading')

    try {
      const formData = new FormData(form)
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        if (consultPopup && consultPopup.classList.contains('active'))
          closePopup(consultPopup)

        form.reset()
        const fileDisplay = form.querySelector(SELECTORS.fileNameDisplay)
        if (fileDisplay) {
          fileDisplay.textContent = 'Нажмите или перетащите файлы'
          fileDisplay.style.color = ''
          fileDisplay.style.fontWeight = ''
        }

        timers.add(() => openPopup(successPopup), 300)
        timers.add(() => {
          if (successPopup && successPopup.classList.contains('active'))
            closePopup(successPopup)
        }, 7000)
      } else {
        showToast(result.error || 'Ошибка отправки. Попробуйте позже.', 'error')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      showToast('Ошибка сети. Проверьте подключение к интернету.', 'error')
    } finally {
      submitBtn.disabled = false
      submitBtn.classList.remove('loading')
    }
  })

  // ===== PRIVACY POPUP =====
  document.addEventListener('click', (e) => {
    const link = e.target.closest(SELECTORS.privacyLink)
    if (!link) return
    e.preventDefault()
    if (!privacyPopup) return

    if (consultPopup && consultPopup.classList.contains('active'))
      closePopup(consultPopup)
    if (successPopup && successPopup.classList.contains('active'))
      closePopup(successPopup)

    openPopup(privacyPopup)
  })

  // ===== УНИВЕРСАЛЬНЫЙ СВАЙП ВНИЗ (mobile) С ОЧИСТКОЙ =====
  const popupsWithSwipe = [consultPopup, successPopup, privacyPopup].filter(
    Boolean
  )

  popupsWithSwipe.forEach((popup) => {
    let touchStartY = 0
    let touchCurrentY = 0
    let isDragging = false
    const modal = popup.querySelector(SELECTORS.popupModal)
    if (!modal) return

    const handleTouchStart = (e) => {
      const scrollableContent = popup.querySelector(SELECTORS.privacyContent)
      const scrollTop = scrollableContent ? scrollableContent.scrollTop : 0

      if (scrollTop === 0) {
        touchStartY = e.touches[0].clientY
        touchCurrentY = touchStartY
        isDragging = true
        modal.style.transition = 'none'
      }
    }

    const handleTouchMove = (e) => {
      if (!isDragging) return
      touchCurrentY = e.touches[0].clientY
      const diff = touchCurrentY - touchStartY
      if (diff > 0) {
        const resistance = Math.min(diff * 0.5, diff)
        modal.style.transform = `translateY(${resistance}px)`
      }
    }

    const handleTouchEnd = () => {
      if (!isDragging) return
      isDragging = false
      const diff = touchCurrentY - touchStartY
      modal.style.transition = ''
      if (diff > 100) {
        closePopup(popup)
      }
      modal.style.transform = ''
      touchStartY = 0
      touchCurrentY = 0
    }

    modal.addEventListener('touchstart', handleTouchStart, { passive: true })
    modal.addEventListener('touchmove', handleTouchMove, { passive: true })
    modal.addEventListener('touchend', handleTouchEnd, { passive: true })

    popup._swipeHandlers = {
      start: handleTouchStart,
      move: handleTouchMove,
      end: handleTouchEnd,
    }

    const originalClose = closePopup
    closePopup = function (popupToClose) {
      if (popupToClose === popup) {
        const handlers = popup._swipeHandlers
        if (handlers) {
          modal.removeEventListener('touchstart', handlers.start)
          modal.removeEventListener('touchmove', handlers.move)
          modal.removeEventListener('touchend', handlers.end)
          delete popup._swipeHandlers
        }
      }
      originalClose(popupToClose)
    }
  })
})()
