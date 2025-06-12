document.addEventListener('DOMContentLoaded', function () {
  const fonts = [
    { name: 'Sriracha', css: "'Sriracha', cursive" },
    { name: 'Vibur', css: "'Vibur', cursive" },
    { name: 'Yellowtail', css: "'Yellowtail', cursive" },
    { name: 'Zen Tokyo Zoo', css: "'Zen Tokyo Zoo', cursive" },
    { name: 'Source Sans 3', css: "'Source Sans 3', sans-serif" }
  ]

  function setupFontChoice(form) {
    const fontChoice = form.querySelector('select[name="fontChoice"]')
    const customText = form.querySelector('textarea[name="customText"]')

    if (!fontChoice || !customText) return

    // Réinitialise la liste
    fontChoice.innerHTML = ''
    const defaultOption = document.createElement('option')
    defaultOption.value = ''
    defaultOption.textContent = 'Police personnalisée'
    defaultOption.disabled = true
    defaultOption.selected = true
    fontChoice.appendChild(defaultOption)

    fonts.forEach((font) => {
      const option = document.createElement('option')
      option.value = font.name
      option.textContent = font.name
      option.style.fontFamily = font.css
      fontChoice.appendChild(option)
    })

    // Appliquer la police actuelle si une est déjà sélectionnée
    if (fontChoice.value) {
      const selectedFont = fonts.find((f) => f.name === fontChoice.value)
      customText.style.fontFamily = selectedFont ? selectedFont.css : ''
    }

    fontChoice.addEventListener('change', () => {
      const font = fonts.find((f) => f.name === fontChoice.value)
      customText.style.fontFamily = font ? font.css : ''
    })
  }

  // Initialiser sur tous les formulaires existants
  document.querySelectorAll('.productForm').forEach(setupFontChoice)

  // Réutilisable pour les nouveaux designs ajoutés dynamiquement
  window.setupFontChoice = setupFontChoice
})
