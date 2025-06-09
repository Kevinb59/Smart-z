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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    // Vérification de l'authentification
    const user = verifyJWT(req)
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const { transactionId } = req.body

    if (!transactionId) {
      return res.status(400).json({ error: 'ID de transaction manquant' })
    }

    // Récupération du paiement pour vérifier son statut
    const payment = await stripe.paymentIntents.retrieve(transactionId)

    // Vérification si le paiement est déjà remboursé
    if (payment.amount_refunded > 0) {
      return res
        .status(400)
        .json({ error: 'Cette transaction a déjà été remboursée' })
    }

    // Vérification si le paiement est en statut "succeeded"
    if (payment.status !== 'succeeded') {
      return res
        .status(400)
        .json({ error: 'Cette transaction ne peut pas être remboursée' })
    }

    // Création du remboursement
    const refund = await stripe.refunds.create({
      payment_intent: transactionId,
      reason: 'requested_by_customer'
    })

    // Log de l'action
    console.log(`Remboursement effectué pour la transaction ${transactionId}`)

    return res.status(200).json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status
    })
  } catch (error) {
    console.error('Erreur lors du remboursement:', error)

    // Gestion des erreurs spécifiques à Stripe
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: 'Erreur de carte bancaire' })
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Requête invalide' })
    } else {
      return res.status(500).json({ error: 'Erreur serveur: ' + error.message })
    }
  }
}
