import React from 'react'
import Link from 'next/link'

export default function Success() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <h1>Paiement accepté !</h1>
      <p>
        Merci pour votre commande. Votre paiement a bien été pris en compte et
        votre commande est en cours de traitement.
      </p>
      <Link href="/">
        <button
          style={{
            marginTop: 24,
            padding: '12px 32px',
            fontSize: '1.1em',
            borderRadius: 8,
            background: '#6c47ff',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Retour à l'accueil
        </button>
      </Link>
    </div>
  )
}
