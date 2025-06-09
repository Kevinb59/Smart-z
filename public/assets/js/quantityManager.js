document.addEventListener('DOMContentLoaded', function () {
  // Fonction pour mettre à jour la quantité d'un design
  function updateQuantity(form) {
    const phonesContainer = form.querySelector('.phonesContainer')
    const quantityInput = form.querySelector('.qty')
    const phoneDivs = phonesContainer.querySelectorAll('.col-6')
    const numberOfPhones = phoneDivs.length / 2 // Divisé par 2 car chaque téléphone a 2 divs (marque et modèle)
    const hasMultiplePhones = numberOfPhones > 1

    if (hasMultiplePhones) {
      // Si plusieurs téléphones, on désactive l'input et on met la quantité égale au nombre de téléphones
      quantityInput.value = numberOfPhones.toString()
      quantityInput.disabled = true
      quantityInput.style.backgroundColor = '#f0f0f0'
      quantityInput.style.cursor = 'not-allowed'
    } else {
      // Si un seul téléphone, on réactive l'input et on met la quantité à 1 par défaut
      quantityInput.disabled = false
      quantityInput.style.backgroundColor = ''
      quantityInput.style.cursor = ''
      // Si la quantité était verrouillée avant, on la met à 1
      if (quantityInput.value === '2') {
        quantityInput.value = '1'
      }
    }
  }

  // Observer les changements dans le conteneur des designs
  const designsContainer = document.getElementById('designsContainer')
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList') {
        // Mettre à jour les quantités pour tous les designs
        document.querySelectorAll('.productForm').forEach(updateQuantity)
      }
    })
  })

  // Observer les changements dans le conteneur des designs
  observer.observe(designsContainer, {
    childList: true,
    subtree: true
  })

  // Observer les changements dans les conteneurs de téléphones
  document.addEventListener('click', function (e) {
    if (
      e.target.closest('.addPhoneButton') ||
      e.target.closest('.removePhoneButton')
    ) {
      // Attendre que le DOM soit mis à jour
      setTimeout(() => {
        document.querySelectorAll('.productForm').forEach(updateQuantity)
      }, 0)
    }
  })

  // Initialiser les quantités pour tous les designs existants
  document.querySelectorAll('.productForm').forEach(updateQuantity)
})
