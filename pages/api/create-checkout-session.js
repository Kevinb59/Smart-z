import fs from 'fs'
import path from 'path'
import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // 🧾 Données client + designs
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      address2,
      city,
      zipCode,
      designs
    } = req.body

    // 📁 Lire le fichier commandes.json
    const commandesPath = path.resolve(process.cwd(), 'api/data/commandes.json')
    let commandes = []

    try {
      const raw = fs.readFileSync(commandesPath, 'utf-8')
      commandes = JSON.parse(raw)
    } catch (e) {
      console.warn('commandes.json introuvable ou vide, première commande ?')
    }

    // 🆔 Calcul de l'identifiant principal (ex: A151)
    let lastId = commandes.length
      ? commandes.at(-1).id?.split('-')[0] || 'A000'
      : 'A000'
    let letter = lastId[0]
    let number = parseInt(lastId.slice(1))

    number++
    if (number > 999) {
      letter = String.fromCharCode(letter.charCodeAt(0) + 1)
      number = 1
    }

    const nextBaseId = `${letter}${String(number).padStart(3, '0')}`

    // 🧩 Ajouter un ID unique à chaque design : A151 ou A151-1, A151-2, ...
    const enrichedDesigns = designs.map((design, index) => ({
      ...design,
      id: designs.length === 1 ? nextBaseId : `${nextBaseId}-${index + 1}`
    }))

    // 🧾 Line items Stripe (un par design)
    const line_items = enrichedDesigns.map((design, index) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Design ${index + 1} - ${design.phones}`,
          images: [design.imageUrl]
        },
        unit_amount: 2490 // 24,90 € en centimes
      },
      quantity: parseInt(design.quantity)
    }))

    // 🧠 Création de la session Stripe avec métadonnées
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: 'https://www.smart-z.fr/success',
      cancel_url: 'https://www.smart-z.fr/cancel',
      customer_email: email,
      line_items,
      allow_promotion_codes: true,
      metadata: {
        idBase: nextBaseId,
        firstName,
        lastName,
        email,
        phone,
        address,
        address2,
        city,
        zipCode,
        ...enrichedDesigns.reduce(
          (acc, design, index) => ({
            ...acc,
            [`design_${index + 1}`]: JSON.stringify(design)
          }),
          {}
        )
      }
    })

    // 🟢 Retour de l'ID de session à initCheckout.js
    res.status(200).json({ id: session.id })
  } catch (error) {
    console.error('Erreur Stripe :', error.message)
    res.status(500).json({ error: 'Erreur lors de la création de la session' })
  }
}
