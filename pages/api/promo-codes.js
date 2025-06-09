import fs from 'fs'
import path from 'path'
import { withAuth } from './middleware'

const CODES_PATH = path.resolve(process.cwd(), 'api/data/promo-codes.json')

export default withAuth(async function handler(req, res) {
  if (req.method === 'GET') {
    if (!fs.existsSync(CODES_PATH))
      return res
        .status(404)
        .json({ error: 'Fichier promo-codes.json introuvable' })
    const codes = JSON.parse(fs.readFileSync(CODES_PATH, 'utf-8'))
    res.status(200).json(codes)
  } else {
    res.status(405).json({ error: 'Méthode non autorisée' })
  }
})
