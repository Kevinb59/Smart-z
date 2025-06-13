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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    const user = verifyJWT(req)
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ['data.payment_intent']
    })

    const transactions = checkoutSessions.data
      .filter((session) => session.payment_intent)
      .map((session) => {
        const paymentIntent = session.payment_intent

        const clientName = session.customer_details?.name || 'Client inconnu'
        const clientEmail = session.customer_details?.email || 'Email inconnu'
        const montant = session.amount_total || paymentIntent?.amount || 0

        let statut = 'Inconnu'
        if (
          session.status === 'complete' &&
          paymentIntent?.status === 'succeeded'
        ) {
          statut = paymentIntent.amount_refunded > 0 ? 'Remboursé' : 'Validé'
        } else if (
          session.status === 'expired' ||
          paymentIntent?.status === 'canceled'
        ) {
          statut = 'Annulé'
        } else {
          statut = 'Annulé'
        }

        // Méthode de paiement depuis payment_intent
        let moyenPaiementFinal = 'Inconnu'
        const type = paymentIntent.payment_method_types?.[0]
        if (type) {
          moyenPaiementFinal = type.charAt(0).toUpperCase() + type.slice(1)
        }

        return {
          id: paymentIntent.id,
          client: clientName,
          email: clientEmail,
          date: session.created,
          montant: montant,
          statut: statut,
          moyen_paiement: moyenPaiementFinal
        }
      })

    const filteredTransactions = transactions.filter(
      (t) => t.email.toLowerCase() !== 'kevinblart@live.fr'
    )

    filteredTransactions.sort((a, b) => b.date - a.date)

    return res.status(200).json(filteredTransactions)
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error)
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message })
  }
}
