document.addEventListener('DOMContentLoaded', async function () {
  // On utilise Firestore pour charger les marques et modèles
  const brands = await fetchBrandsAndModels()

  // Fonction d'initialisation pour une paire de selects
  window.initPhoneBrandAndModel = function (brandSelect, modelSelect) {
    // Remplir les marques si vide
    if (brandSelect.options.length <= 1) {
      Object.keys(brands).forEach((brand) => {
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
      if (selectedBrand && brands[selectedBrand]) {
        modelSelect.disabled = false
        brands[selectedBrand].forEach((model) => {
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

// Remplacement de la récupération locale par Firestore
async function fetchBrandsAndModels() {
  const doc = await db.collection('phones').doc('phonesData').get()
  if (doc.exists) {
    return doc.data().brands
  }
  return {}
}

// Exemple d'utilisation pour remplir le select
async function populateBrands() {
  const brands = await fetchBrandsAndModels()
  const brandSelects = document.querySelectorAll('.phoneBrand')
  brandSelects.forEach((select) => {
    select.innerHTML = '<option value="">Marque</option>'
    Object.keys(brands).forEach((brand) => {
      const option = document.createElement('option')
      option.value = brand
      option.textContent = brand
      select.appendChild(option)
    })
  })
}
