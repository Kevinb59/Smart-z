/* =========================================================================================================
   G E S T I O N   D E S   E F F E T S   D E   P A R A L L A X E   E T   D E   L ' I N T E R F A C E
   ========================================================================================================= */

;(function ($) {
  // Variables globales
  var $window = $(window),
    $body = $('body'),
    settings = {
      parallax: true, // Active ou non l'effet parallax
      parallaxFactor: 5 // Intensité du parallax (plus bas = plus fort)
    }

  // Définition des points de rupture pour responsive design
  breakpoints({
    xlarge: ['1367px', '1680px'],
    large: ['981px', '1366px'],
    medium: ['737px', '980px'],
    small: ['481px', '736px'],
    xsmall: [null, '480px']
  })

  // Lancer les animations initiales une fois la page chargée
  $window.on('load', function () {
    window.setTimeout(function () {
      $body.removeClass('is-preload') // Retire la classe de préchargement
    }, 100)
  })

  /* =========================================================================================================
     G É N É R A T I O N   D U   M E N U   M O B I L E
     ========================================================================================================= */

  // Création du bouton de menu mobile
  $(
    '<div id="navButton">' +
      '<a href="#navPanel" class="toggle"></a>' +
      '</div>'
  ).appendTo($body)

  // Création du panel de navigation mobile
  $('<div id="navPanel">' + '<nav>' + $('#nav').navList() + '</nav>' + '</div>')
    .appendTo($body)
    .panel({
      delay: 500,
      hideOnClick: true,
      resetScroll: true,
      resetForms: true,
      side: 'top',
      target: $body,
      visibleClass: 'navPanel-visible'
    })

  /* =========================================================================================================
     G E S T I O N   D U   P A R A L L A X E   D U   B A C K G R O U N D
     ========================================================================================================= */

  // Désactive l'effet parallax sur IE (scroll fluide), et sur les plateformes mobiles (= meilleure performance).
  if (browser.name == 'ie' || browser.name == 'edge' || browser.mobile)
    settings.parallax = false

  // Activation du parallax si l'option est activée
  if (settings.parallax) {
    var $dummy = $(),
      $bg

    // Sur scroll, ajuste la position du background
    $window.on('scroll.locus_parallax', function () {
      // Ajuste la position du background
      $bg.css(
        'background-position',
        'top left, center ' +
          -1 * (parseInt($window.scrollTop()) / settings.parallaxFactor) +
          'px'
      )
    })

    // Sur redimensionnement, ajuste la position du background
    $window
      .on('resize.locus_parallax', function () {
        // Si on est dans une situation où on doit temporairement désactiver le parallax, le faire
        if (breakpoints.active('<=medium')) {
          $body.css('background-position', 'top left, top center')
          $bg = $dummy
        }

        // Otherwise, continue as normal.
        else $bg = $body

        // Trigger scroll handler.
        $window.triggerHandler('scroll.locus_parallax')
      })
      .trigger('resize.locus_parallax')
  }
})(jQuery)

/* =========================================================================================================
   A F F I C H A G E   D U   B A N N E R   P R O M O   E T   D E   L ' I N T E R F A C E   D E   L ' E C A R T
   ========================================================================================================= */

document.addEventListener('DOMContentLoaded', async function () {
  const eCard = document.querySelector('.e-card')
  const section = eCard ? eCard.closest('section') : null
  const bannerSection = eCard ? eCard.querySelector('.infotop') : null
  if (!section || !eCard || !bannerSection) return

  // Masquer la section par défaut
  section.style.display = 'none'

  // Récupération des données du banner promo depuis Firestore
  try {
    const doc = await db.collection('config').doc('promoBanner').get()
    const promo = doc.exists ? doc.data() : null

    // Si le banner promo n'est pas à afficher ou si le code est vide, masquer la section
    if (!promo || !promo.show || !promo.code) {
      section.style.display = 'none'
      return
    }

    // Afficher la section
    section.style.display = ''
    let reduction = ''
    if (promo.type === 'percent') reduction = promo.value + '%'
    else if (promo.type === 'amount')
      reduction = promo.value.toFixed(2).replace('.', ',') + '€'
    bannerSection.innerHTML = `
      <div style="margin-bottom: 1em; font-size:1em;">Profitez de ${reduction} de réduction:</div>
      <div class="promo-code">${promo.code}</div>
      <div style="margin-top: 0.5em; font-size:0.7em; color:#e0e0e0;">${
        promo.message ? '(' + promo.message + ')' : ''
      }</div>
    `
  } catch (e) {
    section.style.display = 'none'
  }
})

/* =========================================================================================================
   G E S T I O N   D U   B O U T O N   D E   P A I E M E N T   E T   D E   L ' A C C E P T A T I O N   D E S   C G V
   ========================================================================================================= */

document.addEventListener('DOMContentLoaded', function () {
  const checkbox = document.getElementById('checkbox-cgv')
  const payBtn = document.querySelector('.animated-button')
  if (payBtn && checkbox) {
    payBtn.disabled = true
    payBtn.classList.add('disabled')
    checkbox.addEventListener('change', function () {
      payBtn.disabled = !this.checked
      payBtn.classList.toggle('disabled', !this.checked)
    })
  }
})

/* =========================================================================================================
   F O N C T I O N   D E   S C R O L L   V E R S   L E   F O R M U L A I R E
   ========================================================================================================= */

function scrollToOrderForm() {
  const section = document.getElementById('orderFormSection')
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' })
  }
}

/* =========================================================================================================
   S C R I P T   P O U R   L ' E N V O I   D U   F O R M U L A I R E   D E   C O N T A C T   V I A   API
   ========================================================================================================= */

document.addEventListener('DOMContentLoaded', function () {
  const contactForm = document.getElementById('contactForm')
  if (contactForm) {
    const submitBtn = contactForm.querySelector('input[type="submit"]')
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault()
      if (!submitBtn) return

      submitBtn.value = 'Envoi en cours...'
      submitBtn.disabled = true

      const name = document.getElementById('contactName').value.trim()
      const email = document.getElementById('contactEmail').value.trim()
      const subject = document.getElementById('contactSubject').value.trim()
      const message = document.getElementById('contactMessage').value.trim()

      if (!name || !email || !message) {
        submitBtn.value = 'Veuillez remplir tous les champs requis'
        resetButton(submitBtn)
        return
      }

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message })
        })

        const data = await res.json()

        if (data.status === 'success') {
          submitBtn.value = 'Message envoyé !'
          contactForm.reset()
        } else {
          submitBtn.value = "Erreur lors de l'envoi"
        }
      } catch (err) {
        console.error('Erreur réseau:', err)
        submitBtn.value = 'Erreur réseau'
      }

      resetButton(submitBtn)
    })
  }

  function resetButton(button) {
    setTimeout(() => {
      button.value = 'Envoyer'
      button.disabled = false
    }, 2500)
  }
})

// Remplace la récupération locale par Firestore pour les marques/modèles
// Appelle la fonction Firestore définie dans phoneBrandAndModel.js
if (typeof populateBrands === 'function') {
  populateBrands()
}
