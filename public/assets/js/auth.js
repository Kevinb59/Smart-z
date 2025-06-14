// Gestion de l'authentification
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
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
