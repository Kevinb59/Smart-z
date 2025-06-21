/* =========================================================================================================
   A P I   D E   L ' A D M I N   D A T A
   =========================================================================================================
   Cette API centralise :
   - Le chargement de la bannière promotionnelle (promoBanner)
   - Le chargement des marques et modèles (phonesData)
   - Le chargement des commandes (commandes)
   - Toute la logique Firestore est ici (côté backend uniquement)
   - Sécurité maximale (aucun accès Firestore côté client)
   ========================================================================================================= */

import Stripe from 'stripe'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import { withAuth } from './middleware'
import { db } from '../../lib/firebase-admin'

dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function login(req, res) {
  const { email, password } = req.body
  if (email === 'Smartzadmin' && password === 't94X!uM2@dzv#F7q') {
    const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    })
    return res.status(200).json({ token })
  }
  return res.status(401).json({ message: 'Identifiants invalides' })
}

async function promoBannerGet(req, res) {
  try {
    const doc = await db.collection('config').doc('promoBanner').get()
    const banner = doc.exists ? doc.data() : {}
    return res.status(200).json(banner)
  } catch (error) {
    console.error('Erreur récupération bannière:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

async function promoBannerSet(req, res) {
  const { active, code, message, type, value } = req.body
  if (
    typeof active !== 'boolean' ||
    !code ||
    !type ||
    typeof value !== 'number'
  ) {
    return res.status(400).json({ error: 'Paramètres manquants ou invalides' })
  }
  try {
    await db
      .collection('config')
      .doc('promoBanner')
      .set({
        active,
        code,
        message: message || '',
        type,
        value
      })
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Erreur mise à jour bannière:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

async function stripePromos(req, res) {
  const BLACKLIST = [
    'test100',
    'TESTADMIN100',
    'LAURENT100',
    'CHARLOTTE100',
    'ELISABETH100',
    'REDUC100'
  ]
  const promoCodes = await stripe.promotionCodes.list({
    limit: 100,
    expand: ['data.coupon']
  })
  const promos = promoCodes.data
    .filter((p) => !BLACKLIST.includes(p.code))
    .map((p) => ({
      coupon: p.coupon
        ? {
            id: p.coupon.id,
            name: p.coupon.name || 'Sans nom',
            percent_off: p.coupon.percent_off,
            amount_off: p.coupon.amount_off,
            duration: p.coupon.duration,
            duration_in_months: p.coupon.duration_in_months,
            max_redemptions: p.coupon.max_redemptions,
            redeem_by: p.coupon.redeem_by,
            valid: p.coupon.valid
          }
        : {},
      promotion_code: {
        id: p.id,
        code: p.code,
        times_redeemed: p.times_redeemed,
        active: p.active
      }
    }))
  res.status(200).json({ success: true, promos })
}

async function stripeTogglePromo(req, res) {
  const { code, active } = req.body
  if (!code || typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Paramètres manquants ou invalides' })
  }
  const promoCodes = await stripe.promotionCodes.list({ code, limit: 1 })
  if (!promoCodes.data.length) {
    return res.status(404).json({ error: 'Code promo introuvable sur Stripe' })
  }
  const promoId = promoCodes.data[0].id
  const updatedPromo = await stripe.promotionCodes.update(promoId, { active })
  res.status(200).json({ success: true, code, active, updatedPromo })
}

async function stripeRefund(req, res) {
  const { transactionId } = req.body
  if (!transactionId) {
    return res.status(400).json({ error: 'ID de transaction manquant' })
  }
  const payment = await stripe.paymentIntents.retrieve(transactionId)
  if (payment.amount_refunded > 0) {
    return res
      .status(400)
      .json({ error: 'Cette transaction a déjà été remboursée' })
  }
  if (payment.status !== 'succeeded') {
    return res
      .status(400)
      .json({ error: 'Cette transaction ne peut pas être remboursée' })
  }
  const refund = await stripe.refunds.create({
    payment_intent: transactionId,
    reason: 'requested_by_customer'
  })
  console.log(`Remboursement effectué pour la transaction ${transactionId}`)
  return res.status(200).json({
    success: true,
    refund_id: refund.id,
    amount: refund.amount,
    status: refund.status
  })
}

async function stripeTransactions(_req, res) {
  const sessions = await stripe.checkout.sessions.list({
    limit: 100,
    expand: ['data.payment_intent']
  })
  const transactions = sessions.data
    .filter((s) => s.payment_intent)
    .map((session) => {
      const pi = session.payment_intent
      const client = session.customer_details?.name || 'Client inconnu'
      const email = session.customer_details?.email || 'Email inconnu'
      const montant = session.amount_total || pi?.amount || 0
      let statut = 'Annulé'
      if (session.status === 'complete' && pi?.status === 'succeeded') {
        statut = pi.amount_refunded > 0 ? 'Remboursé' : 'Validé'
      } else if (session.status === 'expired' || pi?.status === 'canceled') {
        statut = 'Annulé'
      }
      const type = pi.payment_method_types?.[0]
      let moyen = 'Inconnu'
      if (type) moyen = type.charAt(0).toUpperCase() + type.slice(1)
      return {
        id: pi.id,
        client,
        email,
        date: session.created,
        montant,
        statut,
        moyen_paiement: moyen
      }
    })
    .filter((t) => t.email.toLowerCase() !== 'kevinblart@live.fr')
  transactions.sort((a, b) => b.date - a.date)
  return res.status(200).json(transactions)
}

async function brandsModels(req, res) {
  if (req.method === 'GET') {
    try {
      const doc = await db.collection('phones').doc('phonesData').get()
      const data = doc.exists ? doc.data().brands || {} : {}
      return res.status(200).json(data)
    } catch (err) {
      console.error('Erreur récupération marques/modèles:', err)
      return res.status(500).json({ error: err.message })
    }
  } else if (req.method === 'POST') {
    const { type, marque, modele } = req.body
    try {
      const docRef = db.collection('phones').doc('phonesData')
      const doc = await docRef.get()
      let brands = doc.exists ? doc.data().brands || {} : {}

      if (type === 'addBrand' && marque) {
        if (!brands[marque]) brands[marque] = []
        await docRef.set({ brands }, { merge: true })
        return res
          .status(200)
          .json({ success: true, message: 'Marque ajoutée.' })
      }
      if (type === 'deleteBrand' && marque) {
        delete brands[marque]
        await docRef.set({ brands }, { merge: true })
        return res
          .status(200)
          .json({ success: true, message: 'Marque supprimée.' })
      }
      if (type === 'addModel' && marque && modele) {
        if (!brands[marque]) brands[marque] = []
        if (!brands[marque].includes(modele)) brands[marque].push(modele)
        await docRef.set({ brands }, { merge: true })
        return res
          .status(200)
          .json({ success: true, message: 'Modèle ajouté.' })
      }
      if (type === 'deleteModel' && marque && modele) {
        if (brands[marque]) {
          brands[marque] = brands[marque].filter((m) => m !== modele)
          await docRef.set({ brands }, { merge: true })
          return res
            .status(200)
            .json({ success: true, message: 'Modèle supprimé.' })
        }
      }
      return res.status(400).json({ error: 'Requête invalide.' })
    } catch (err) {
      console.error('Erreur modification marques/modèles:', err)
      return res.status(500).json({ error: err.message })
    }
  }
  return res.status(405).json({ error: 'Méthode non autorisée' })
}

async function commandes(_req, res) {
  try {
    const snapshot = await db.collection('commandes').get()
    const commandes = snapshot.docs.map((doc) => doc.data())
    return res.status(200).json(commandes)
  } catch (err) {
    console.error('Erreur lecture commandes:', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

async function handleAuthed(req, res) {
  const action = req.method === 'GET' ? req.query.action : req.body.action
  switch (action) {
    case 'promo-banner-get':
      return promoBannerGet(req, res)
    case 'promo-banner-set':
      return promoBannerSet(req, res)
    case 'stripe-promos':
      return stripePromos(req, res)
    case 'stripe-toggle-promo':
      return stripeTogglePromo(req, res)
    case 'stripe-refund':
      return stripeRefund(req, res)
    case 'stripe-transactions':
      return stripeTransactions(req, res)
    case 'brands-models':
      return brandsModels(req, res)
    case 'commandes':
      return commandes(req, res)
    default:
      return res.status(400).json({ error: 'Action inconnue' })
  }
}

export default async function handler(req, res) {
  const action = req.method === 'GET' ? req.query.action : req.body.action
  if (action === 'login') {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Méthode non autorisée' })
    }
    return login(req, res)
  }
  return withAuth(handleAuthed)(req, res)
}
