import Stripe from 'stripe'
import { db } from '../../lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
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

    // 🎯 Préparation des produits Stripe
    const line_items = designs.map((design, index) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Design ${index + 1} - ${design.phones}`,
          images: [design.imageUrl]
        },
        unit_amount: 2490
      },
      quantity: parseInt(design.quantity)
    }))

    // 🎯 Génération des métadonnées
    const metadata = {
      firstName,
      lastName,
      email,
      phone,
      address,
      address2,
      city,
      zipCode,
      ...designs.reduce(
        (acc, design, idx) => ({
          ...acc,
          [`design_${idx + 1}`]: JSON.stringify(design)
        }),
        {}
      )
    }

    // 🎯 Création de la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/cancel.html`,
      customer_email: email,
      metadata
    })

    res.status(200).json({ id: session.id })
  } catch (error) {
    console.error('Erreur:', error)
    res.status(500).json({ error: 'Erreur lors de la création de la commande' })
  }
}
