import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { db } from '../utils/firebase-admin'

export default function Success() {
  const router = useRouter()
  const { session_id } = router.query

  useEffect(() => {
    if (!session_id) return

    async function updateOrderStatus() {
      try {
        // Récupérer la session Stripe
        const response = await fetch('/api/get-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session_id })
        })
        const session = await response.json()

        if (session.payment_status === 'paid') {
          // Mettre à jour le statut des commandes dans Firestore
          const orderIds = session.metadata.orderIds.split(',')
          const batch = db.batch()

          for (const orderId of orderIds) {
            const orderRef = db.collection('commandes').doc(orderId)
            batch.update(orderRef, {
              status: 'En attente',
              amountPaid: session.amount_total,
              promoCode:
                session.total_details.amount_discount > 0
                  ? session.promotion_code
                  : null
            })
          }

          await batch.commit()
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error)
      }
    }

    updateOrderStatus()
  }, [session_id])

  return (
    <div className="success-page">
      <h1>Merci pour votre commande !</h1>
      <p>
        Votre paiement a été accepté et votre commande est en cours de
        traitement.
      </p>
      <p>Vous recevrez un email de confirmation dans quelques instants.</p>
      <a href="/" className="button">
        Retour à l'accueil
      </a>
    </div>
  )
}
