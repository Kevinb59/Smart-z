// admin.js

// ====================
// CONSTANTES ET VARIABLES
// ====================
const API_BRANDS_MODELS = '/api/brands-models' // URL de l'API pour les marques et modèles
let allData = {} // Stocke toutes les données des marques et modèles
let lastPromos = [] // Stocke les dernières promotions récupérées

// ====================
// INITIALISATION ET GESTION DES ÉVÉNEMENTS
// ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadData() // Charge les données au démarrage
  const select = document.getElementById('brandSelect')
  const newModel = document.getElementById('newModel')
  const addModelBtn = document.getElementById('addModelBtn')
  const deleteBrandBtn = document.getElementById('deleteBrandBtn')

  // Désactive les champs/boutons au départ
  newModel.disabled = true
  addModelBtn.disabled = true
  deleteBrandBtn.disabled = true

  // Écouteur d'événement pour le changement de sélection de marque
  select.addEventListener('change', function () {
    const selected = this.value
    newModel.disabled = !selected
    addModelBtn.disabled = !selected
    deleteBrandBtn.disabled = !selected
    updateModelList() // Met à jour la liste des modèles
  })
})

// ====================
// CHARGEMENT DES DONNÉES
// ====================
async function loadData(selectedBrand = null) {
  try {
    const response = await fetch(API_BRANDS_MODELS)
    const data = await response.json()
    allData = data // Stocke les données récupérées
    const select = document.getElementById('brandSelect')
    const loading = document.getElementById('loading')
    const current = selectedBrand || select.value

    // Remplit le sélecteur de marques
    select.innerHTML = '<option value="">-- Sélectionner --</option>'
    Object.keys(data).forEach((brand) => {
      const option = document.createElement('option')
      option.value = brand
      option.textContent = brand
      select.appendChild(option)
    })
    select.value = current && data[current] ? current : ''
    loading.style.display = 'none' // Cache le message de chargement
    updateModelList() // Met à jour la liste des modèles
  } catch (error) {
    console.error('Erreur :', error)
    document.getElementById('loading').textContent = 'Erreur de chargement.' // Affiche une erreur
  }
}

// ====================
// MISE À JOUR DE LA LISTE DES MODÈLES
// ====================
function updateModelList() {
  const selectedBrand = document.getElementById('brandSelect').value
  const modelList = document.getElementById('modelList')
  modelList.innerHTML = '' // Réinitialise la liste des modèles

  if (selectedBrand && allData[selectedBrand]) {
    allData[selectedBrand].forEach((modele) => {
      const li = document.createElement('li')
      li.innerHTML = `
        <span class="model-name">${modele}</span>
        <button class="delete-model" onclick="deleteModel('${selectedBrand}', '${modele.replace(
        /'/g,
        "\\'"
      )}')" title="Supprimer">❌</button>
      `
      modelList.appendChild(li) // Ajoute le modèle à la liste
    })
  }
}

