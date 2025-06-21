/* =========================================================================================================
   F O N C T I O N S   D E   L ' A D M I N   F R O N T E N D
   =========================================================================================================
   Cette page centralise :
   - Le chargement des marques et modèles (phonesData)
   - Le chargement des commandes (commandes)
   - Le chargement de la bannière promotionnelle (promoBanner)
   - La gestion des boutons de changement d'état des promotions
   - La gestion des boutons de chargement des promos
   - La gestion des boutons de sauvegarde de la bannière promo
   ========================================================================================================= */

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

  // Gestion des boutons de changement d'état des promotions

  // Ajout du handler pour la suppression de marque
  if (deleteBrandBtn) {
    deleteBrandBtn.addEventListener('click', async function (e) {
      e.preventDefault()
      const brand = select.value
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
        const res = await fetch('/api/admin-data', {
          method: 'POST',
          headers: addAuthHeader({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            action: 'stripe-toggle-promo',
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
    const res = await fetch('/api/admin-data', {
      method: 'POST',
      headers: addAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'stripe-promos' })
    })
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

  // Message de confirmation avant ajout
  const confirmation = confirm(
    `Êtes-vous sûr de vouloir créer la marque suivante : ${brandName} ?`
  )
  if (!confirmation) {
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

  // Message de confirmation avant ajout
  const confirmation = confirm(
    `Êtes-vous sûr de vouloir ajouter le modèle ${modelName} à la marque ${brandName} ?`
  )
  if (!confirmation) {
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
  await loadData()
}
async function deleteBrand(brandName) {
  // Message de confirmation avant suppression
  const confirmation = confirm(
    `Êtes-vous sûr de vouloir supprimer la marque ${brandName} ainsi que tout ses modèles ?`
  )
  if (!confirmation) {
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

  // Message de confirmation avant suppression
  const confirmation = confirm(
    `Êtes-vous sûr de vouloir supprimer le modèle ${modelName} de la marque ${brandName} ?`
  )
  if (!confirmation) {
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
async function fetchCommandes() {
  // Utilise Firestore pour récupérer les commandes
  const snapshot = await db.collection('commandes').get()
  const commandes = snapshot.docs.map((doc) => doc.data())

  // 🔁 Vide les 3 zones d'affichage
  document.querySelector('#nouvelles .orders').innerHTML = ''
  document.querySelector('#encours .orders').innerHTML = ''
  document.querySelector('#archivees .orders').innerHTML = ''

  // 🔁 Affiche chaque commande
  commandes.forEach((cmd) => {
    const prix = (cmd.amountPaid / 100).toFixed(2) + '€'
    const idCommande = cmd.id || 'Non défini'
    const nomClient = `${cmd.firstName} ${cmd.lastName}`
    // Statuts et transitions autorisées
    const status = cmd.status
    let statusOptions = []
    if (status === 'En attente') statusOptions = ['En cours', 'Annulée']
    else if (status === 'En cours') statusOptions = ['Envoyée']
    else if (status === 'Envoyée') statusOptions = ['Archivée']
    else if (status === 'Archivée') statusOptions = []
    else if (status === 'Annulée') statusOptions = ['En cours']
    // Toujours afficher le statut actuel comme sélectionné
    const allStatus = [
      'En attente',
      'En cours',
      'Envoyée',
      'Archivée',
      'Annulée'
    ]
    const statusSelect = `
      <select class="status-select" data-id="${idCommande}" ${
      statusOptions.length === 0 ? 'disabled' : ''
    }>
        ${allStatus
          .map(
            (opt) =>
              `<option value="${opt}"${cmd.status === opt ? ' selected' : ''}${
                opt !== cmd.status && !statusOptions.includes(opt)
                  ? ' disabled'
                  : ''
              }>${opt}</option>`
          )
          .join('')}
      </select>
    `

    // 📦 Contenu du dropdown
    const lignes = [
      // Téléphones avec retour à la ligne
      `<article class="article">${cmd.phones.replace(
        /; ?/g,
        '<br>'
      )}</article>`,
      // Coordonnées client
      `<article class="article">
        ${cmd.address}${cmd.address2 ? '<br>' + cmd.address2 : ''}<br>
        ${cmd.zipCode} ${cmd.city}<br>
        ${cmd.email}<br>
        ${cmd.phone}
      </article>`,
      // Texte + police (affiché uniquement si l'un des deux existe)
      cmd.customText || cmd.fontChoice
        ? `<article class="article">
        ${cmd.customText ? cmd.customText + '<br>' : ''}
        ${cmd.fontChoice || ''}
      </article>`
        : '',
      // Image produit
      `<article class="article">
        <img class="image-preview2" src="${cmd.imageUrl}" alt="Image" />
      </article>`,
      // Prix, quantité, promo
      `<article class="article">
        Quantité: ${cmd.quantity}<br>
        Prix: ${prix}${cmd.promoCode ? '<br>Code promo: ' + cmd.promoCode : ''}
      </article>`
    ]
      .filter(Boolean)
      .map((li) => `<li class="listitem" role="listitem">${li}</li>`)
      .join('')

    const dropdown = `
      <div class="dropdown">
        <input hidden class="sr-only" name="state-dropdown" id="dropdown-${idCommande}" type="checkbox" />
        <label for="dropdown-${idCommande}" class="trigger">
          <span class="trigger-label">${idCommande} - ${nomClient}</span>
          ${statusSelect}
        </label>
        <ul class="list webkit-scrollbar" role="list" dir="auto">
          ${lignes}
        </ul>
      </div>
    `

    // Section d'affichage selon le statut
    let zone = null
    if (cmd.status === 'Archivée' || cmd.status === 'Annulée') {
      zone = document.querySelector('#archivees .orders')
    } else if (cmd.status === 'En attente') {
      zone = document.querySelector('#nouvelles .orders')
    } else {
      zone = document.querySelector('#encours .orders')
    }
    zone.innerHTML += dropdown
  })

  // 🔁 Écoute les changements de statut
  document.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async function () {
      const id = this.getAttribute('data-id')
      const newStatus = this.value
      const oldStatus = this.options[this.selectedIndex].text

      // Confirmation avant action
      const confirmation = confirm(
        `Confirmer le changement de statut vers "${newStatus}" ?`
      )
      if (!confirmation) {
        // Si l'utilisateur annule, on remet l'ancien statut
        this.value = oldStatus
        await fetchCommandes() // Recharge l'affichage même en cas d'annulation
        return
      }

      try {
        // Récupérer la commande complète depuis Firestore
        const docRef = db.collection('commandes').doc(id)
        const doc = await docRef.get()
        if (!doc.exists) throw new Error('Commande introuvable')

        const commande = doc.data()

        // Calcul de la nouvelle valeur de lastStatusMailed
        let lastStatusMailed = commande.lastStatusMailed
        if (newStatus === 'En cours') lastStatusMailed = 'InProgress'
        else if (newStatus === 'Envoyée') lastStatusMailed = 'Send'
        else if (newStatus === 'Annulée') lastStatusMailed = 'Annulée'
        else if (newStatus === 'Archivée')
          lastStatusMailed = commande.lastStatusMailed
        else lastStatusMailed = null

        // Mise à jour Firestore
        await docRef.update({ status: newStatus, lastStatusMailed })

        // Mise à jour locale avant envoi
        commande.status = newStatus
        commande.lastStatusMailed = lastStatusMailed

        if (
          newStatus === 'En cours' ||
          newStatus === 'Envoyée' ||
          newStatus === 'Annulée'
        ) {
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

        await fetchCommandes() // Recharge l'affichage après modification
      } catch (err) {
        alert('Erreur lors de la mise à jour du statut.')
        this.value = oldStatus // Remet l'ancien statut en cas d'erreur
      }
    })
  })

  // 📋 Télécharger l'image au clic
  document.querySelectorAll('.image-preview2').forEach((img) => {
    img.addEventListener('click', async (e) => {
      e.stopPropagation()
      try {
        const response = await fetch(img.src)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const commandeInfo = img
          .closest('.dropdown')
          .querySelector('.trigger-label').textContent
        link.download = `commande-${commandeInfo}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Erreur lors du téléchargement:', error)
        alert("Erreur lors du téléchargement de l'image")
      }
    })
  })
}

function toggleArchivedOrders() {
  const archivedOrders = document.getElementById('archivedOrders')
  const toggleIcon = document.getElementById('archiveToggleIcon')

  if (archivedOrders.style.display === 'none') {
    archivedOrders.style.display = 'block'
    toggleIcon.classList.remove('fa-chevron-down')
    toggleIcon.classList.add('fa-chevron-up')
  } else {
    archivedOrders.style.display = 'none'
    toggleIcon.classList.remove('fa-chevron-up')
    toggleIcon.classList.add('fa-chevron-down')
  }
}
// Gestion de l'authentification
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  try {
    const response = await fetch('/api/admin-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'login', email, password })
    })
    const data = await response.json()
    if (response.ok && data.token) {
      // Stocke le JWT
      localStorage.setItem('token', data.token)
      document.getElementById('login-section').style.display = 'none'
      document.getElementById('admin-content').style.display = 'block'
      document.getElementById('logout-container').style.display = 'block'
    } else {
      alert(data.error || 'Identifiants invalides')
    }
  } catch (error) {
    alert('Erreur de connexion')
  }
})

// Gestion de la visibilité du mot de passe
document
  .getElementById('togglePassword')
  .addEventListener('click', function () {
    const passwordInput = document.getElementById('password')
    const type =
      passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
    passwordInput.setAttribute('type', type)
    this.classList.toggle('fa-eye')
    this.classList.toggle('fa-eye-slash')
  })

// Gestion de la déconnexion
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token')
  document.getElementById('login-section').style.display = 'block'
  document.getElementById('admin-content').style.display = 'none'
  document.getElementById('logout-container').style.display = 'none'
  document.getElementById('loginForm').reset()
})

// Vérification du token au chargement
window.addEventListener('load', () => {
  const token = localStorage.getItem('token')
  if (token) {
    document.getElementById('login-section').style.display = 'none'
    document.getElementById('admin-content').style.display = 'block'
    document.getElementById('logout-container').style.display = 'block'
    if (typeof fetchCommandes === 'function') fetchCommandes()
    setTimeout(() => {
      const promoSelect = document.getElementById('promoSelect')
      const promoToggle = document.getElementById('promoToggle')
      const promoMessage = document.getElementById('promoMessage')
      if (promoSelect) promoSelect.addEventListener('change', savePromoAdmin)
      if (promoToggle) promoToggle.addEventListener('change', savePromoAdmin)
      if (promoMessage) promoMessage.addEventListener('blur', savePromoAdmin)
    }, 200)
  } else {
    document.getElementById('logout-container').style.display = 'none'
  }
})

// Fonction pour ajouter le token aux requêtes
function addAuthHeader(headers = {}) {
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}
// Gestion des transactions Stripe
let transactions = []
let selectedTransactionId = null

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  const loadTransactionsBtn = document.getElementById('loadTransactionsBtn')
  const viewDetailsBtn = document.getElementById('viewDetailsBtn')
  const refundBtn = document.getElementById('refundBtn')

  loadTransactionsBtn.addEventListener('click', loadTransactions)
  viewDetailsBtn.addEventListener('click', showTransactionDetails)
  refundBtn.addEventListener('click', showRefundConfirmation)
})

// Chargement des transactions
async function loadTransactions() {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Non authentifié')
    }

    const response = await fetch('/api/admin-data?action=stripe-transactions', {
      headers: addAuthHeader()
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(
        error.error || 'Erreur lors du chargement des transactions'
      )
    }

    transactions = await response.json()
    displayTransactions()
    document.getElementById('transactionActions').style.display = 'block'
  } catch (error) {
    console.error('Erreur:', error)
    alert(error.message || 'Erreur lors du chargement des transactions')
  }
}

// Affichage des transactions dans le tableau
function displayTransactions() {
  const tbody = document.querySelector('#transactionsTable tbody')
  tbody.innerHTML = ''

  transactions.forEach((transaction, idx) => {
    const tr = document.createElement('tr')
    tr.className = 'transaction-row'
    tr.dataset.idx = idx

    // On prépare une couleur en fonction du statut
    let statusClass = ''
    switch (transaction.statut) {
      case 'Validé':
        statusClass = 'badge-validated'
        break
      case 'Remboursé':
        statusClass = 'badge-refunded'
        break
      case 'Annulé':
        statusClass = 'badge-canceled'
        break
      default:
        statusClass = 'badge-unknown'
    }

    tr.innerHTML = `
      <td>${transaction.client}</td>
      <td>${formatDate(transaction.date)}</td>
      <td>${formatAmount(transaction.montant)}</td>
      <td><span class="status-badge ${statusClass}">${
      transaction.statut
    }</span></td>
    `

    // On rend la ligne cliquable
    tr.addEventListener('click', () => selectTransaction(idx))

    tbody.appendChild(tr)
  })
}

// Sélection d'une transaction
function selectTransaction(idx) {
  selectedTransactionId = idx
  const viewDetailsBtn = document.getElementById('viewDetailsBtn')
  const refundBtn = document.getElementById('refundBtn')

  viewDetailsBtn.disabled = false
  refundBtn.disabled = false

  document.querySelectorAll('.transaction-row').forEach((row) => {
    row.classList.remove('selected')
    if (row.dataset.idx === idx.toString()) {
      row.classList.add('selected')
    }
  })
}

// Affichage des détails d'une transaction
function showTransactionDetails() {
  if (selectedTransactionId === null) return

  const transaction = transactions[selectedTransactionId]
  if (!transaction) return

  const modal = createModal('Détails de la transaction')

  const content = `
    <div class="modal-body">
      <p><strong>Client:</strong> ${transaction.client}</p>
      <p><strong>Email:</strong> ${transaction.email}</p>
      <p><strong>Date:</strong> ${formatDate(transaction.date)}</p>
      <p><strong>Montant:</strong> ${formatAmount(transaction.montant)}</p>
      <p><strong>Statut:</strong> ${transaction.statut}</p>
      <p><strong>Moyen de paiement:</strong> ${
        transaction.moyen_paiement || 'Inconnu'
      }</p>
    </div>
  `
  modal.querySelector('.modal-content').insertAdjacentHTML('beforeend', content)
}

// Affichage de la confirmation de remboursement
function showRefundConfirmation() {
  if (selectedTransactionId === null) return

  const transaction = transactions[selectedTransactionId]
  if (!transaction) return

  const modal = createModal('Confirmation de remboursement')

  const content = `
    <div class="modal-body">
      <p>Êtes-vous sûr de vouloir rembourser cette transaction ?</p>
      <p><strong>Client:</strong> ${transaction.client}</p>
      <p><strong>Montant:</strong> ${formatAmount(transaction.montant)}</p>
      <p><strong>Date:</strong> ${formatDate(transaction.date)}</p>
    </div>
    <div class="modal-footer">
      <button class="button" onclick="closeModal()">Annuler</button>
      <button class="button primary" onclick="processRefund('${
        transaction.id
      }')">Confirmer le remboursement</button>
    </div>
  `

  modal.querySelector('.modal-content').insertAdjacentHTML('beforeend', content)
}

// Traitement du remboursement
async function processRefund(transactionId) {
  try {
    const response = await fetch('/api/admin-data', {
      method: 'POST',
      headers: addAuthHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'stripe-refund', transactionId })
    })

    if (!response.ok) throw new Error('Erreur lors du remboursement')

    await response.json()
    alert('Remboursement effectué avec succès')
    closeModal()
    loadTransactions()
  } catch (error) {
    console.error('Erreur:', error)
    alert('Erreur lors du remboursement')
  }
}

// Création de la modale
function createModal(title) {
  const modal = document.createElement('div')
  modal.className = 'modal'
  modal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close" onclick="closeModal()">&times;</span>
      <h2 class="modal-title">${title}</h2>
    </div>
  `

  document.body.appendChild(modal)
  modal.style.display = 'block'
  return modal
}

// Fermeture de la modale
function closeModal() {
  const modal = document.querySelector('.modal')
  if (modal) {
    modal.remove()
  }
}

// Utils pour la date et montant
function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatAmount(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount / 100)
}
