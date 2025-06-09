import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Méthode non autorisée' })
  }

  const { email, password } = req.body

  // Vérification des identifiants
  if (email === 'Smartzadmin' && password === 't94X!uM2@dzv#F7q') {
    // Création du token JWT avec le rôle admin
    const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    })

    return res.status(200).json({ token })
  }

  return res.status(401).json({ message: 'Identifiants invalides' })
}
