import dotenv from 'dotenv'
dotenv.config()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Méthode non autorisée' })
  }

  try {
    const GAS_URL = process.env.GAS_URL_STATUS_ORDER_MAIL

    if (!GAS_URL) {
      return res
        .status(500)
        .json({ status: 'error', message: 'URL GAS non configurée.' })
    }

    const commande = req.body

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commande)
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res
        .status(500)
        .json({
          status: 'error',
          message: 'Erreur côté GAS',
          details: errorText
        })
    }

    return res.status(200).json({ status: 'success' })
  } catch (error) {
    console.error('Erreur lors de l’appel à GAS:', error)
    return res.status(500).json({ status: 'error', message: 'Erreur serveur' })
  }
}
