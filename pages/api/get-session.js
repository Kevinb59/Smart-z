import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sessionId } = req.body
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    res.status(200).json(session)
  } catch (error) {
    console.error('Erreur:', error)
    res
      .status(500)
      .json({ error: 'Erreur lors de la récupération de la session' })
  }
}
