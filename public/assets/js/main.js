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
