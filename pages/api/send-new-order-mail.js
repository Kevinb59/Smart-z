import dotenv from 'dotenv'
dotenv.config()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Méthode non autorisée' })
  }

  try {
    const { orders, sessionId, amountPaid, promoCode } = req.body

    // Envoi du mail au client
    const clientEmail = orders[0].email
    const firstName = orders[0].firstName
    const lastName = orders[0].lastName

    const logoUrl =
      'https://raw.githubusercontent.com/Kevinb59/mon-formulaire-smarteez/refs/heads/main/Logo%20Smart-Z.jpg'

    // Construction du HTML pour le client
    let designsHtml = ''
    orders.forEach((order, index) => {
      designsHtml += `
        <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
          <h3 style="color:#5a2d82;">Design ${index + 1} :</h3>
          <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
            <h4 style="color:#5a2d82;">Téléphone(s) :</h4>
            <ul style="padding-left:20px; color:#333;">${order.phones
              .map((p) => `<li>${p}</li>`)
              .join('')}</ul>
          </div>

          <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
            <h4 style="color:#5a2d82;">Détails :</h4>
            ${
              order.customText
                ? `<p style="color:#333;"><strong>Texte personnalisé :</strong> ${order.customText}</p>`
                : ''
            }
            ${
              order.fontChoice
                ? `<p style="color:#333;"><strong>Police :</strong> ${order.fontChoice}</p>`
                : ''
            }
            <p style="color:#333;"><strong>Quantité :</strong> ${
              order.quantity
            }</p>
          </div>

          <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
            <h4 style="color:#5a2d82;">Image personnalisée :</h4>
            <div style="text-align:center;"><img src="${
              order.imageUrl
            }" style="max-width:300px; border:1px solid #ccc; padding:5px; border-radius:5px;"></div>
          </div>
        </div>
      `
    })

    const clientHtmlBody = `
    <div style="background-color:#a5c799; padding: 20px; font-family:Arial, sans-serif;">
      <div style="max-width:600px; margin:0 auto; background-color:#ffffff; padding:20px; border-radius:10px; box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.1);">
        <img src="${logoUrl}" style="display: block; margin: 0 auto; width: 150px; height: auto;" alt="Logo Smart-Z">
        <h2 style="color:#5a2d82; text-align:center;">Bonjour ${firstName} ${lastName},</h2>
        <p style="color:#5a2d82; text-align:center; font-size:16px;">Nous avons bien reçu votre commande !</p>

        <div style="background-color:#2ecc71; color:white; padding:10px 20px; border-radius:25px; text-align:center; font-weight:bold; font-size:16px; margin:20px auto;">
          🎉 Commande confirmée
        </div>

        ${designsHtml}

        <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
          <h3 style="color:#5a2d82;">Coordonnées :</h3>
          <p style="color:#333;">${orders[0].address}${
      orders[0].address2 ? ', ' + orders[0].address2 : ''
    }</p>
          <p style="color:#333;">${orders[0].zipCode} ${orders[0].city}</p>
          <p style="color:#333;">Email : ${orders[0].email}</p>
          <p style="color:#333;">Téléphone : ${orders[0].phone}</p>
        </div>

        <div style="background-color:#ffffff; border-radius:10px; box-shadow:0px 0px 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
          <h3 style="color:#5a2d82;">Détails de la commande :</h3>
          <p style="color:#333;"><strong>Numéro de commande :</strong> ${
            orders[0].id
          }</p>
          <p style="color:#333;"><strong>Montant total :</strong> ${(
            amountPaid / 100
          ).toFixed(2)} €</p>
          ${
            promoCode
              ? `<p style="color:#333;"><strong>Code promo utilisé :</strong> ${promoCode}</p>`
              : ''
          }
        </div>

        <p style="color:#333; text-align:center; margin-top:20px;">Nous vous tiendrons informé de l'avancement de votre commande.</p>
        <p style="color:#333; text-align:center; font-weight:bold;">Merci de votre confiance,</p>
        <p style="color:#333; text-align:center; font-weight:bold;">Smart-Z</p>
      </div>
    </div>`

    // Construction du texte pour le mail admin
    const adminTextBody = `
Nouvelle commande reçue !

Numéro de commande : ${orders[0].id}
Session Stripe : ${sessionId}
Montant total : ${(amountPaid / 100).toFixed(2)} €
${promoCode ? `Code promo utilisé : ${promoCode}` : ''}

Client :
${firstName} ${lastName}
${orders[0].address}${orders[0].address2 ? ', ' + orders[0].address2 : ''}
${orders[0].zipCode} ${orders[0].city}
Email : ${orders[0].email}
Téléphone : ${orders[0].phone}

Designs commandés :
${orders
  .map(
    (order, index) => `
Design ${index + 1} :
- Téléphones : ${order.phones.join(', ')}
- Texte personnalisé : ${order.customText || 'Non'}
- Police : ${order.fontChoice || 'Non'}
- Quantité : ${order.quantity}
- Image : ${order.imageUrl}
`
  )
  .join('\n')}
`

    // Envoi du mail au client
    const clientPayload = {
      sender: { name: 'Smart-Z', email: 'sasmarteez@gmail.com' },
      to: [{ email: clientEmail }],
      subject: `Confirmation de votre commande - N°${orders[0].id}`,
      htmlContent: clientHtmlBody
    }

    // Envoi du mail à l'admin
    const adminPayload = {
      sender: { name: 'Smart-Z', email: 'sasmarteez@gmail.com' },
      to: [{ email: 'sasmarteez@gmail.com' }],
      subject: `Nouvelle commande - N°${orders[0].id}`,
      textContent: adminTextBody
    }

    // Envoi des mails via Brevo
    const [clientResponse, adminResponse] = await Promise.all([
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify(clientPayload)
      }),
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify(adminPayload)
      })
    ])

    if (!clientResponse.ok || !adminResponse.ok) {
      const clientError = await clientResponse.text()
      const adminError = await adminResponse.text()
      return res.status(500).json({
        status: 'error',
        message: 'Erreur Brevo',
        details: { client: clientError, admin: adminError }
      })
    }

    return res.status(200).json({ status: 'success' })
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Erreur serveur',
      details: error.toString()
    })
  }
}
