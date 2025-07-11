/* =========================================================================================================
   I N D E X - F R O N T E N D
   =========================================================================================================
   Cette page centralise :
   - Le chargement de la bannière promotionnelle (promoBanner)
   - Le chargement des marques et modèles (phonesData) et leur initialisation dans les formulaires
   - La gestion du bouton de paiement et de l'acceptation des CGV
   - La gestion du scroll vers le formulaire de commande
   - La gestion des sélects marques et modèles
   - La gestion du multi-design
   - La gestion du calcul automatique de la quantité
   - La gestion de l'upload d'image
   - La gestion du choix de police
   - La gestion de la sélection de la police
   - La gestion du multi-design
   ========================================================================================================= */

/* =========================================================================================================
   A F F I C H A G E   D U   B A N N E R   P R O M O   E T   D E   L ' I N T E R F A C E   D E   L ' E C A R T
========================================================================================================= */

async function afficherPromoEtEcard() {
  const eCard = document.querySelector('.e-card')
  const section = eCard ? eCard.closest('section') : null
  const bannerSection = eCard ? eCard.querySelector('.infotop') : null
  if (!section || !eCard || !bannerSection) return
  section.style.display = 'none'
  try {
    const res = await fetch('/api/index-data')
    const data = await res.json()
    const { promo, brands } = data
    if (!promo || !promo.show || !promo.code) {
      section.style.display = 'none'
      return
    }
    section.style.display = 'block'
    let reduction = ''
    if (promo.type === 'percent') reduction = promo.value + '%'
    else if (promo.type === 'amount')
      reduction = promo.value.toFixed(2).replace('.', ',') + '€'
    bannerSection.innerHTML = `
      <div>Profitez de ${reduction} de réduction:</div>
      <div class="promo-code">${promo.code}</div>
      <div class="name">${promo.message || ''}</div>
    `
    if (!eCard.querySelector('.wave')) {
      eCard.innerHTML += `
        <div class="wave"></div>
        <div class="wave"></div>
        <div class="wave"></div>
      `
    }
  } catch (e) {
    section.style.display = 'none'
  }
}

/* =========================================================================================================
   I N I T I A L I S A T I O N   D E S   C H A M P S   M A R Q U E / M O D È L E
========================================================================================================= */

function initialiserChampsMarqueModele(brands) {
  document.querySelectorAll('.productForm').forEach((form) => {
    const brandSelect = form.querySelector('.phoneBrand')
    const modelSelect = form.querySelector('.phoneModel')
    if (!brandSelect || !modelSelect) return
    brandSelect.innerHTML = '<option value="">Marque</option>'
    Object.keys(brands).forEach((brand) => {
      const option = document.createElement('option')
      option.value = brand
      option.textContent = brand
      brandSelect.appendChild(option)
    })
    modelSelect.innerHTML = '<option value="">Modèle</option>'
    modelSelect.disabled = true
    brandSelect.addEventListener('change', () => {
      const selectedBrand = brandSelect.value
      const models = brands[selectedBrand] || []
      modelSelect.innerHTML = '<option value="">Modèle</option>'
      models.forEach((model) => {
        const option = document.createElement('option')
        option.value = model
        option.textContent = model
        modelSelect.appendChild(option)
      })
      modelSelect.disabled = false
    })
  })
}

/* =========================================================================================================
   G E S T I O N   D U   B O U T O N   D E   P A I E M E N T   E T   D E   L ' A C C E P T A T I O N   D E S   C G V
========================================================================================================= */

document.addEventListener('DOMContentLoaded', function () {
  const checkbox = document.getElementById('checkbox-cgv')
  const payBtn = document.querySelector('.animated-button')
  if (payBtn && checkbox) {
    payBtn.disabled = true
    payBtn.classList.add('disabled')
    checkbox.addEventListener('change', function () {
      payBtn.disabled = !this.checked
      payBtn.classList.toggle('disabled', !this.checked)
    })
  }
})

/* =========================================================================================================
   F O N C T I O N   D E   S C R O L L   V E R S   L E   F O R M U L A I R E
========================================================================================================= */

function scrollToOrderForm() {
  const section = document.getElementById('orderFormSection')
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' })
  }
}

/* =========================================================================================================
   F O N C T I O N   D E   R E M P L I S S A G E   D E S   S E L E C T S   D E S   M A R Q U E S   E T   D E S   M O D E L E S
========================================================================================================= */

