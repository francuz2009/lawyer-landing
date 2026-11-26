;(function () {
  if (window._optimizedScriptLoaded) return
  window._optimizedScriptLoaded = true

  const CONFIG = {
    toastDuration: 4000,
    successPopupDuration: 7000,
    swipeThreshold: 100,
  }

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
    fileWrapper: '.file-upload-wrapper',
    fileNameDisplay: '.file-name-display',
    contactForm: '.contact-form',
    submitBtn: '.submit-btn',
    privacyLink: '.open-privacy-popup',
    toast: '#toast',
    popupModal: '.popup-modal',
    privacyContent: '.privacy-content',
    phoneMask: '.phone-mask',
  }

  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => document.querySelectorAll(sel)

  const elements = {
    consultPopup: $(SELECTORS.consultPopup),
    successPopup: $(SELECTORS.successPopup),
    privacyPopup: $(SELECTORS.privacyPopup),
    toast: $(SELECTORS.toast),
  }

  // ===== 2. УТИЛИТЫ =====
  const utils = {
    timers: new Set(),
    addTimer(fn, delay) {
      const id = setTimeout(fn, delay)
      this.timers.add(id)
      return id
    },
    clearTimers() {
      this.timers.forEach((id) => clearTimeout(id))
      this.timers.clear()
    },
    debounce(func, wait) {
      let timeout
      return (...args) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func.apply(this, args), wait)
      }
    },
  }

  let lastFocusedElement = null

  // ===== 3. МАСКА ТЕЛЕФОНА РФ (+7 (XXX) XXX-XX-XX) =====
  function initPhoneMask() {
    const formatPhone = (value) => {
      let digits = value.replace(/\D/g, '')
      if (digits.startsWith('8')) digits = '7' + digits.slice(1)
      if (!digits.startsWith('7') && digits.length > 0) digits = '7' + digits
      digits = digits.slice(0, 11)

      let res = '+7'
      if (digits.length > 1) res += ' (' + digits.slice(1, 4)
      if (digits.length >= 5) res += ') ' + digits.slice(4, 7)
      if (digits.length >= 8) res += '-' + digits.slice(7, 9)
      if (digits.length >= 10) res += '-' + digits.slice(9, 11)
      return res
    }

    $$(SELECTORS.phoneMask).forEach((input) => {
      const setError = (show) => {
        const errorEl = input.parentElement.querySelector('.field-error')
        if (errorEl) {
          errorEl.textContent = 'Введите номер полностью: +7 (XXX) XXX-XX-XX'
          errorEl.classList.toggle('visible', show)
        }
        input.classList.toggle('incomplete', show)
      }

      input.addEventListener('input', (e) => {
        const cursorPos = input.selectionStart
        const oldValue = input.value
        const newValue = formatPhone(oldValue)

        if (oldValue !== newValue) {
          input.value = newValue
          // Умное восстановление позиции курсора
          const digitsInOld = (oldValue.slice(0, cursorPos).match(/\d/g) || [])
            .length
          let newCursorPos = 0
          let digitsFound = 0
          for (let i = 0; i < newValue.length; i++) {
            if (/\d/.test(newValue[i])) digitsFound++
            if (digitsFound === digitsInOld) {
              newCursorPos = i + 1
              break
            }
          }
          input.setSelectionRange(newCursorPos, newCursorPos)
        }
        setError(false)
      })

      input.addEventListener('focus', () => {
        if (!input.value) {
          input.value = '+7 ('
          setTimeout(() => input.setSelectionRange(4, 4), 0)
        }
      })

      input.addEventListener('blur', () => {
        const digits = input.value.replace(/\D/g, '')
        if (digits.length < 11) {
          input.value = ''
          setError(true)
        }
      })

      input.addEventListener('paste', (e) => {
        e.preventDefault()
        const pasted = (e.clipboardData || window.clipboardData).getData('text')
        input.value = formatPhone(pasted)
        setTimeout(
          () => input.setSelectionRange(input.value.length, input.value.length),
          0
        )
      })

      input.addEventListener('keydown', (e) => {
        const allowed = [
          'Backspace',
          'Delete',
          'Tab',
          'Escape',
          'Enter',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
        ]
        if (
          allowed.includes(e.key) ||
          ((e.ctrlKey || e.metaKey) &&
            ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))
        )
          return
        if (!/^\d$/.test(e.key)) e.preventDefault()
      })
    })
  }

  function validatePhone(input) {
    const digits = input.value.replace(/\D/g, '')
    const isValid = digits.length === 11
    const errorEl = input.parentElement.querySelector('.field-error')
    if (errorEl) {
      errorEl.textContent = 'Введите номер полностью: +7 (XXX) XXX-XX-XX'
      errorEl.classList.toggle('visible', !isValid)
    }
    input.classList.toggle('incomplete', !isValid)
    return isValid
  }

  // ===== 4. УПРАВЛЕНИЕ ПОПАПАМИ =====
  function openPopup(popup) {
    if (!popup) return
    lastFocusedElement = document.activeElement
    popup.classList.add('active')
    document.body.classList.add('no-scroll')
    $$(SELECTORS.openPopupBtns).forEach((btn) =>
      btn.setAttribute('aria-expanded', 'true')
    )

    utils.addTimer(() => {
      const focusTarget =
        popup.querySelector(
          'input:not([type="hidden"]):not([type="checkbox"])'
        ) || popup.querySelector('.popup-close')
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

    const modal = popup.querySelector(SELECTORS.popupModal)
    if (modal) {
      modal.style.transform = ''
      modal.style.transition = ''
    }

    if (lastFocusedElement) {
      lastFocusedElement.focus()
      lastFocusedElement = null
    }
    utils.clearTimers()
  }

  $$(SELECTORS.openPopupBtns).forEach((btn) =>
    btn.addEventListener('click', () => openPopup(elements.consultPopup))
  )
  $$(SELECTORS.closePopupBtns).forEach((btn) =>
    btn.addEventListener('click', () =>
      closePopup(btn.closest('.popup-overlay'))
    )
  )
  ;[
    elements.consultPopup,
    elements.successPopup,
    elements.privacyPopup,
  ].forEach((popup) => {
    if (popup) {
      popup.addEventListener('click', (e) => {
        if (e.target === popup) closePopup(popup)
      })
    }
  })

  // ===== 5. FAQ АККОРДЕОН =====
  document.addEventListener('click', (e) => {
    const question = e.target.closest(SELECTORS.faqQuestion)
    if (!question) return
    const item = question.closest(SELECTORS.faqItem)
    const answer = item.querySelector(SELECTORS.faqAnswer)
    if (!item || !answer) return

    const isActive = item.classList.contains('active')

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

  window.addEventListener(
    'resize',
    utils.debounce(() => {
      $$(`${SELECTORS.faqItem}.active ${SELECTORS.faqAnswer}`).forEach(
        (answer) => {
          answer.style.maxHeight = answer.scrollHeight + 'px'
        }
      )
    }, 250)
  )

  // ===== 6. ЗАГРУЗКА ФАЙЛОВ (с Drag & Drop визуализацией) =====
  document.addEventListener('change', (e) => {
    const input = e.target.closest(SELECTORS.fileInput)
    if (!input) return
    const wrapper = input.closest(SELECTORS.fileWrapper)
    const display = wrapper?.querySelector(SELECTORS.fileNameDisplay)
    if (!wrapper || !display) return

    if (input.files.length > 0) {
      const names = Array.from(input.files)
        .map((f) => f.name)
        .join(', ')
      display.textContent =
        names.length > 40 ? names.substring(0, 40) + '...' : names
      display.style.color = '#fff'
      display.style.fontWeight = '600'
      wrapper.classList.add('has-files')
    } else {
      display.textContent = 'Нажмите или перетащите файлы'
      display.style.color = ''
      display.style.fontWeight = ''
      wrapper.classList.remove('has-files')
    }
  })

  $$(SELECTORS.fileWrapper).forEach((wrapper) => {
    const prevent = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }
    ;['dragenter', 'dragover'].forEach((evt) => {
      wrapper.addEventListener(evt, (e) => {
        prevent(e)
        wrapper.classList.add('dragging')
      })
    })
    ;['dragleave', 'drop'].forEach((evt) => {
      wrapper.addEventListener(evt, (e) => {
        prevent(e)
        wrapper.classList.remove('dragging')
      })
    })
    wrapper.addEventListener('drop', (e) => {
      const input = wrapper.querySelector(SELECTORS.fileInput)
      if (input && e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files
        input.dispatchEvent(new Event('change'))
      }
    })
  })

  // ===== 7. TOAST УВЕДОМЛЕНИЯ =====
  function showToast(message, type = 'success') {
    if (!elements.toast) return
    elements.toast.textContent = message
    elements.toast.className = `toast ${type} show`
    utils.addTimer(
      () => elements.toast.classList.remove('show'),
      CONFIG.toastDuration
    )
  }

  // ===== 8. ОТПРАВКА ФОРМ =====
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest(SELECTORS.contactForm)
    if (!form) return
    e.preventDefault()

    const phoneInput = form.querySelector(SELECTORS.phoneMask)
    if (phoneInput && !validatePhone(phoneInput)) {
      phoneInput.focus()
      return
    }

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
        if (elements.consultPopup?.classList.contains('active')) {
          closePopup(elements.consultPopup)
        }
        form.reset()

        const fileDisplay = form.querySelector(SELECTORS.fileNameDisplay)
        if (fileDisplay) {
          fileDisplay.textContent = 'Нажмите или перетащите файлы'
          fileDisplay.style.color = ''
          fileDisplay.style.fontWeight = ''
          form
            .querySelector(SELECTORS.fileWrapper)
            ?.classList.remove('has-files')
        }

        utils.addTimer(() => openPopup(elements.successPopup), 300)
        utils.addTimer(() => {
          if (elements.successPopup?.classList.contains('active')) {
            closePopup(elements.successPopup)
          }
        }, CONFIG.successPopupDuration)
      } else {
        showToast(result.error || 'Ошибка отправки. Попробуйте позже.', 'error')
      }
    } catch (error) {
      console.error('Form error:', error)
      showToast('Ошибка сети. Проверьте подключение к интернету.', 'error')
    } finally {
      submitBtn.disabled = false
      submitBtn.classList.remove('loading')
    }
  })

  // ===== 9. PRIVACY POPUP =====
  document.addEventListener('click', (e) => {
    const link = e.target.closest(SELECTORS.privacyLink)
    if (!link || !elements.privacyPopup) return
    e.preventDefault()

    if (elements.consultPopup?.classList.contains('active'))
      closePopup(elements.consultPopup)
    if (elements.successPopup?.classList.contains('active'))
      closePopup(elements.successPopup)

    openPopup(elements.privacyPopup)
  })

  // ===== 10. СВАЙП ВНИЗ (Mobile) ЧЕРЕЗ WeakMap =====
  const swipeHandlers = new WeakMap()

  ;[elements.consultPopup, elements.successPopup, elements.privacyPopup]
    .filter(Boolean)
    .forEach((popup) => {
      const modal = popup.querySelector(SELECTORS.popupModal)
      if (!modal) return

      let touchStartY = 0
      let touchCurrentY = 0
      let isDragging = false

      const handleStart = (e) => {
        const scrollable = popup.querySelector(SELECTORS.privacyContent)
        if (scrollable && scrollable.scrollTop > 0) return

        touchStartY = e.touches[0].clientY
        touchCurrentY = touchStartY
        isDragging = true
        modal.style.transition = 'none'
      }

      const handleMove = (e) => {
        if (!isDragging) return
        touchCurrentY = e.touches[0].clientY
        const diff = touchCurrentY - touchStartY
        if (diff > 0) {
          modal.style.transform = `translateY(${Math.min(diff * 0.5, diff)}px)`
        }
      }

      const handleEnd = () => {
        if (!isDragging) return
        isDragging = false
        const diff = touchCurrentY - touchStartY
        modal.style.transition = ''

        if (diff > CONFIG.swipeThreshold) {
          closePopup(popup)
        } else {
          modal.style.transform = ''
        }
        touchStartY = 0
        touchCurrentY = 0
      }

      modal.addEventListener('touchstart', handleStart, { passive: true })
      modal.addEventListener('touchmove', handleMove, { passive: true })
      modal.addEventListener('touchend', handleEnd, { passive: true })

      swipeHandlers.set(modal, {
        start: handleStart,
        move: handleMove,
        end: handleEnd,
      })
    })

  initPhoneMask()
})()
