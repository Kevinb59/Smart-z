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

    const response = await fetch('/api/stripe-transactions', {
      headers: {
        Authorization: `Bearer ${token}`
      }
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

    tr.innerHTML = `
      <td>
        <input type="radio" name="transaction" class="transaction-checkbox"
               data-idx="${idx}" onchange="selectTransaction(${idx})">
      </td>
      <td>${transaction.client}</td>
      <td>${formatDate(transaction.date)}</td>
      <td>${formatAmount(transaction.montant)}</td>
      <td>
        <span class="status-badge status-${transaction.statut.toLowerCase()}">
          ${transaction.statut}
        </span>
      </td>
    `

    tbody.appendChild(tr)
  })
}

// Sélection d'une transaction
function selectTransaction(idx) {
  selectedTransactionId = idx
  const viewDetailsBtn = document.getElementById('viewDetailsBtn')
  const refundBtn = document.getElementById('refundBtn')

  // Mise à jour des boutons
  viewDetailsBtn.disabled = false
  refundBtn.disabled = false

  // Mise à jour de l'apparence de la ligne
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
  if (!selectedTransactionId) return

  const transaction = transactions.find((t) => t.id === selectedTransactionId)
  if (!transaction) return

  const modal = createModal('Confirmation de remboursement')

  const content = `
    <div class="modal-body">
      <p>Êtes-vous sûr de vouloir rembourser cette transaction ?</p>
      <p><strong>Client:</strong> ${transaction.customer_name}</p>
      <p><strong>Montant:</strong> ${formatAmount(transaction.amount)}</p>
      <p><strong>Date:</strong> ${formatDate(transaction.created)}</p>
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
    const response = await fetch('/api/stripe-refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ transactionId })
    })

    if (!response.ok) throw new Error('Erreur lors du remboursement')

    const result = await response.json()
    alert('Remboursement effectué avec succès')
    closeModal()
    loadTransactions() // Recharger les transactions
  } catch (error) {
    console.error('Erreur:', error)
    alert('Erreur lors du remboursement')
  }
}

// Création d'une modale
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

// Utilitaires
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