// ====================
// AJOUT D'UNE MARQUE
// ====================
window.addBrand = async function addBrand() {
  const marque = document.getElementById('newBrand').value.trim()
  if (!marque) return alert('Veuillez entrer un nom de marque.')
  if (!confirm(`Confirmer l'ajout de la marque "${marque}" ?`)) return

  const res = await fetch(API_BRANDS_MODELS, {
    method: 'POST',
    body: JSON.stringify({ type: 'addBrand', marque }),
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  alert(data.message || data.error)

  // Ajout dynamique
  allData[marque] = []
  const select = document.getElementById('brandSelect')
  const option = document.createElement('option')
  option.value = marque
  option.textContent = marque
  select.appendChild(option)
  select.value = marque
  document.getElementById('newBrand').value = '' // Réinitialise le champ de saisie
  select.dispatchEvent(new Event('change')) // Déclenche l'événement de changement
}

// ====================
// SUPPRESSION D'UNE MARQUE
// ====================
window.deleteBrand = async function deleteBrand() {
  const select = document.getElementById('brandSelect')
  const marque = select.value
  if (!marque) return
  if (!confirm(`Confirmer la suppression de la marque "${marque}" ?`)) return

  const res = await fetch(API_BRANDS_MODELS, {
    method: 'POST',
    body: JSON.stringify({ type: 'deleteBrand', marque }),
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  alert(data.message || data.error)

  // Suppression dynamique
  delete allData[marque]
  const idx = select.selectedIndex
  select.remove(idx)
  select.value = ''
  select.dispatchEvent(new Event('change')) // Déclenche l'événement de changement
}

// ====================
// AJOUT D'UN MODÈLE
// ====================
window.addModel = async function addModel() {
  const marque = document.getElementById('brandSelect').value
  const modele = document.getElementById('newModel').value.trim()
  if (!marque || !modele) return
  if (
    !confirm(
      `Confirmer l'ajout du modèle "${modele}" à la marque "${marque}" ?`
    )
  )
    return

  const res = await fetch(API_BRANDS_MODELS, {
    method: 'POST',
    body: JSON.stringify({ type: 'addModel', marque, modele }),
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  alert(data.message || data.error)

  // Ajout dynamique
  if (!allData[marque]) allData[marque] = []
  allData[marque].push(modele)
  updateModelList() // Met à jour la liste des modèles
  document.getElementById('newModel').value = '' // Réinitialise le champ de saisie
}

// ====================
// SUPPRESSION D'UN MODÈLE
// ====================
window.deleteModel = async function deleteModel(marque, modele) {
  if (
    !confirm(
      `Confirmer la suppression du modèle "${modele}" de la marque "${marque}" ?`
    )
  )
    return

  const res = await fetch(API_BRANDS_MODELS, {
    method: 'POST',
    body: JSON.stringify({ type: 'deleteModel', marque, modele }),
    headers: { 'Content-Type': 'application/json' }
  })
  const data = await res.json()
  alert(data.message || data.error)

  // Suppression dynamique
  if (allData[marque]) {
    allData[marque] = allData[marque].filter((m) => m !== modele)
    updateModelList() // Met à jour la liste des modèles
  }
}

// ====================
// GESTION DES PROMOTIONS
// ====================
document.addEventListener('DOMContentLoaded', function () {
  const updateBtn = document.getElementById('updatePromosBtn')
  if (updateBtn) {
    updateBtn.addEventListener('click', async function () {
      this.disabled = true
      this.textContent = 'Mise à jour...'
      try {
        const res = await fetch('/api/stripe-promos', { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          alert('Codes promo mis à jour avec succès !')
          remplirPromoTable(data.promos) // Remplit la table avec les nouvelles promotions
        } else {
          alert('Erreur : ' + (data.error || 'Impossible de mettre à jour.'))
        }
      } catch (e) {
        alert('Erreur réseau ou serveur.')
      }
      this.disabled = false
      this.textContent = '🔄 MAJ codes promo'
    })
  }
})

// ====================
// REMPLISSAGE DE LA TABLE DES PROMOTIONS
// ====================
function remplirPromoTable(promos) {
  lastPromos = promos // Stocke les dernières promotions
  const tbody = document.querySelector('#promoTable tbody')
  tbody.innerHTML = '' // Réinitialise le corps de la table

  if (!promos || !Array.isArray(promos) || promos.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">Aucune promotion trouvée</td></tr>'
    return
  }

  promos.forEach((promo, idx) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${promo.coupon.name}</td>
      <td>${promo.promotion_code.code}</td>
      <td>${promo.promotion_code.times_redeemed || 0}</td>
      <td><button class="toggle-active promobutton" data-idx="${idx}">${
      promo.promotion_code.active ? '✅' : '❌'
    }</button></td>
    `
    tbody.appendChild(tr) // Ajoute la ligne à la table
  })

  // Gestion des boutons de changement d'état des promotions
  document.querySelectorAll('.toggle-active').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const idx = this.getAttribute('data-idx')
      const promo = lastPromos[idx]
      const newActive = !promo.promotion_code.active
      this.disabled = true
      this.textContent = '...'
      try {
        const res = await fetch('/api/stripe-toggle-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: promo.promotion_code.code,
            active: newActive
          })
        })
        const data = await res.json()
        if (data.success) {
          promo.promotion_code.active = newActive // Met à jour l'état de la promotion
          this.textContent = newActive ? '✅' : '❌'
        } else {
          alert('Erreur : ' + (data.error || 'Impossible de modifier.'))
          this.textContent = promo.promotion_code.active ? '✅' : '❌'
        }
      } catch (e) {
        alert('Erreur réseau ou serveur.')
        this.textContent = promo.promotion_code.active ? '✅' : '❌'
      }
      this.disabled = false
    })
  })
  remplirPromoSelect(promos) // Remplit le sélecteur de promotions
}

// ====================
// REMPLISSAGE DU SÉLECTEUR DE PROMOTIONS
// ====================
function remplirPromoSelect(promos) {
  const select = document.getElementById('promoSelect')
  select.innerHTML =
    '<option value="">-- Sélectionner une promotion --</option>'
  const uniqueCoupons = []
  const seen = new Set()

  promos.forEach((p) => {
    if (p.coupon && p.coupon.name && !seen.has(p.coupon.name)) {
      uniqueCoupons.push(p.coupon)
      seen.add(p.coupon.name)
    }
  })

  uniqueCoupons.forEach((coupon) => {
    const opt = document.createElement('option')
    opt.value = coupon.name
    opt.textContent = coupon.name
    select.appendChild(opt) // Ajoute l'option au sélecteur
  })

  // Écouteur d'événement pour le changement de sélection
  select.onchange = function () {
    const val = this.value
    if (!val) {
      document.getElementById('promoCode').value = ''
      return
    }
    const found = lastPromos.find((p) => p.coupon.name === val)
    document.getElementById('promoCode').value = found
      ? found.promotion_code.code
      : ''
  }
}

// ====================
// GESTION DE LA BANNIÈRE PROMO
// ====================
const API_PROMO_CODES = '/api/promo-codes' // URL de l'API pour les codes promo
const API_PROMO_BANNER = '/api/promo-banner' // URL de l'API pour la bannière promo

async function loadPromoAdmin() {
  const token = localStorage.getItem('token')
  // Charger les codes
  let codes = null
  try {
    const res = await fetch(API_PROMO_CODES, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Erreur API promo-codes: ' + res.status)
    codes = await res.json()
  } catch (e) {
    console.error('Erreur lors du chargement des codes promo:', e)
    return // Stop si erreur
  }
  if (!codes || codes.error) return // Stop si erreur ou vide
  // Charger la bannière
  let banner = {}
  try {
    const bannerRes = await fetch(API_PROMO_BANNER, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (bannerRes.ok) banner = await bannerRes.json()
  } catch (e) {
    banner = {}
  }

  const select = document.getElementById('promoSelect')
  select.innerHTML =
    '<option value="">-- Sélectionner une promotion --</option>'
  Object.entries(codes).forEach(([code, obj]) => {
    const opt = document.createElement('option')
    opt.value = code
    let label = code
    if (obj && obj.type && obj.value !== undefined && !isNaN(obj.value)) {
      label +=
        obj.type === 'percent'
          ? ` (${obj.value}%)`
          : ` (${Number(obj.value).toFixed(2)}€)`
    }
    opt.textContent = label
    select.appendChild(opt) // Ajoute l'option au sélecteur
  })

  // Sélectionne le code de la bannière
  select.value = banner.code || ''
  document.getElementById('promoCode').value = banner.code || ''
  document.getElementById('promoMessage').value = banner.message || ''
  document.getElementById('promoToggle').checked = !!banner.active
}

async function savePromoAdmin() {
  const token = localStorage.getItem('token')
  const codesRes = await fetch(API_PROMO_CODES, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const codes = await codesRes.json()
  const code = document.getElementById('promoSelect').value
  const message = document.getElementById('promoMessage').value
  const active = document.getElementById('promoToggle').checked

  if (!code) return alert('Sélectionnez un code promo.')
  const obj = codes[code]
  if (!obj) return alert('Code promo inconnu.')

  const type = obj.type
  const value = obj.value

  const res = await fetch(API_PROMO_BANNER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ active, code, message, type, value })
  })
  const data = await res.json()
  if (data.success) {
    loadPromoAdmin() // Recharge les données de la bannière
  } else {
    alert(data.error || 'Erreur lors de la mise à jour.')
  }
}
