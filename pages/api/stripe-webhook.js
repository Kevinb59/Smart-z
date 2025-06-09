import fs from 'fs'
import path from 'path'
import Stripe from 'stripe'
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

    if (!metadata || !metadata.idBase) {
      console.warn('Session sans métadonnées valides')
      return res.status(200).end('Aucune donnée à traiter')
    }

    // 🔍 Récupération du code promo appliqué (si présent)
    let appliedPromo = null
    if (session.total_details?.amount_discount > 0) {
      try {
        const discount = session.total_details.breakdown?.discounts?.[0]
        const couponId = discount?.discount?.coupon?.id

        if (couponId) {
          const coupon = await stripe.coupons.retrieve(couponId)
          const promoCode = coupon.name || coupon.id

          // Vérifie si le code promo est actif
          if (isPromoCodeActive(promoCode)) {
            appliedPromo = promoCode
            console.log('Code promo actif appliqué:', promoCode)
          } else {
            console.log('Code promo inactif ignoré:', promoCode)
            // Annule la session car le code promo n'est pas actif
            await stripe.checkout.sessions.expire(session.id)
            return res.status(400).json({ error: 'Code promo invalide' })
          }
        }
      } catch (err) {
        console.warn('Erreur récupération du code promo :', err)
      }
    }

    const commandesPath = path.resolve(process.cwd(), 'api/data/commandes.json')
    let commandes = []

    try {
      const raw = fs.readFileSync(commandesPath, 'utf-8')
      commandes = JSON.parse(raw)
    } catch {
      console.warn('Fichier commandes.json vide ou absent, création…')
    }

    // Récupération de tous les designs depuis les métadonnées
    const designs = Object.keys(metadata)
      .filter((key) => key.startsWith('design_'))
      .map((key) => JSON.parse(metadata[key]))

    const totalAmount = session.amount_total || 0
    const amountPerDesign = Math.round(totalAmount / designs.length)
    const now = new Date().toISOString()

    const newCommandes = designs.map((design) =>
      clean({
        id: design.id,
        firstName: metadata.firstName,
        lastName: metadata.lastName,
        email: metadata.email,
        phone: metadata.phone,
        address: metadata.address,
        address2: metadata.address2,
        city: metadata.city,
        zipCode: metadata.zipCode,
        phones: design.phones,
        customText: design.customText || null,
        fontChoice: design.fontChoice || null,
        quantity: design.quantity,
        imageUrl: design.imageUrl,
        amountPaid: amountPerDesign,
        promoCode: appliedPromo,
        status: 'En attente',
        lastStatusMailed: null,
        createdAt: now
      })
    )

    try {
      fs.writeFileSync(
        commandesPath,
        JSON.stringify([...commandes, ...newCommandes], null, 2)
      )
      console.log(`✔️ ${newCommandes.length} commande(s) enregistrée(s)`)
    } catch (e) {
      console.error('Erreur écriture commandes.json :', e)
      return res.status(500).end('Erreur serveur')
    }

    // ✉️ Envoi à Google Apps Script
    const GAS_URL = process.env.GAS_URL
    const GAS_SECRET = process.env.GAS_SECRET

    for (const commande of newCommandes) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GAS_SECRET}`
          },
          body: JSON.stringify(commande)
        })
      } catch (e) {
        console.error(`❌ Envoi à GAS échoué pour ${commande.id} :`, e)
      }
    }

    return res.status(200).end('OK')
  }

  res.status(200).end('Événement ignoré')
}
