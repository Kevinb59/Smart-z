document.addEventListener('DOMContentLoaded', function () {
  function attachUploadImageListener(form) {
    const input = form.querySelector('.imageUpload')
    const label = form.querySelector('.upload-label')
    const preview = label.querySelector('.image-preview')

    input.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        const file = this.files[0]
        const reader = new FileReader()
        reader.onload = function (e) {
          preview.style.backgroundImage = `url('${e.target.result}')`
          preview.style.display = 'block'
          label.classList.add('has-image')
        }
        reader.readAsDataURL(file)
      }
    })
  }

  // Ajout d'un design
  document
    .getElementById('addDesignButton')
    .addEventListener('click', function (e) {
      e.preventDefault()
      const designsContainer = document.getElementById('designsContainer')

      // Limite à 6 designs maximum (1 initial + 5 ajoutés)
      const existingForms = designsContainer.querySelectorAll('.productForm')
      if (existingForms.length >= 6) {
        alert('Vous ne pouvez pas ajouter plus de 6 designs.')
        return
      }

      const firstForm = existingForms[0]
      if (!firstForm) return
      const newForm = firstForm.cloneNode(true)

      // Réinitialise tous les champs
      Array.from(newForm.querySelectorAll('input, select, textarea')).forEach(
        (input) => {
          if (input.type === 'file') input.value = ''
          else if (input.type === 'checkbox' || input.type === 'radio')
            input.checked = false
          else input.value = ''
          if (input.classList.contains('phoneModel')) input.disabled = true
        }
      )

      // Supprimer les téléphones supplémentaires
      const phonesContainer = newForm.querySelector('.phonesContainer')
      const phoneDivs = phonesContainer.querySelectorAll('.col-6')
      if (phoneDivs.length > 2) {
        // Supprime tout sauf les deux premiers éléments (marque + modèle de base)
        phoneDivs.forEach((div, index) => {
          if (index >= 2) {
            div.remove()
          }
        })
      }

      // Réinitialise preview image
      const preview = newForm.querySelector('.image-preview')
      if (preview) {
        preview.innerHTML = ''
        preview.style.backgroundImage = ''
        preview.style.display = 'none'
        newForm.querySelector('.upload-label').classList.remove('has-image')
      }

      // Réinitialiser la dépendance marque/modèle
      if (typeof window.initPhoneBrandAndModel === 'function') {
        const brandSelect = phonesContainer.querySelector('.phoneBrand')
        const modelSelect = phonesContainer.querySelector('.phoneModel')
        window.initPhoneBrandAndModel(brandSelect, modelSelect)
      }

      // Ajouter à la page
      designsContainer.appendChild(newForm)

      // Reconnecter le script d'upload image
      attachUploadImageListener(newForm)

      // Reconnecter la sélection de police personnalisée
      if (typeof window.setupFontChoice === 'function') {
        window.setupFontChoice(newForm)
      }
    })

  // Suppression d'un design
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

  // Gestion ajout téléphone
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

        if (typeof window.initPhoneBrandAndModel === 'function') {
          window.initPhoneBrandAndModel(
            newBrandDiv.querySelector('select'),
            newModelDiv.querySelector('select')
          )
        }
      }
    })

  // Gestion suppression téléphone
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

  // Gestion bouton d'upload
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

  // Initialiser listeners sur premier formulaire
  document.querySelectorAll('.productForm').forEach((form) => {
    attachUploadImageListener(form)
  })

  // Pour soumission
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
