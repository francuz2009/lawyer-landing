document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('popupOverlay')
  const openBtns = [
    document.getElementById('openPopupBtn'),
    document.getElementById('openPopupBtn2'),
  ]
  const closeBtn = document.getElementById('closePopupBtn')
  let lastFocusedElement

  function openPopup() {
    lastFocusedElement = document.activeElement
    overlay.classList.add('active')
    openBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'true'))
    document.body.style.overflow = 'hidden'
    setTimeout(() => document.getElementById('popup-name').focus(), 100)
  }

  function closePopup() {
    overlay.classList.remove('active')
    openBtns.forEach((btn) => btn.setAttribute('aria-expanded', 'false'))
    document.body.style.overflow = '' // Возвращаем скролл
    if (lastFocusedElement) lastFocusedElement.focus() // Возвращаем фокус
  }

  openBtns.forEach((btn) => btn.addEventListener('click', openPopup))
  closeBtn.addEventListener('click', closePopup)

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closePopup()
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePopup()
    }
  })

  const faqQuestions = document.querySelectorAll('.faq-item .question')
  faqQuestions.forEach((q) => {
    q.addEventListener('click', () => {
      const answer = q.nextElementSibling
      const isOpen = answer.style.display === 'block'

      document
        .querySelectorAll('.faq-item .answer')
        .forEach((a) => (a.style.display = 'none'))
      document
        .querySelectorAll('.faq-item .question span')
        .forEach((s) => (s.textContent = '+'))

      if (!isOpen) {
        answer.style.display = 'block'
        q.querySelector('span').textContent = '−'
      }
    })
  })
})
