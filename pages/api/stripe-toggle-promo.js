import fs from 'fs'
import path from 'path'
import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const DATA_PATH = path.resolve(process.cwd(), 'api/data/promo-codes.json')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }
  const { code, active } = req.body
  if (!code || typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Paramètres manquants ou invalides' })
  }
  try {
    let data = {}
    if (fs.existsSync(DATA_PATH)) {
      data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    }
    // Désactiver/activer sur Stripe
    // 1. Chercher l'ID Stripe du code promo
    const promoCodes = await stripe.promotionCodes.list({ code, limit: 1 })
    if (!promoCodes.data.length) {
      return res
        .status(404)
        .json({ error: 'Code promo introuvable sur Stripe' })
    }
    const promoId = promoCodes.data[0].id
    await stripe.promotionCodes.update(promoId, { active })
    // 2. Mettre à jour le local
    if (data[code] && typeof data[code] === 'object') {
      data[code].active = active
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
    res.status(200).json({ success: true, code, active })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
