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
    const statusOptions = ['En attente', 'En cours', 'Envoyée', 'Archivée']

    const statusSelect = `
      <select class="status-select" data-id="${idCommande}">
        ${statusOptions
          .map(
            (opt) =>
              `<option value="${opt}"${
                cmd.status === opt ? ' selected' : ''
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

    const zone =
      cmd.status === 'Archivée'
        ? document.querySelector('#archivees .orders')
        : cmd.lastStatusMailed === null
        ? document.querySelector('#nouvelles .orders')
        : document.querySelector('#encours .orders')

    zone.innerHTML += dropdown
  })

  // 🔁 Écoute les changements de statut
  document.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', function () {
      const id = this.getAttribute('data-id')
      const newStatus = this.value
      console.log(`Commande ${id} changée en : ${newStatus}`)
      // Tu peux ajouter ici une requête pour sauvegarder le nouveau statut
    })
  })

  // 📋 Copier l'image au clic
  document.querySelectorAll('.image-preview2').forEach((img) => {
    img.addEventListener('click', (e) => {
      e.stopPropagation()
      navigator.clipboard.writeText(img.src)
      alert('Lien copié !')
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

// Remplacement de la récupération locale par Firestore
async function fetchOrders() {
  const snapshot = await db.collection('commandes').get()
  return snapshot.docs.map((doc) => doc.data())
}

// Exemple d'utilisation pour afficher les commandes
async function displayOrders() {
  const orders = await fetchOrders()
  // Logique d'affichage adaptée à la structure de tes sections (nouvelles, en cours, archivées)
}

// Pour changer le statut d'une commande
async function updateOrderStatus(orderId, newStatus) {
  await db.collection('commandes').doc(orderId).update({ status: newStatus })
  // Appel API pour envoyer un mail au client (adapter l'URL si besoin)
  await fetch('/api/send-status-mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, newStatus })
  })
}
