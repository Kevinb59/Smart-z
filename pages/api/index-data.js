/* =========================================================================================================
   I N D E X - D A T A   A P I   ( P A G E S   P U B L I C / I N D E X . H T M L )
   =========================================================================================================
   Cette API centralise :
   - Le chargement de la bannière promotionnelle (promoBanner)
   - Le chargement des marques et modèles (phonesData)
   - Toute la logique Firestore est ici (côté backend uniquement)
   - Sécurité maximale (aucun accès Firestore côté client)
   ========================================================================================================= */
import { db } from '../../lib/firebase-admin'

export default async function handler(req, res) {
  try {
    //🔄  CHARGEMENT DE LA BANNIÈRE PROMO
    const promoSnap = await db.collection('config').doc('promoBanner').get()
    const promo = promoSnap.exists ? promoSnap.data() : null

    //🔄  CHARGEMENT DES MARQUES ET MODÈLES DE TÉLÉPHONES
    const phonesSnap = await db.collection('phones').doc('phonesData').get()
    const brands = phonesSnap.exists ? phonesSnap.data().brands : {}

    //✅  RÉPONSE API
    res.status(200).json({ promo, brands })
  } catch (error) {
    //❌ GESTION DES ERREURS SERVEUR
    console.error('❌ Erreur API index-data:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
}