function remplirSelectsMarquesEtModeles(brands) {
  const brandSelect = document.getElementById('brandSelect')
  const modelSelect = document.getElementById('modelSelect')

  brandSelect.innerHTML = ''
  modelSelect.innerHTML = ''

  Object.keys(brands).forEach((brand) => {
    const option = document.createElement('option')
    option.value = brand
    option.textContent = brand
    brandSelect.appendChild(option)
  })

  brandSelect.addEventListener('change', () => {
    const selectedBrand = brandSelect.value
    const models = brands[selectedBrand] || []

    modelSelect.innerHTML = ''
    models.forEach((model) => {
      const option = document.createElement('option')
      option.value = model
      option.textContent = model
      modelSelect.appendChild(option)
    })
  })

  // Déclencher une première fois au chargement
  brandSelect.dispatchEvent(new Event('change'))
}

/* =========================================================================================================
   A F F I C H A G E   D U   P R E V I E W   D E   L ' I M A G E   U P L O A D É E
========================================================================================================= */

// Gestion globale du changement sur tous les champs imageUpload du document
document.addEventListener('change', function (e) {
  if (e.target.matches('.imageUpload')) {
    const input = e.target
    const label = input.closest('.upload-label')
    const preview = label.querySelector('.image-preview')

    if (input.files && input.files[0]) {
      const reader = new FileReader()
      reader.onload = function (e) {
        // Vide l'ancien contenu du preview
        preview.innerHTML = ''

        const img = new window.Image()
        img.onload = function () {
          // Ajoute l'image chargée dans le preview
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

/* =========================================================================================================
   G E S T I O N   D E   L A   S É L E C T I O N   D E   L A   P O L I C E   P E R S O N N A L I S É E
========================================================================================================= */

document.addEventListener('DOMContentLoaded', function () {
  // Liste des polices disponibles avec leur CSS associé
  const fonts = [
    { name: 'Sriracha', css: "'Sriracha', cursive" },
    { name: 'Vibur', css: "'Vibur', cursive" },
    { name: 'Yellowtail', css: "'Yellowtail', cursive" },
    { name: 'Zen Tokyo Zoo', css: "'Zen Tokyo Zoo', cursive" },
    { name: 'Source Sans 3', css: "'Source Sans 3', sans-serif" }
  ]

  // Fonction qui initialise le choix de police pour un formulaire donné
  function setupFontChoice(form) {
    const fontChoice = form.querySelector('select[name="fontChoice"]')
    const customText = form.querySelector('textarea[name="customText"]')

    if (!fontChoice || !customText) return

    // Réinitialise la liste des polices dans le select
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

    // Réinitialiser le style du textarea
    customText.style.fontFamily = ''

    // Mettre à jour dynamiquement lors d'un changement
    fontChoice.addEventListener('change', () => {
      const font = fonts.find((f) => f.name === fontChoice.value)
      customText.style.fontFamily = font ? font.css : ''
    })
  }

  // Initialisation sur tous les formulaires existants au chargement
  document.querySelectorAll('.productForm').forEach(setupFontChoice)

  // On expose la fonction globalement pour pouvoir l'appeler sur les nouveaux designs dynamiques
  window.setupFontChoice = setupFontChoice
})

/* =========================================================================================================
   G E S T I O N   D U   M U L T I - D E S I G N   (A J O U T / S U P P R E S S I O N  D E   F O R M U L A I R E S)
========================================================================================================= */

document.addEventListener('DOMContentLoaded', function () {
  // ➔ Ajout d'un design
  document
    .getElementById('addDesignButton')
    .addEventListener('click', function (e) {
      e.preventDefault()
      const designsContainer = document.getElementById('designsContainer')

      // Limite maximale de 6 designs
      const existingForms = designsContainer.querySelectorAll('.productForm')
      if (existingForms.length >= 6) {
        alert('Vous ne pouvez pas ajouter plus de 6 designs.')
        return
      }

      const firstForm = existingForms[0]
      if (!firstForm) return
      const newForm = firstForm.cloneNode(true)

      // Réinitialisation des champs
      Array.from(newForm.querySelectorAll('input, select, textarea')).forEach(
        (input) => {
          if (input.type === 'file') input.value = ''
          else if (input.type === 'checkbox' || input.type === 'radio')
            input.checked = false
          else input.value = ''
          if (input.classList.contains('phoneModel')) input.disabled = true
        }
      )

      // Suppression des téléphones supplémentaires
      const phonesContainer = newForm.querySelector('.phonesContainer')
      const phoneDivs = phonesContainer.querySelectorAll('.col-6')
      if (phoneDivs.length > 2) {
        phoneDivs.forEach((div, index) => {
          if (index >= 2) {
            div.remove()
          }
        })
      }

      // Reset image preview
      const preview = newForm.querySelector('.image-preview')
      if (preview) {
        preview.innerHTML = ''
        preview.style.backgroundImage = ''
        preview.style.display = 'none'
        newForm.querySelector('.upload-label').classList.remove('has-image')
      }

      // Réinitialiser dépendance marques / modèles
      if (typeof window.initPhoneBrandAndModel === 'function') {
        const brandSelect = phonesContainer.querySelector('.phoneBrand')
        const modelSelect = phonesContainer.querySelector('.phoneModel')
        window.initPhoneBrandAndModel(brandSelect, modelSelect)
      }

      // Ajout dans le DOM
      designsContainer.appendChild(newForm)

      // Réinitialiser les selects marque/modèle sur le nouveau formulaire
      if (
        typeof initialiserChampsMarqueModele === 'function' &&
        window.brandsData
      ) {
        initialiserChampsMarqueModele(window.brandsData)
      }
    })

  // ➔ Suppression d'un design
  document
    .getElementById('removeDesignButton')
    .addEventListener('click', function (e) {
      e.preventDefault()
      const designsContainer = document.getElementById('designsContainer')
      const existingForms = designsContainer.querySelectorAll('.productForm')

      if (existingForms.length <= 1) {
        alert('Vous ne pouvez pas supprimer le dernier design.')
        return
      }

      const lastForm = existingForms[existingForms.length - 1]
      lastForm.remove()
    })

  // ➔ Gestion ajout téléphone dans un design
  document
    .getElementById('designsContainer')
    .addEventListener('click', function (e) {
      if (e.target.closest('.addPhoneButton')) {
        e.preventDefault()
        const form = e.target.closest('form')
        const phonesContainer = form.querySelector('.phonesContainer')
        const firstBrandDiv = phonesContainer.querySelector('.col-6')
        const firstModelDiv = phonesContainer.querySelectorAll('.col-6')[1]
        const newBrandDiv = firstBrandDiv.cloneNode(true)
        const newModelDiv = firstModelDiv.cloneNode(true)

        newBrandDiv.querySelector('select').selectedIndex = 0
        newModelDiv.querySelector('select').innerHTML =
          '<option value="">Modèle</option>'
        newModelDiv.querySelector('select').selectedIndex = 0
        newModelDiv.querySelector('select').disabled = true

        phonesContainer.appendChild(newBrandDiv)
        phonesContainer.appendChild(newModelDiv)

        // Initialisation dynamique du couple marque/modèle
        if (typeof window.initPhoneBrandAndModel === 'function') {
          window.initPhoneBrandAndModel(
            newBrandDiv.querySelector('select'),
            newModelDiv.querySelector('select')
          )
        }
      }
    })

  // ➔ Gestion suppression téléphone
  document
    .getElementById('designsContainer')
    .addEventListener('click', function (e) {
      if (e.target.closest('.removePhoneButton')) {
        e.preventDefault()
        const form = e.target.closest('form')
        const phonesContainer = form.querySelector('.phonesContainer')
        const phoneDivs = phonesContainer.querySelectorAll('.col-6')

        if (phoneDivs.length <= 2) {
          alert('Vous ne pouvez pas supprimer le dernier téléphone.')
          return
        }

        // Supprime les deux derniers éléments (marque + modèle)
        phoneDivs[phoneDivs.length - 1].remove()
        phoneDivs[phoneDivs.length - 2].remove()
      }
    })

  // ➔ Gestion bouton d'upload (bouton custom)
  document
    .getElementById('designsContainer')
    .addEventListener('click', function (e) {
      if (e.target.closest('.uploadButton')) {
        e.preventDefault()
        const form = e.target.closest('form')
        const input = form.querySelector('.imageUpload')
        input.click()
      }
    })

  // ➔ Export des données de design pour soumission
  window.getAllDesignsData = function () {
    const designs = []
    document.querySelectorAll('.design-block .productForm').forEach((form) => {
      const phones = []
      form
        .querySelectorAll('.phonesContainer .col-6:nth-child(odd) select')
        .forEach((brandSelect, idx) => {
          const modelSelect = form.querySelectorAll(
            '.phonesContainer .col-6:nth-child(even) select'
          )[idx]
          phones.push({
            phoneBrand: brandSelect.value,
            phoneModel: modelSelect ? modelSelect.value : ''
          })
        })

      designs.push({
        phones,
        image: form.querySelector('.imageUpload').files[0] || null,
        customText: form.querySelector('.customText').value,
        fontChoice: form.querySelector('.fontChoice').value,
        quantity: form.querySelector('.qty').value
      })
    })
    return designs
  }
})

/* =========================================================================================================
   G E S T I O N   D U   C A L C U L   A U T O M A T I Q U E   D E   L A   Q U A N T I T É
========================================================================================================= */

document.addEventListener('DOMContentLoaded', function () {
  // Fonction pour mettre à jour la quantité d'un design en fonction du nombre de téléphones sélectionnés
  function updateQuantity(form) {
    const phonesContainer = form.querySelector('.phonesContainer')
    const quantityInput = form.querySelector('.qty')
    const phoneDivs = phonesContainer.querySelectorAll('.col-6')
    const numberOfPhones = phoneDivs.length / 2 // Chaque téléphone occupe 2 div (marque et modèle)
    const hasMultiplePhones = numberOfPhones > 1

    if (hasMultiplePhones) {
      // Plusieurs téléphones → on force la quantité égale au nombre de téléphones et on bloque le champ
      quantityInput.value = numberOfPhones.toString()
      quantityInput.disabled = true
      quantityInput.style.backgroundColor = '#f0f0f0'
      quantityInput.style.cursor = 'not-allowed'
    } else {
      // Un seul téléphone → on réactive la saisie libre
      quantityInput.disabled = false
      quantityInput.style.backgroundColor = ''
      quantityInput.style.cursor = ''
      if (quantityInput.value === '2') {
        quantityInput.value = '1'
      }
    }
  }

  // ➔ Observer l'ajout/suppression de design
  const designsContainer = document.getElementById('designsContainer')
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList') {
        document.querySelectorAll('.productForm').forEach(updateQuantity)
      }
    })
  })

  observer.observe(designsContainer, {
    childList: true,
    subtree: true
  })

  // ➔ Observer les clics d'ajout ou suppression de téléphones
  document.addEventListener('click', function (e) {
    if (
      e.target.closest('.addPhoneButton') ||
      e.target.closest('.removePhoneButton')
    ) {
      setTimeout(() => {
        document.querySelectorAll('.productForm').forEach(updateQuantity)
      }, 0)
    }
  })

  // ➔ Initialisation des quantités pour tous les designs existants au chargement
  document.querySelectorAll('.productForm').forEach(updateQuantity)
})

/* =========================================================================================================
   C H A R G E M E N T   D E S   M A R Q U E S   E T   M O D È L E S   (I N D É P E N D A N T)
========================================================================================================= */

async function chargerMarquesEtModeles() {
  try {
    const res = await fetch('/api/index-data')
    const data = await res.json()
    window.brandsData = data.brands || {}
    initialiserChampsMarqueModele(window.brandsData)
  } catch (e) {
    window.brandsData = {}
    initialiserChampsMarqueModele({})
  }
}

/* =========================================================================================================
   L A N C E M E N T   A U   C H A R G E M E N T   D E   L A   P A G E   I N D E X
========================================================================================================= */

document.addEventListener('DOMContentLoaded', function () {
  chargerMarquesEtModeles()
  afficherPromoEtEcard()
})

// Fonction utilitaire pour initialiser un couple marque/modèle dynamiquement
function initPhoneBrandAndModel(brandSelect, modelSelect) {
  if (!brandSelect || !modelSelect) return
  // Remplir les marques si vide
  if (brandSelect.options.length <= 1 && window.brandsData) {
    brandSelect.innerHTML = '<option value="">Marque</option>'
    Object.keys(window.brandsData).forEach((brand) => {
      const option = document.createElement('option')
      option.value = brand
      option.textContent = brand
      brandSelect.appendChild(option)
    })
  }
  // Reset modèle
  modelSelect.innerHTML = '<option value="">Modèle</option>'
  modelSelect.disabled = true
  // Supprimer anciens listeners
  brandSelect.onchange = null
  // Ajouter le listener
  brandSelect.addEventListener('change', () => {
    const selectedBrand = brandSelect.value
    const models = window.brandsData[selectedBrand] || []
    modelSelect.innerHTML = '<option value="">Modèle</option>'
    models.forEach((model) => {
      const option = document.createElement('option')
      option.value = model
      option.textContent = model
      modelSelect.appendChild(option)
    })
    modelSelect.disabled = false
  })
}
window.initPhoneBrandAndModel = initPhoneBrandAndModel
