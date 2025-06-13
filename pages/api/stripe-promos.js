import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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
    // Récupérer tous les promotion_codes (et leurs coupons associés) depuis Stripe
    const promoCodes = await stripe.promotionCodes.list({
      limit: 100,
      expand: ['data.coupon']
    })

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
          active: promotion_code.active // état réel Stripe
        }
      }))

    res.status(200).json({ success: true, promos })
  } catch (err) {
    console.error('❌ Erreur dans /api/stripe-promos :', err.message, err.stack)
    res.status(500).json({ error: err.message })
  }
}
