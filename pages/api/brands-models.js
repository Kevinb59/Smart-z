import fs from 'fs'
import path from 'path'

const DATA_PATH = path.resolve(process.cwd(), 'api/data/brands-models.json')

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
      res.status(200).json(data)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  } else if (req.method === 'POST') {
    const { type, marque, modele } = req.body
    let data = {}
    if (fs.existsSync(DATA_PATH)) {
      data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    }
    if (type === 'addBrand' && marque) {
      if (!data[marque]) data[marque] = []
      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
      return res.status(200).json({ success: true, message: 'Marque ajoutée.' })
    }
    if (type === 'deleteBrand' && marque) {
      delete data[marque]
      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
      return res
        .status(200)
        .json({ success: true, message: 'Marque supprimée.' })
    }
    if (type === 'addModel' && marque && modele) {
      if (!data[marque]) data[marque] = []
      if (!data[marque].includes(modele)) data[marque].push(modele)
      fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
      return res.status(200).json({ success: true, message: 'Modèle ajouté.' })
    }
    if (type === 'deleteModel' && marque && modele) {
      if (data[marque]) {
        data[marque] = data[marque].filter((m) => m !== modele)
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
        return res
          .status(200)
          .json({ success: true, message: 'Modèle supprimé.' })
      }
    }
    res.status(400).json({ error: 'Requête invalide.' })
  } else {
    res.status(405).json({ error: 'Méthode non autorisée' })
  }
}
