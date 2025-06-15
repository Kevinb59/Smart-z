import Stripe from 'stripe'
import { db } from '../../utils/firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

export const config = {
  api: {
    bodyParser: false // requis pour Stripe
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Lecture du corps brut (nécessaire à Stripe)
function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = []
    readable.on('data', (chunk) => chunks.push(chunk))
    readable.on('end', () => resolve(Buffer.concat(chunks)))
    readable.on('error', reject)
  })
}

// Supprime les champs vides
function clean(obj) {
  const copy = {}
  for (const key in obj) {
    const val = obj[key]
    if (val !== '' && val !== null && val !== undefined) {
      copy[key] = val
    }
  }
  return copy
}

// Vérifie si un code promo est actif
function isPromoCodeActive(code) {
  try {
    const promoPath = path.resolve(process.cwd(), 'api/data/promo-codes.json')
    const raw = fs.readFileSync(promoPath, 'utf-8')
    const promoCodes = JSON.parse(raw)
    return promoCodes[code]?.active === true
  } catch (err) {
    console.error('Erreur lecture promo-codes.json :', err)
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Méthode non autorisée')
  }

  const sig = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  const buf = await buffer(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, secret)
  } catch (err) {
    console.error('Signature invalide :', err.message)
    return res.status(400).send(`Signature invalide`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const metadata = session.metadata

    if (!metadata) {
      console.warn('Session sans métadonnées valides')
      return res.status(200).end('Aucune donnée à traiter')
    }

    // 🔢 Génération de l'ID de base A001, A002, etc.
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

    // Récupération des designs depuis les métadonnées
    const designs = []
    let i = 1
    while (metadata[`design_${i}`]) {
      designs.push(JSON.parse(metadata[`design_${i}`]))
      i++
    }

    const totalAmount = session.amount_total || 0
    const amountPerOrder = Math.round(totalAmount / designs.length)
    const now = new Date().toISOString()

    // 🔨 Création des documents Firestore
    const orders = []
    const batch = db.batch()

    for (let i = 0; i < designs.length; i++) {
      const design = designs[i]
      const orderId = designs.length === 1 ? baseId : `${baseId}-${i + 1}`

      const orderData = {
        id: orderId,
        baseId: designs.length > 1 ? baseId : null,
        firstName: metadata.firstName,
        lastName: metadata.lastName,
        email: metadata.email,
        phone: metadata.phone,
        address: metadata.address,
        address2: metadata.address2 || null,
        city: metadata.city,
        zipCode: metadata.zipCode,
        phones: design.phones,
        customText: design.customText || null,
        fontChoice: design.fontChoice || null,
        quantity: parseInt(design.quantity),
        imageUrl: design.imageUrl,
        amountPaid: amountPerOrder,
        promoCode: null,
        status: 'En attente',
        lastStatusMailed: null,
        createdAt: now,
        updatedAt: now
      }

      const docRef = ordersRef.doc(orderId)
      batch.set(docRef, orderData)
      orders.push(orderData)
    }

    try {
      await batch.commit()
      console.log(`✔️ ${orders.length} commande(s) créée(s)`)
    } catch (e) {
      console.error('Erreur création Firestore :', e)
      return res.status(500).end('Erreur serveur')
    }

    // Récupération du code promo appliqué (si présent)
    let appliedPromo = null
    if (session.total_details?.amount_discount > 0) {
      try {
        const discount = session.total_details.breakdown?.discounts?.[0]
        const couponId = discount?.discount?.coupon?.id
        if (couponId) {
          const coupon = await stripe.coupons.retrieve(couponId)
          appliedPromo = coupon.name || coupon.id
        }
      } catch (err) {
        console.warn('Erreur récupération du code promo :', err)
      }
    }

    // Mise à jour du code promo dans Firestore si besoin
    if (appliedPromo) {
      const batchPromo = db.batch()
      for (const order of orders) {
        const orderRef = ordersRef.doc(order.id)
        batchPromo.update(orderRef, { promoCode: appliedPromo })
      }
      await batchPromo.commit()
    }

    // Envoi à Google Apps Script (optionnel et silencieux)
    const GAS_URL = process.env.GAS_URL_NEW_ORDER
    if (GAS_URL && GAS_URL.startsWith('http')) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orders,
            sessionId: session.id,
            amountPaid: totalAmount,
            promoCode: appliedPromo
          })
        })
      } catch (e) {
        console.warn('Envoi à GAS échoué (non bloquant) :', e)
      }
    }

    return res.status(200).end('OK')
  }

  res.status(200).end('Événement ignoré')
}
