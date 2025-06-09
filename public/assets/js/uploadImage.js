// Gestion du chargement dynamique des images dans chaque formulaire
// Affiche l'image dans .image-preview avec un <img> centré, max 360px, ratio gardé

document.addEventListener('change', function (e) {
  if (e.target.matches('.imageUpload')) {
    const input = e.target
    const label = input.closest('.upload-label')
    const preview = label.querySelector('.image-preview')

    if (input.files && input.files[0]) {
      const reader = new FileReader()
      reader.onload = function (e) {
        // Vide le preview
        preview.innerHTML = ''
        const img = new window.Image()
        img.onload = function () {
          // L'image s'adapte automatiquement via le CSS
          preview.appendChild(img)
          label.classList.add('has-image')
        }
        img.src = e.target.result
        img.alt = 'Aperçu'
      }
      reader.readAsDataURL(input.files[0])
    }
  }
})
