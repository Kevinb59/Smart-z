// admin.js

// ====================
// CONSTANTES ET VARIABLES
// ====================
// SUPPRIMER const API_BRANDS_MODELS = '/api/brands-models'
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
  const loadPromosBtn = document.getElementById('loadPromosBtn')

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

  // Gestion du bouton de chargement des promos
  if (loadPromosBtn) {
    loadPromosBtn.addEventListener('click', async function (e) {
      e.preventDefault()
      this.disabled = true
      this.textContent = 'Chargement...'
      await loadPromoAdmin()
      this.disabled = false
      this.textContent = '🔄 CHARGER CODES PROMO'
    })
  }

  // NE PAS appeler loadPromoAdmin ici !
  // Les codes promo ne doivent être affichés qu'après clic sur le bouton

  // Gestion des boutons de changement d'état des promotions (déléguée après remplissage)
  // (Le code d'origine dans remplirPromoTable reste inchangé car il gère déjà la désactivation)

  // Ajout du handler pour la suppression de marque
  if (deleteBrandBtn) {
    deleteBrandBtn.addEventListener('click', async function (e) {
      e.preventDefault()
      const brand = select.value
      if (!brand) {
        alert('Veuillez sélectionner une marque à supprimer.')
        return
      }
      if (!confirm(`Supprimer la marque "${brand}" et tous ses modèles ?`))
        return
      await deleteBrand(brand)
      await loadData()
      select.value = ''
      updateModelList()
      newModel.disabled = true
      addModelBtn.disabled = true
      deleteBrandBtn.disabled = true
    })
  }
})

// ====================
// CHARGEMENT DES DONNÉES
// ====================
async function loadData(selectedBrand = null) {
  try {
    const data = await fetchBrandsAndModels() // Firestore
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
    document.getElementById('loading').textContent = 'Erreur de chargement.'
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
  // Récupérer la commande complète depuis Firestore
  const docRef = db.collection('commandes').doc(orderId)
  const doc = await docRef.get()
  if (!doc.exists) throw new Error('Commande introuvable')

  const commande = doc.data()

  // Déterminer la nouvelle valeur de lastStatusMailed
  let lastStatusMailed = commande.lastStatusMailed
  if (newStatus === 'En cours') lastStatusMailed = 'InProgress'
  else if (newStatus === 'Envoyée') lastStatusMailed = 'Send'
  else if (newStatus === 'Annulée') lastStatusMailed = 'Annulée'
  else if (newStatus === 'Archivée')
    lastStatusMailed = commande.lastStatusMailed
  else lastStatusMailed = null

  // Mettre à jour Firestore
  await docRef.update({ status: newStatus, lastStatusMailed })

  // Mise à jour locale avant l'envoi
  commande.status = newStatus
  commande.lastStatusMailed = lastStatusMailed

  if (newStatus === 'En cours' || newStatus === 'Envoyée') {
    try {
      await fetch('/api/send-status-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commande)
      })
    } catch (e) {
      console.error("Erreur d'appel à l'API :", e)
    }
  }
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
const API_PROMO_BANNER = null // On n'utilise plus d'API ni de JSON local

async function fetchPromoBanner() {
  const doc = await db.collection('config').doc('promoBanner').get()
  return doc.exists ? doc.data() : null
}
async function updatePromoBanner(data) {
  await db.collection('config').doc('promoBanner').set(data)
}

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
    }
  } catch (e) {
    alert('Erreur lors du chargement des codes promo Stripe.')
  }
  // Charger la bannière depuis Firestore
  let banner = await fetchPromoBanner()

  // Remplir le tableau des codes promo
  remplirPromoTable(promos)

  // Pré-remplir les champs avec la bannière Firestore
  const select = document.getElementById('promoSelect')
  select.value = banner && banner.code ? banner.code : ''
  document.getElementById('promoCode').value =
    banner && banner.code ? banner.code : ''
  document.getElementById('promoMessage').value =
    banner && banner.message ? banner.message : ''
  document.getElementById('promoToggle').checked = !!(banner && banner.show)
}

async function savePromoAdmin() {
  const code = document.getElementById('promoSelect').value
  const message = document.getElementById('promoMessage').value
  const show = document.getElementById('promoToggle').checked
  if (!code) return alert('Sélectionnez un code promo.')
  // On récupère le type et la valeur depuis la selectbox
  const opt = document.querySelector(`#promoSelect option[value='${code}']`)
  let type = 'percent',
    value = 0
  if (opt && opt.textContent.includes('%')) {
    type = 'percent'
    value = parseFloat(opt.textContent.match(/(\d+)%/)?.[1] || '0')
  } else if (opt && opt.textContent.includes('€')) {
    type = 'amount'
    value = parseFloat(
      opt.textContent.match(/(\d+(?:[\.,]\d+)?)€/)?.[1].replace(',', '.') || '0'
    )
  }
  await updatePromoBanner({ code, message, show, type, value })
  alert('Bannière promo mise à jour !')
  await loadPromoAdmin()
}

