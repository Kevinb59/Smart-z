document.addEventListener('DOMContentLoaded', function () {
  const fonts = [
    'Pacifico',
    'Lobster',
    'Fredoka One',
    'Monoton',
    'Great Vibes',
    'Satisfy',
    'Shadows Into Light',
    'Poiret One',
    'Dancing Script',
    'Amatic SC',
    'Baloo 2',
    'Bangers',
    'Cinzel',
    'Courgette',
    'Crafty Girls',
    'Permanent Marker',
    'Rock Salt',
    'Sacramento',
    'Cookie',
    'Covered By Your Grace',
    'Gloria Hallelujah',
    'Indie Flower',
    'Love Ya Like A Sister',
    'Luckiest Guy',
    'Marck Script',
    'Passions Conflict',
    'Patrick Hand',
    'Pinyon Script',
    'Pompiere',
    'Quicksand',
    'Raleway',
    'Righteous',
    'Shadows Into Light Two',
    'Special Elite',
    'Ultra',
    'Varela Round',
    'Yellowtail',
    'Yeseva One',
    'Zilla Slab',
    'Allura',
    'Architects Daughter',
    'Bad Script',
    'Bebas Neue',
    'Black Ops One',
    'Chewy',
    'Faster One',
    'Finger Paint',
    'Handlee',
    'Knewave'
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
      option.value = font
      option.textContent = font
      option.style.fontFamily = `'${font}', cursive, sans-serif`
      fontChoice.appendChild(option)
    })

    // Appliquer la police actuelle si une est déjà sélectionnée
    if (fontChoice.value) {
      customText.style.fontFamily = `'${fontChoice.value}', cursive, sans-serif`
    }

    fontChoice.addEventListener('change', () => {
      const font = fontChoice.value
      customText.style.fontFamily = font ? `'${font}', cursive, sans-serif` : ''
    })
  }

  // Initialiser sur tous les formulaires existants
  document.querySelectorAll('.productForm').forEach(setupFontChoice)

  // Réutilisable pour les nouveaux designs ajoutés dynamiquement
  window.setupFontChoice = setupFontChoice
})
