import dotenv from 'dotenv'
dotenv.config()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Méthode non autorisée' })
  }

  const { name, email, subject, message } = req.body

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Paramètres manquants' })
  }

  try {
    const GAS_URL_CONTACT = process.env.GAS_URL_CONTACT

    const params = new URLSearchParams()
    params.append('name', name)
    params.append('email', email)
    params.append('subject', subject || 'Sans sujet')
    params.append('message', message)

    const response = await fetch(`${GAS_URL_CONTACT}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })

    const data = await response.json()

    if (data.status === 'success') {
      res.status(200).json(data)
    } else {
      res.status(500).json(data)
    }
  } catch (error) {
    console.error('Erreur lors de l’appel à GAS:', error)
    res.status(500).json({ status: 'error', message: 'Erreur serveur' })
  }
}
