export default function handler(req, res) {
  res.status(200).json({
    GAS_URL_CONTACT: process.env.GAS_URL_CONTACT,
    GAS_SECRET: process.env.GAS_SECRET
  })
}
