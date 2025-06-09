import Stripe from 'stripe'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const DATA_PATH = path.resolve(process.cwd(), 'api/data/promo-codes.json')

// Liste des codes à masquer dans l'admin
const BLACKLIST = [
  'test100',
  'TESTADMIN100',
  'LAURENT100',
  'CHARLOTTE100',
  'ELISABETH100',
  'REDUC100'
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // Lire l'état local
    let localStates = {}
    if (fs.existsSync(DATA_PATH)) {
      localStates = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    }
    // Récupérer tous les promotion_codes (et leurs coupons associés)
    const promoCodes = await stripe.promotionCodes.list({
      limit: 100,
      expand: ['data.coupon']
    })

    // Synchroniser le JSON enrichi pour TOUS les codes (actifs et inactifs)
    let updated = false
    promoCodes.data.forEach((p) => {
      const code = p.code
      let type = 'percent'
      let value = 0
      if (p.coupon.amount_off) {
        type = 'amount'
        value = p.coupon.amount_off / 100 // Stripe stocke en centimes
      } else if (p.coupon.percent_off) {
        type = 'percent'
        value = p.coupon.percent_off
      }
      // L'état actif est celui de Stripe (et du coupon)
      const active = p.active && p.coupon && p.coupon.valid
      // Met à jour ou ajoute l'objet enrichi
      localStates[code] = { active, type, value }
      updated = true
    })
    if (updated) {
      fs.writeFileSync(DATA_PATH, JSON.stringify(localStates, null, 2), 'utf-8')
    }

    // Retourner TOUS les codes à l'admin
    const promos = promoCodes.data
      .filter((promotion_code) => !BLACKLIST.includes(promotion_code.code))
      .map((promotion_code) => ({
        coupon: promotion_code.coupon
          ? {
              id: promotion_code.coupon.id,
              name: promotion_code.coupon.name || 'Sans nom',
              percent_off: promotion_code.coupon.percent_off,
              amount_off: promotion_code.coupon.amount_off,
              duration: promotion_code.coupon.duration,
              duration_in_months: promotion_code.coupon.duration_in_months,
              max_redemptions: promotion_code.coupon.max_redemptions,
              redeem_by: promotion_code.coupon.redeem_by,
              valid: promotion_code.coupon.valid
            }
          : {},
        promotion_code: {
          id: promotion_code.id,
          code: promotion_code.code,
          times_redeemed: promotion_code.times_redeemed,
          // L'état actif est celui du fichier local s'il existe, sinon Stripe
          active:
            localStates[promotion_code.code] &&
            typeof localStates[promotion_code.code] === 'object'
              ? localStates[promotion_code.code].active
              : promotion_code.active
        }
      }))

    res.status(200).json({ success: true, promos })
  } catch (err) {
    console.error('❌ Erreur dans /api/stripe-promos :', err.message, err.stack)
    res.status(500).json({ error: err.message })
  }
}
