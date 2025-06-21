// Au chargement du DOM
document.addEventListener('DOMContentLoaded', function () {
  const paymentButton = document.querySelector('.animated-button')
  if (!paymentButton) return

  // Fonction pour mettre en évidence les champs invalides
  function highlightInvalidField(field) {
    if (field.classList.contains('imageUpload')) {
      // Pour les champs d'image, on met en évidence le label parent
      const label = field.closest('.upload-label')
      if (label) {
        label.style.border = '2px solid red'
        label.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      field.style.border = '2px solid red'
      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Fonction pour réinitialiser les bordures
  function resetFieldBorders() {
    document.querySelectorAll('input, select, textarea').forEach((field) => {
      field.style.border = ''
    })
    document.querySelectorAll('.upload-label').forEach((label) => {
      label.style.border = '2px dashed #d0d0d0'
    })
  }

  // Fonction pour trouver le premier champ invalide
  function findFirstInvalidField() {
    // Vérification des champs client
    const requiredClientFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'address',
      'city',
      'zipCode'
    ]
    for (const field of requiredClientFields) {
      const element = document.getElementById(field)
      if (!element.value.trim()) {
        return element
      }
    }

    // Vérification des CGV
    const checkbox = document.getElementById('checkbox-cgv')
    if (!checkbox.checked) {
      return checkbox
    }

    // Vérification des designs
    const designForms = document.querySelectorAll('.productForm')
    for (const form of designForms) {
      // Vérification des téléphones
      const phoneSelects = form.querySelectorAll('.phoneBrand, .phoneModel')
      let hasValidPhone = false

      for (let i = 0; i < phoneSelects.length; i += 2) {
        const brand = phoneSelects[i].value.trim()
        const model = phoneSelects[i + 1].value.trim()

        if (brand && !model) {
          return phoneSelects[i + 1] // Retourne le champ modèle si c'est lui qui manque
        } else if (!brand && model) {
          return phoneSelects[i] // Retourne le champ marque si c'est lui qui manque
        }
        if (brand && model) {
          hasValidPhone = true
        }
      }

      if (!hasValidPhone) {
        return phoneSelects[0] // Retourne le premier champ de marque pour indiquer qu'il faut au moins un téléphone
      }

      // Vérification de l'image
      const imageInput = form.querySelector('.imageUpload')
      if (!imageInput?.files[0]) {
        return imageInput
      }

      // Vérification du texte personnalisé et de la police
      const customText = form.querySelector('#customText')?.value.trim() || ''
      const fontChoice = form.querySelector('#fontChoice')?.value.trim() || ''
      if (customText && !fontChoice) {
        return form.querySelector('#fontChoice')
      }
    }

    return null
  }

  // Au clic sur le bouton de paiement
  paymentButton.addEventListener('click', async function (e) {
    e.preventDefault()
    resetFieldBorders()

    // Trouver le premier champ invalide
    const firstInvalidField = findFirstInvalidField()
    if (firstInvalidField) {
      highlightInvalidField(firstInvalidField)

      // Afficher le message d'erreur approprié
      if (firstInvalidField.id === 'checkbox-cgv') {
        alert('Merci de valider les conditions générales de vente.')
      } else if (firstInvalidField.classList.contains('imageUpload')) {
        alert('Merci de sélectionner une image pour chaque design.')
      } else if (
        firstInvalidField.classList.contains('phoneBrand') ||
        firstInvalidField.classList.contains('phoneModel')
      ) {
        alert(
          'Merci de sélectionner à la fois la marque et le modèle pour chaque téléphone.'
        )
      } else if (firstInvalidField.id === 'fontChoice') {
        alert(
          'Si vous ajoutez un texte personnalisé, merci de sélectionner une police.'
        )
      } else {
        alert('Merci de remplir tous les champs obligatoires.')
      }
      return
    }

    // Afficher le loader
    const loader = document.getElementById('paymentLoader')
    if (loader) {
      loader.classList.add('show')
    }

    try {
      // 📦 Données client à transmettre
      const data = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        address2: document.getElementById('address2').value.trim(),
        city: document.getElementById('city').value.trim(),
        zipCode: document.getElementById('zipCode').value.trim(),
        designs: [] // Contiendra tous les designs (téléphones + image + texte + quantité)
      }

      // 🔁 Récupération de tous les blocs design
      const designForms = document.querySelectorAll('.productForm')
      const cloudName = 'dwjkmwlyb'
      const uploadPreset = 'smarteez_orders'

      for (const form of designForms) {
        // 📱 Liste des téléphones dans ce design
        const phoneSelects = form.querySelectorAll('.phoneBrand, .phoneModel')
        const phones = []

        for (let i = 0; i < phoneSelects.length; i += 2) {
          const brand = phoneSelects[i].value.trim()
          const model = phoneSelects[i + 1].value.trim()
          if (brand && model) phones.push(`${brand} ${model}`)
        }

        // 🖼️ Image du design
        const imageInput = form.querySelector('.imageUpload')
        const file = imageInput?.files[0]

        // ☁️ Upload de l'image vers Cloudinary
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', uploadPreset)

        let cloudRes, cloudData
        try {
          cloudRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
            {
              method: 'POST',
              body: formData
            }
          )
          cloudData = await cloudRes.json()
        } catch (err) {
          console.error('Erreur Cloudinary :', err)
          alert("Erreur lors de l'envoi de l'image.")
          return
        }

        if (!cloudData.secure_url) {
          console.error('Échec upload :', cloudData)
          alert("Erreur lors de l'envoi de l'image.")
          return
        }

        // 📝 Ajout du design dans la liste finale
        data.designs.push({
          phones: phones.join('; '), // Exemple : "Redmi Note 12; iPhone 16"
          imageUrl: cloudData.secure_url,
          customText: form.querySelector('#customText')?.value.trim() || '',
          fontChoice: form.querySelector('#fontChoice')?.value.trim() || '',
          quantity: form.querySelector('#quantity')?.value.trim() || '1'
        })
      }

      // 📤 Envoi des données vers le serveur backend (/api/create-checkout-session)
      const stripeRes = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const stripeData = await stripeRes.json()
      if (!stripeData.id) {
        console.error('Erreur Stripe:', stripeData)
        if (loader) loader.classList.remove('show')
        alert('Erreur lors de la redirection vers le paiement.')
        return
      }

      // 💳 Redirection vers Stripe Checkout
      const stripe = Stripe(
        'pk_live_51Q0pzz03Hgw1RFXSzt25jEyuePM3OKHJXvpIcmZhA0J0ndyLraMJxxYuGVBI4SV3VnAnLtOEoHV5E4i8xxZAKwKC00dGkEtZ1P'
      )
      await stripe.redirectToCheckout({ sessionId: stripeData.id })
    } catch (error) {
      console.error('Erreur globale :', error)
      if (loader) loader.classList.remove('show')
      alert('Une erreur est survenue. Merci de réessayer.')
    }
  })
})
