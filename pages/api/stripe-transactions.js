import Stripe from 'stripe'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function verifyJWT(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'admin') return null
    return payload
  } catch (e) {
    return null
  }
}

export default async function handler(req, res) {
  // Vérification de la méthode HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // Vérification de l'authentification
    const user = verifyJWT(req)
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    // Récupération des paiements avec les charges expandues
    const payments = await stripe.paymentIntents.list({
      limit: 100,
      expand: ['data.charges']
    })

    // Pour chaque paiement, récupérer la charge associée pour avoir les infos client
    const transactions = await Promise.all(
      payments.data.map(async (payment) => {
        let name = 'Client inconnu'
        let email = 'Email inconnu'
        let payment_method = ''
        let payment_brand = ''
        // On récupère la charge principale liée au payment_intent
        const charges = payment.charges?.data || []
        if (charges.length > 0) {
          const charge = charges[0]
          if (charge.billing_details) {
            name = charge.billing_details.name || name
            email = charge.billing_details.email || email
          }
          if (
            charge.payment_method_details &&
            charge.payment_method_details.card
          ) {
            payment_method = 'Carte'
            payment_brand = charge.payment_method_details.card.brand
          } else if (
            charge.payment_method_details &&
            charge.payment_method_details.type
          ) {
            payment_method = charge.payment_method_details.type
          }
        }
        return {
          client: name,
          email,
          date: payment.created,
          montant: payment.amount,
          statut: payment.status === 'succeeded' ? 'Validé' : 'Annulé',
          moyen_paiement: payment_method
            ? `${payment_method} ${payment_brand}`.trim()
            : ''
        }
      })
    )

    // Tri par date (plus récent en premier)
    transactions.sort((a, b) => b.date - a.date)

    return res.status(200).json(transactions)
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error)
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message })
  }
}
