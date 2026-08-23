// Fonction serverless Vercel — formulaire "Prévenez-moi"
// Envoie via le SMTP OVH déjà configuré pour cleva-games.fr.
// À compléter : lire req.body, valider l'email, envoyer via nodemailer.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: implémenter l'envoi

  return res.status(200).json({ ok: true });
}
