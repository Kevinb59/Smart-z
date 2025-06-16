export async function sendNewOrderMail({
  orders,
  sessionId,
  amountPaid,
  promoCode
}) {
  console.log('📧 Début du traitement des mails')

  const clientEmail = orders[0].email
  const firstName = orders[0].firstName
  const lastName = orders[0].lastName
  const logoUrl =
    'https://raw.githubusercontent.com/Kevinb59/mon-formulaire-smarteez/refs/heads/main/Logo%20Smart-Z.jpg'

  // Construction du HTML pour le client
  let designsHtml = ''

  orders.forEach((order, index) => {
    const phonesList = order.phones
      ? order.phones.map((p) => `<li>${p}</li>`).join('')
      : ''

    designsHtml += `
      <div style="background-color:#ffffff; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,0.1); padding:15px; margin-bottom:20px;">
        <h3 style="color:#5a2d82;">Design ${index + 1} :</h3>

        <div style="margin-bottom:15px;">
          <h4 style="color:#5a2d82;">Téléphone(s) :</h4>
          <ul style="padding-left:20px; color:#333;">${phonesList}</ul>
        </div>

        <div style="margin-bottom:15px;">
          <h4 style="color:#5a2d82;">Détails :</h4>
          ${
            order.customText
              ? `<p><strong>Texte personnalisé :</strong> ${order.customText}</p>`
              : ''
          }
          ${
            order.fontChoice
              ? `<p><strong>Police :</strong> ${order.fontChoice}</p>`
              : ''
          }
          <p><strong>Quantité :</strong> ${order.quantity}</p>
        </div>

        <div style="margin-bottom:15px;">
          <h4 style="color:#5a2d82;">Image personnalisée :</h4>
          <div style="text-align:center;">
            <img src="${
              order.imageUrl
            }" style="max-width:300px; border:1px solid #ccc; padding:5px; border-radius:5px;">
          </div>
        </div>
      </div>
    `
  })

  const clientHtmlBody = `
  <div style="background-color:#a5c799; padding:20px; font-family:Arial,sans-serif;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff; padding:20px; border-radius:10px; box-shadow:0 0 15px rgba(0,0,0,0.1);">
      <img src="${logoUrl}" style="display:block; margin:0 auto; width:150px; height:auto;" alt="Logo Smart-Z">
      <h2 style="color:#5a2d82; text-align:center;">Bonjour ${firstName} ${lastName},</h2>
      <p style="color:#5a2d82; text-align:center; font-size:16px;">Nous avons bien reçu votre commande !</p>

      <div style="background-color:#2ecc71; color:white; padding:10px 20px; border-radius:25px; text-align:center; font-weight:bold; font-size:16px; margin:20px auto;">
        🎉 Commande confirmée
      </div>

      ${designsHtml}

      <div style="margin-bottom:20px;">
        <h3 style="color:#5a2d82;">Coordonnées :</h3>
        <p>${orders[0].address}${
    orders[0].address2 ? ', ' + orders[0].address2 : ''
  }</p>
        <p>${orders[0].zipCode} ${orders[0].city}</p>
        <p>Email : ${orders[0].email}</p>
        <p>Téléphone : ${orders[0].phone}</p>
      </div>

      <div style="margin-bottom:20px;">
        <h3 style="color:#5a2d82;">Détails de la commande :</h3>
        <p><strong>Numéro de commande :</strong> ${orders[0].id}</p>
        <p><strong>Montant total :</strong> ${(amountPaid / 100).toFixed(
          2
        )} €</p>
        ${
          promoCode
            ? `<p><strong>Code promo utilisé :</strong> ${promoCode}</p>`
            : ''
        }
      </div>

      <p style="text-align:center; margin-top:20px;">Nous vous tiendrons informé de l'avancement de votre commande.</p>
      <p style="text-align:center; font-weight:bold;">Merci de votre confiance,<br>Smart-Z</p>
    </div>
  </div>`

  // Construction du mail admin (texte brut)
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
- Téléphones : ${order.phones?.join(', ') ?? 'Non renseigné'}
- Texte personnalisé : ${order.customText || 'Non'}
- Police : ${order.fontChoice || 'Non'}
- Quantité : ${order.quantity}
- Image : ${order.imageUrl}
`
  )
  .join('\n')}
`

  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY manquante')
    throw new Error('Configuration Brevo manquante')
  }

  console.log('📤 Envoi des mails via Brevo...')

  const brevoEndpoint = 'https://api.brevo.com/v3/smtp/email'
  const headers = {
    accept: 'application/json',
    'api-key': process.env.BREVO_API_KEY,
    'content-type': 'application/json'
  }

  const [clientResponse, adminResponse] = await Promise.all([
    fetch(brevoEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: { name: 'Smart-Z', email: 'sasmarteez@gmail.com' },
        to: [{ email: clientEmail }],
        subject: `Confirmation de votre commande - N°${orders[0].id}`,
        htmlContent: clientHtmlBody
      })
    }),
    fetch(brevoEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: { name: 'Smart-Z', email: 'sasmarteez@gmail.com' },
        to: [{ email: 'sasmarteez@gmail.com' }],
        subject: `Nouvelle commande - N°${orders[0].id}`,
        textContent: adminTextBody
      })
    })
  ])

  if (!clientResponse.ok || !adminResponse.ok) {
    const clientError = await clientResponse.text()
    const adminError = await adminResponse.text()
    console.error('❌ Erreur Brevo:', {
      client: clientError,
      admin: adminError
    })
    throw new Error('Erreur Brevo')
  }

  console.log('✅ Mails envoyés avec succès')
}
