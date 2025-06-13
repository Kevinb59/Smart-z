import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }
  const { code, active } = req.body
  if (!code || typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Paramètres manquants ou invalides' })
  }
  try {
    // Désactiver/activer sur Stripe
    // 1. Chercher l'ID Stripe du code promo
    const promoCodes = await stripe.promotionCodes.list({ code, limit: 1 })
    if (!promoCodes.data.length) {
      return res
        .status(404)
        .json({ error: 'Code promo introuvable sur Stripe' })
    }
    const promoId = promoCodes.data[0].id
    const updatedPromo = await stripe.promotionCodes.update(promoId, { active })
    res.status(200).json({ success: true, code, active, updatedPromo })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
