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
      // Récupérer la commande complète
      const docRef = db.collection('commandes').doc(id)
      const doc = await docRef.get()
      if (!doc.exists) return alert('Commande introuvable !')
      const commande = doc.data()
      // Déterminer la nouvelle valeur de lastStatusMailed
      let lastStatusMailed = commande.lastStatusMailed
      if (newStatus === 'En cours') lastStatusMailed = 'InProgress'
      else if (newStatus === 'Envoyée') lastStatusMailed = 'Send'
      else if (newStatus === 'Annulée') lastStatusMailed = 'Annulée'
      else if (newStatus === 'Archivée')
        lastStatusMailed = commande.lastStatusMailed // pas de changement
      else lastStatusMailed = null
      // Mettre à jour Firestore
      await docRef.update({ status: newStatus, lastStatusMailed })
      // Appel GAS si besoin
      const GAS_URL =
        window.GAS_URL_STATUS_ORDER_MAIL ||
        (typeof GAS_URL_STATUS_ORDER_MAIL !== 'undefined'
          ? GAS_URL_STATUS_ORDER_MAIL
          : null)
      if ((newStatus === 'En cours' || newStatus === 'Envoyée') && GAS_URL) {
        try {
          await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commande)
          })
        } catch (e) {
          // On ignore les erreurs GAS
        }
      }
      alert('Statut mis à jour !')
      await fetchCommandes()
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
