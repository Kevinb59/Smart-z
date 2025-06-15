import Stripe from 'stripe'
import { db } from '../../utils/firebase-admin'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config()

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    maxDuration: 60
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
  // Ajout des en-têtes CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, stripe-signature'
  )

  // Gestion des requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  console.log('📥 Webhook reçu:', req.method, req.headers)

  if (req.method !== 'POST') {
    console.log('❌ Méthode non autorisée:', req.method)
    return res.status(405).end('Méthode non autorisée')
  }

  const sig = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET manquant')
    return res.status(500).end('Configuration manquante')
  }

  console.log('🔑 Signature reçue:', sig ? 'Oui' : 'Non')

  const buf = await buffer(req)
  console.log('📦 Corps reçu:', buf.length, 'octets')

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, secret)
    console.log('✅ Événement validé:', event.type)
  } catch (err) {
    console.error('❌ Signature invalide:', err.message)
    return res.status(400).send(`Signature invalide: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    console.log('💳 Paiement complété, traitement...')
    const session = event.data.object
    const metadata = session.metadata

    if (!metadata) {
      console.warn('⚠️ Session sans métadonnées valides')
      return res.status(200).end('Aucune donnée à traiter')
    }

    console.log('📋 Métadonnées:', JSON.stringify(metadata, null, 2))

    try {
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
          baseId = `${lastLetter}${(lastNumber + 1)
            .toString()
            .padStart(3, '0')}`
        }
      }

      console.log('🆔 Nouvel ID de base:', baseId)

      // Récupération des designs depuis les métadonnées
      const designs = []
      let i = 1
      while (metadata[`design_${i}`]) {
        try {
          const design = JSON.parse(metadata[`design_${i}`])
          designs.push(design)
          console.log(`📱 Design ${i} chargé:`, design.phones)
        } catch (err) {
          console.error(`❌ Erreur parsing design ${i}:`, err)
        }
        i++
      }

      if (designs.length === 0) {
        console.error('❌ Aucun design trouvé dans les métadonnées')
        return res.status(400).end('Aucun design trouvé')
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

        console.log(`📝 Création commande ${orderId}:`, orderData.phones)
        const docRef = ordersRef.doc(orderId)
        batch.set(docRef, orderData)
        orders.push(orderData)
      }

      await batch.commit()
      console.log(`✅ ${orders.length} commande(s) créée(s)`)

      // Récupération du code promo appliqué (si présent)
      let appliedPromo = null
      if (session.total_details?.amount_discount > 0) {
        try {
          const discount = session.total_details.breakdown?.discounts?.[0]
          const couponId = discount?.discount?.coupon?.id
          if (couponId) {
            const coupon = await stripe.coupons.retrieve(couponId)
            appliedPromo = coupon.name || coupon.id
            console.log('🎟️ Code promo appliqué:', appliedPromo)
          }
        } catch (err) {
          console.warn('⚠️ Erreur récupération du code promo:', err)
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
        console.log('✅ Code promo mis à jour dans les commandes')
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
          console.log('✅ Notification GAS envoyée')
        } catch (e) {
          console.warn('⚠️ Envoi à GAS échoué (non bloquant):', e)
        }
      }

      return res
        .status(200)
        .json({ success: true, orders: orders.map((o) => o.id) })
    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  console.log('ℹ️ Événement ignoré:', event.type)
  res.status(200).end('Événement ignoré')
}