// ====================
// FIRESTORE : Marques/Modèles
// ====================
async function fetchBrandsAndModels() {
  const doc = await db.collection('phones').doc('phonesData').get()
  if (doc.exists) return doc.data().brands
  return {}
}
async function addBrand(brandName) {
  if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
    alert('Veuillez entrer un nom de marque valide.')
    return
  }
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  if (brands[brandName]) {
    alert('Cette marque existe déjà.')
    return
  }
  brands[brandName] = []
  // Nettoyage
  Object.keys(brands).forEach((k) => {
    brands[k] = (brands[k] || []).filter((v) => typeof v === 'string' && v)
  })
  await docRef.update({ brands })
  alert('Marque ajoutée avec succès !')
  await loadData()
}
async function addModel(brandName, modelName) {
  if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
    alert("Veuillez sélectionner une marque valide avant d'ajouter un modèle.")
    return
  }
  if (!modelName || typeof modelName !== 'string' || !modelName.trim()) {
    alert('Veuillez entrer un nom de modèle valide.')
    return
  }
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  if (!brands[brandName]) brands[brandName] = []
  if (brands[brandName].includes(modelName)) {
    alert('Ce modèle existe déjà pour cette marque.')
    return
  }
  brands[brandName].push(modelName)
  // Nettoyage
  Object.keys(brands).forEach((k) => {
    brands[k] = (brands[k] || []).filter((v) => typeof v === 'string' && v)
  })
  await docRef.update({ brands })
  alert('Modèle ajouté avec succès !')
  await loadData()
}
async function deleteBrand(brandName) {
  if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
    alert('Veuillez sélectionner une marque à supprimer.')
    return
  }
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  if (!brands[brandName]) {
    alert('Marque introuvable.')
    return
  }
  delete brands[brandName]
  // Nettoyage
  Object.keys(brands).forEach((k) => {
    brands[k] = (brands[k] || []).filter((v) => typeof v === 'string' && v)
  })
  await docRef.update({ brands })
  alert('Marque supprimée avec succès !')
  await loadData()
}
async function deleteModel(brandName, modelName) {
  if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
    alert('Veuillez sélectionner une marque valide.')
    return
  }
  if (!modelName || typeof modelName !== 'string' || !modelName.trim()) {
    alert('Veuillez sélectionner un modèle à supprimer.')
    return
  }
  const docRef = db.collection('phones').doc('phonesData')
  const doc = await docRef.get()
  let brands = doc.data().brands || {}
  if (brands[brandName]) {
    brands[brandName] = brands[brandName].filter((m) => m !== modelName)
    // Nettoyage
    Object.keys(brands).forEach((k) => {
      brands[k] = (brands[k] || []).filter((v) => typeof v === 'string' && v)
    })
    await docRef.update({ brands })
    alert('Modèle supprimé avec succès !')
    await loadData()
  }
}

// ====================
// FIRESTORE : Promo Banner ---
// ====================
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

// ====================
// GÉNÉRATION DES IDs DE COMMANDE
// ====================
async function generateOrderId(isMultiple = false, baseId = null) {
  const ordersRef = db.collection('commandes')
  let lastOrder = null

  if (isMultiple && baseId) {
    // Pour les commandes multiples, on cherche le dernier suffixe
    const snapshot = await ordersRef
      .where('baseId', '==', baseId)
      .orderBy('id', 'desc')
      .limit(1)
      .get()

    if (!snapshot.empty) {
      lastOrder = snapshot.docs[0].data()
      const lastSuffix = parseInt(lastOrder.id.split('-')[1])
      return `${baseId}-${lastSuffix + 1}`
    }
    return `${baseId}-1`
  } else {
    // Pour une nouvelle commande, on cherche la dernière commande
    const snapshot = await ordersRef.orderBy('id', 'desc').limit(1).get()

    if (!snapshot.empty) {
      lastOrder = snapshot.docs[0].data()
      const lastId = lastOrder.id.split('-')[0] // Enlève le suffixe si présent
      const lastLetter = lastId[0]
      const lastNumber = parseInt(lastId.substring(1))

      if (lastNumber >= 999) {
        // Si on atteint 999, on passe à la lettre suivante
        const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1)
        return `${nextLetter}001`
      }
      return `${lastLetter}${(lastNumber + 1).toString().padStart(3, '0')}`
    }
    return 'A001' // Première commande
  }
}
