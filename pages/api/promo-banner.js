import fs from 'fs'
import path from 'path'

const BANNER_PATH = path.resolve(process.cwd(), 'api/data/promo-banner.json')

function readJSON(file) {
  if (!fs.existsSync(file)) return {}
  try {
    const content = fs.readFileSync(file, 'utf-8')
    if (!content.trim()) return {}
    return JSON.parse(content)
  } catch (e) {
    return {}
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const banner = readJSON(BANNER_PATH)
    return res.status(200).json(banner)
  } else if (req.method === 'POST') {
    const { active, code, message, type, value } = req.body
    if (
      typeof active !== 'boolean' ||
      !code ||
      !type ||
      typeof value !== 'number'
    ) {
      return res
        .status(400)
        .json({ error: 'Paramètres manquants ou invalides' })
    }
    writeJSON(BANNER_PATH, {
      active,
      code,
      message: message || '',
      type,
      value
    })
    return res.status(200).json({ success: true })
  } else {
    res.status(405).json({ error: 'Méthode non autorisée' })
  }
}
