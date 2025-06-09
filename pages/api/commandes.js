import fs from 'fs'
import path from 'path'
import { withAuth } from './middleware'

export default withAuth(function handler(req, res) {
  const commandesPath = path.resolve(process.cwd(), 'api/data/commandes.json')

  if (req.method === 'GET') {
    try {
      const raw = fs.readFileSync(commandesPath, 'utf-8')
      const commandes = JSON.parse(raw)
      res.status(200).json(commandes)
    } catch (err) {
      console.error('Erreur lecture commandes.json :', err)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Méthode ${req.method} non autorisée`)
  }
})
