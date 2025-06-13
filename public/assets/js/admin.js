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
document.addEventListener('DOMContentLoaded', async function (event) {
  await loadData() // Charge les données au démarrage
  const select = document.getElementById('brandSelect')
  const newModel = document.getElementById('newModel')
  const addModelBtn = document.getElementById('addModelBtn')
  const deleteBrandBtn = document.getElementById('deleteBrandBtn')
  const updateBtn = document.getElementById('updatePromosBtn')

  // Désactive les champs/boutons au départ
  if (newModel) newModel.disabled = true
  if (addModelBtn) addModelBtn.disabled = true
  if (deleteBrandBtn) deleteBrandBtn.disabled = true

  // Écouteur d'événement pour le changement de sélection de marque
  if (select) {
    select.addEventListener('change', function () {
      const selected = this.value
      newModel.disabled = !selected
      addModelBtn.disabled = !selected
      deleteBrandBtn.disabled = !selected
      updateModelList() // Met à jour la liste des modèles
    })
  }

  // Ajoute un écouteur sur tous les selects de statut de commande
  document.body.addEventListener('change', async function (e) {
    if (e.target.classList.contains('status-select')) {
      const orderId = e.target.getAttribute('data-id')
      const newStatus = e.target.value
      e.target.disabled = true
      try {
        await updateOrderStatus(orderId, newStatus)
        alert('Statut mis à jour dans la base de données.')
        await fetchOrders() // Recharge l'affichage si besoin
      } catch (err) {
        alert('Erreur lors de la mise à jour du statut.')
      }
      e.target.disabled = false
    }
  })

  // Gestion du bouton de mise à jour des promos
  if (updateBtn) {
    updateBtn.addEventListener('click', async function (e) {
      e.preventDefault()
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

  // Gestion des boutons de changement d'état des promotions (déléguée après remplissage)
  // (Le code d'origine dans remplirPromoTable reste inchangé car il gère déjà la désactivation)
})

// ====================
// CHARGEMENT DES DONNÉES
// ====================
async function loadData(selectedBrand = null) {
  try {
    const data = await fetchBrandsAndModels()
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
// GESTION DES COMMANDES (STATUT)
// ====================
async function fetchOrders() {
  const snapshot = await db.collection('commandes').get()
  return snapshot.docs.map((doc) => doc.data())
}
async function updateOrderStatus(orderId, newStatus) {
  await db.collection('commandes').doc(orderId).update({ status: newStatus })
  // Appel API pour envoyer un mail au client (adapter l'URL si besoin)
  await fetch('/api/send-status-mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, newStatus })
  })
}

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
const API_PROMO_BANNER = '/api/promo-banner' // URL de l'API pour la bannière promo

async function loadPromoAdmin() {
  // Charger les codes promo depuis Stripe via l'API
  let codes = {}
  let promos = []
  try {
    const res = await fetch('/api/stripe-promos', { method: 'POST' })
    const data = await res.json()
    if (data.success && Array.isArray(data.promos)) {
      promos = data.promos
      // On crée un objet codes pour compatibilité avec le reste du code
      codes = Object.fromEntries(
        data.promos.map((p) => [
          p.promotion_code.code,
          {
            type: p.coupon.percent_off ? 'percent' : 'amount',
            value:
              p.coupon.percent_off ||
              (p.coupon.amount_off ? p.coupon.amount_off / 100 : 0)
          }
        ])
      )
      remplirPromoTable(data.promos)
    }
  } catch (e) {
    alert('Erreur lors du chargement des codes promo Stripe.')
  }
  // Charger la bannière
  let banner = await fetchPromoBanner()
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
    select.appendChild(opt)
  })
  select.value = banner && banner.code ? banner.code : ''
  document.getElementById('promoCode').value =
    banner && banner.code ? banner.code : ''
  document.getElementById('promoMessage').value =
    banner && banner.message ? banner.message : ''
  document.getElementById('promoToggle').checked = !!(banner && banner.active)
}

async function savePromoAdmin() {
  // Les codes sont déjà chargés via loadPromoAdmin (issus de Stripe)
  const code = document.getElementById('promoSelect').value
  const message = document.getElementById('promoMessage').value
  const active = document.getElementById('promoToggle').checked

  if (!code) return alert('Sélectionnez un code promo.')
  // On récupère le type et la valeur depuis le select (chargé via Stripe)
  const opt = document.querySelector(`#promoSelect option[value='${code}']`)
  let type = 'percent',
    value = 0
  if (opt && opt.textContent.includes('%')) {
    type = 'percent'
    value = parseFloat(opt.textContent.match(/\((\d+)%\)/)?.[1] || '0')
  } else if (opt && opt.textContent.includes('€')) {
    type = 'amount'
    value = parseFloat(
      opt.textContent.match(/\((\d+(?:[\.,]\d+)?)€\)/)?.[1].replace(',', '.') ||
        '0'
    )
  }

  const res = await fetch(API_PROMO_BANNER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
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

// --- FIRESTORE : Commandes ---
async function fetchOrders() {
  const snapshot = await db.collection('commandes').get()
  return snapshot.docs.map((doc) => doc.data())
}
async function updateOrderStatus(orderId, newStatus) {
  await db.collection('commandes').doc(orderId).update({ status: newStatus })
  // Appel API pour envoyer un mail au client (adapter l'URL si besoin)
  await fetch('/api/send-status-mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, newStatus })
  })
}

// --- FIRESTORE : Marques/Modèles ---
async function fetchBrandsAndModels() {
  const doc = await db.collection('phones').doc('phonesData').get()
  if (doc.exists) return doc.data().brands
  return {}
}
async function addBrand(brandName) {
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  brands[brandName] = []
  await docRef.update({ brands })
}
async function addModel(brandName, modelName) {
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  if (!brands[brandName]) brands[brandName] = []
  brands[brandName].push(modelName)
  await docRef.update({ brands })
}
async function deleteBrand(brandName) {
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  delete brands[brandName]
  await docRef.update({ brands })
}
async function deleteModel(brandName, modelName) {
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  if (brands[brandName]) {
    brands[brandName] = brands[brandName].filter((m) => m !== modelName)
    await docRef.update({ brands })
  }
}

// --- FIRESTORE : Promo Banner ---
async function fetchPromoBanner() {
  const doc = await db.collection('config').doc('promoBanner').get()
  return doc.exists ? doc.data() : null
}
async function updatePromoBanner(data) {
  await db.collection('config').doc('promoBanner').set(data)
}

// Fonctions Firestore pour les opérations CRUD
async function addBrandFirestore(brandName) {
  await addBrand(brandName)
}
async function addModelFirestore(brandName, modelName) {
  await addModel(brandName, modelName)
}
async function deleteBrandFirestore(brandName) {
  await deleteBrand(brandName)
}
async function deleteModelFirestore(brandName, modelName) {
  await deleteModel(brandName, modelName)
}
