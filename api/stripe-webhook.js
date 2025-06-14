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

    if (!metadata || !metadata.orderIds) {
      console.warn('Session sans métadonnées valides')
      return res.status(200).end('Aucune donnée à traiter')
    }

    // Récupération des IDs de commande
    const orderIds = metadata.orderIds.split(',')
    const totalAmount = session.amount_total || 0
    const amountPerOrder = Math.round(totalAmount / orderIds.length)
    const now = new Date().toISOString()

    // Mise à jour des commandes dans Firestore
    const batch = db.batch()
    for (const orderId of orderIds) {
      const orderRef = db.collection('commandes').doc(orderId)
      batch.update(orderRef, {
        amountPaid: amountPerOrder,
        promoCode: null, // sera ajouté plus bas si besoin
        status: 'En attente',
        lastStatusMailed: null,
        updatedAt: now
      })
    }
    try {
      await batch.commit()
      console.log(`✔️ ${orderIds.length} commande(s) mise(s) à jour`)
    } catch (e) {
      console.error('Erreur mise à jour Firestore :', e)
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

    // Récupérer toutes les infos de la commande pour GAS
    const docs = await Promise.all(
      orderIds.map((id) => db.collection('commandes').doc(id).get())
    )
    const commandes = docs.map((doc) => doc.data())
    if (!commandes.length) return res.status(200).end('Aucune commande trouvée')

    // On prend les infos client du premier doc
    const clientFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'address',
      'address2',
      'city',
      'zipCode'
    ]
    const clientInfo = {}
    for (const f of clientFields) clientInfo[f] = commandes[0][f]

    // On regroupe tous les designs
    const designs = commandes.map((cmd) => ({
      id: cmd.id,
      phones: cmd.phones,
      imageUrl: cmd.imageUrl,
      customText: cmd.customText,
      fontChoice: cmd.fontChoice,
      quantity: cmd.quantity
    }))

    // Objet à envoyer à GAS
    const toGAS = {
      orderIds,
      ...clientInfo,
      amountPaid: totalAmount,
      promoCode: appliedPromo,
      designs
    }

    // Envoi à Google Apps Script (optionnel et silencieux)
    const GAS_URL = process.env.GAS_URL_NEW_ORDER
    if (GAS_URL && GAS_URL.startsWith('http')) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toGAS)
        })
      } catch (e) {
        console.warn('Envoi à GAS échoué (non bloquant) :', e)
      }
    } else {
      console.log('Aucune URL GAS valide, envoi ignoré.')
    }

    // Mise à jour du code promo dans Firestore si besoin
    if (appliedPromo) {
      const batchPromo = db.batch()
      for (const orderId of orderIds) {
        const orderRef = db.collection('commandes').doc(orderId)
        batchPromo.update(orderRef, { promoCode: appliedPromo })
      }
      await batchPromo.commit()
    }

    return res.status(200).end('OK')
  }

  res.status(200).end('Événement ignoré')
}
