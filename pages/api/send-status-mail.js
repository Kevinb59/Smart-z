import dotenv from 'dotenv'
dotenv.config()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Méthode non autorisée' })
  }

  try {
    const data = req.body

    // Données client
    const firstName = data.firstName || '-'
    const lastName = data.lastName || '-'
    const email = data.email || '-'
    const phone = data.phone || '-'
    const address = data.address || '-'
    const address2 = data.address2 || ''
    const city = data.city || '-'
    const zipCode = data.zipCode || '-'
    const idCommande = data.id || 'Inconnu'

    // Extraction du N° de commande et du numéro d'article
    const idParts = idCommande.split('-')
    const baseId = idParts[0]
    const numArticle = idParts[1]

    // Données article
    const phones = data.phones
      ? data.phones.split(';').map((p) => p.trim())
      : []
    const customText =
      data.customText && data.customText !== '-' ? data.customText : null
    const fontChoice =
      data.fontChoice && data.fontChoice !== '-' ? data.fontChoice : null
    const quantity = data.quantity || '-'
    const imageUrl = data.imageUrl || ''

    const status = data.status
    let statusText = '',
      bgColor = '',
      emoji = '',
      phraseFooter = ''

    if (status === 'En cours') {
      statusText = 'En cours de traitement'
      bgColor = '#3498db'
      emoji = '🔄'
      phraseFooter = 'Votre commande sera expédiée dans les plus brefs délais.'
    } else if (status === 'Envoyée') {
      statusText = "Envoyée à l'adresse indiquée"
      bgColor = '#2ecc71'
      emoji = '📦'
      phraseFooter = "Votre commande vous sera délivrée d'ici 2 à 4 jours."
    } else if (status === 'Annulée') {
      statusText = 'Annulée'
      bgColor = '#e74c3c'
      emoji = '❌'
      phraseFooter = `Votre commande a bien été annulée, vous recevrez prochainement son remboursement.<br>Si vous n'avez pas demandé à annuler votre commande, veuillez nous <a href="mailto:contact@smart-z.fr" style="color:#5a2d82;">contacter</a>.`
    } else {
      return res
        .status(400)
        .json({ status: 'error', message: 'Statut non pris en charge' })
    }

    const logoUrl =
      'https://raw.githubusercontent.com/Kevinb59/mon-formulaire-smarteez/refs/heads/main/Logo%20Smart-Z.jpg'

    const htmlBody = `
    <div style="background-color:#a5c799; padding: 20px; font-family:Arial, sans-serif;">
      <div style="max-width:600px; margin:0 auto; background-color:#ffffff; padding:20px; border-radius:10px; box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.1);">
        <img src="${logoUrl}" style="display: block; margin: 0 auto; width: 150px; height: auto;" alt="Logo Smart-Z">
        <h2 style="color:#5a2d82; text-align:center;">Bonjour ${firstName} ${lastName},</h2>
        <p style="color:#5a2d82; text-align:center; font-size:16px;">Le statut de votre commande a été mis à jour :</p>

        <div style="background-color:${bgColor}; color:white; padding:10px 20px; border-radius:25px; text-align:center; font-weight:bold; font-size:16px; margin:20px auto;">
          ${emoji} ${statusText}
        </div>

        <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
          <h3 style="color:#5a2d82;">Téléphone(s) :</h3>
          <ul style="padding-left:20px; color:#333;">${phones
            .map((p) => `<li>${p}</li>`)
            .join('')}</ul>
        </div>

        <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
          <h3 style="color:#5a2d82;">Détails :</h3>
          ${
            customText
              ? `<p style="color:#333;"><strong>Texte personnalisé :</strong> ${customText}</p>`
              : ''
          }
          ${
            fontChoice
              ? `<p style="color:#333;"><strong>Police :</strong> ${fontChoice}</p>`
              : ''
          }
          <p style="color:#333;"><strong>Quantité :</strong> ${quantity}</p>
        </div>

        <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
          <h3 style="color:#5a2d82;">Image personnalisée :</h3>
          <div style="text-align:center;"><img src="${imageUrl}" style="max-width:300px; border:1px solid #ccc; padding:5px; border-radius:5px;"></div>
        </div>

        <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
          <h3 style="color:#5a2d82;">Coordonnées :</h3>
          <p style="color:#333;">${address}${
      address2 ? ', ' + address2 : ''
    }</p>
          <p style="color:#333;">${zipCode} ${city}</p>
          <p style="color:#333;">Email : ${email}</p>
          <p style="color:#333;">Téléphone : ${phone}</p>
        </div>

        <p style="color:#333; text-align:center; margin-top:20px;">${phraseFooter}</p>
        <p style="color:#333; text-align:center; font-weight:bold;">Merci de votre confiance,</p>
        <p style="color:#333; text-align:center; font-weight:bold;">Smart-Z</p>
      </div>
    </div>`

    const payload = {
      sender: { name: 'Smart-Z', email: 'sasmarteez@gmail.com' },
      to: [{ email: email }],
      subject: `Suivi de votre commande - N°${baseId} | Article ${numArticle}`,
      htmlContent: htmlBody
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res
        .status(500)
        .json({ status: 'error', message: 'Erreur Brevo', details: errorText })
    }

    return res.status(200).json({ status: 'success' })
  } catch (error) {
    return res
      .status(500)
      .json({
        status: 'error',
        message: 'Erreur serveur',
        details: error.toString()
      })
  }
}
