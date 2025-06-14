import Stripe from 'stripe'
import { db } from '../../utils/firebase-admin'

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

    // Générer l'ID de base pour la commande
    const ordersRef = db.collection('commandes')
    const snapshot = await ordersRef.orderBy('id', 'desc').limit(1).get()
    let baseId = 'A001'

    if (!snapshot.empty) {
      const lastOrder = snapshot.docs[0].data()
      const lastId = lastOrder.id.split('-')[0]
      const lastLetter = lastId[0]
      const lastNumber = parseInt(lastId.substring(1))

      if (lastNumber >= 999) {
        const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1)
        baseId = `${nextLetter}001`
      } else {
        baseId = `${lastLetter}${(lastNumber + 1).toString().padStart(3, '0')}`
      }
    }

    // Créer les commandes dans Firestore
    const orders = []
    for (let i = 0; i < designs.length; i++) {
      const design = designs[i]
      const orderId = designs.length === 1 ? baseId : `${baseId}-${i + 1}`

      const orderData = {
        id: orderId,
        baseId: designs.length > 1 ? baseId : null,
        firstName,
        lastName,
        email,
        phone,
        address,
        address2,
        city,
        zipCode,
        phones: design.phones,
        customText: design.customText,
        fontChoice: design.fontChoice,
        quantity: parseInt(design.quantity),
        imageUrl: design.imageUrl,
        status: 'En attente',
        lastStatusMailed: null,
        createdAt: new Date().toISOString()
      }

      await ordersRef.doc(orderId).set(orderData)
      orders.push(orderData)
    }

    // Générer un line_item par design
    const line_items = designs.map((design, index) => ({
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

    // Générer les métadonnées Stripe (infos client + designs + orderIds)
    const metadata = {
      orderIds: orders.map((o) => o.id).join(','),
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
          [`design_${idx + 1}`]: JSON.stringify({
            ...design,
            id: orders[idx].id
          })
        }),
        {}
      )
    }

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel.html`,
      customer_email: email,
      metadata
    })

    // Appel GAS pour notification
    const GAS_URL = process.env.GAS_URL_NEW_ORDER
    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orders,
            sessionId: session.id
          })
        })
      } catch (e) {
        console.error('Erreur GAS:', e)
        // On continue même si GAS échoue
      }
    }

    res.status(200).json({ id: session.id })
  } catch (error) {
    console.error('Erreur:', error)
    res.status(500).json({ error: 'Erreur lors de la création de la commande' })
  }
}
