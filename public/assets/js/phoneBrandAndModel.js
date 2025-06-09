document.addEventListener('DOMContentLoaded', async function () {
  let models = {}
  try {
    const response = await fetch('/api/brands-models')
    models = await response.json()
  } catch (error) {
    console.error(
      '❌ Erreur lors du chargement des marques et modèles :',
      error
    )
    return
  }

  // Fonction d'initialisation pour une paire de selects
  window.initPhoneBrandAndModel = function (brandSelect, modelSelect) {
    // Remplir les marques si vide
    if (brandSelect.options.length <= 1) {
      Object.keys(models).forEach((brand) => {
        const option = document.createElement('option')
        option.value = brand
        option.textContent = brand
        brandSelect.appendChild(option)
      })
    }
    // Reset modèle au changement de marque
    brandSelect.addEventListener('change', function () {
      modelSelect.innerHTML = '<option value="">Sélectionnez un modèle</option>'
      modelSelect.disabled = true
      const selectedBrand = this.value
      if (selectedBrand && models[selectedBrand]) {
        modelSelect.disabled = false
        models[selectedBrand].forEach((model) => {
          const option = document.createElement('option')
          option.value = model
          option.textContent = model
          modelSelect.appendChild(option)
        })
      }
    })
  }

  // Initialiser toutes les paires déjà présentes
  document.querySelectorAll('.phonesContainer').forEach((container) => {
    const brandSelect = container.querySelector('.phoneBrand')
    const modelSelect = container.querySelector('.phoneModel')
    if (brandSelect && modelSelect) {
      window.initPhoneBrandAndModel(brandSelect, modelSelect)
    }
  })
})
