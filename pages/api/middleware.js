import jwt from 'jsonwebtoken'

export function withAuth(handler) {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token manquant' })
      }

      const token = authHeader.split(' ')[1]

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        return handler(req, res)
      } catch (err) {
        return res.status(401).json({ message: 'Token invalide' })
      }
    } catch (error) {
      return res.status(500).json({ message: 'Erreur serveur' })
    }
  }
}
