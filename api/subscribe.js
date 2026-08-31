// Fonction serverless Vercel — formulaire "Prévenez-moi"
// Envoie une notification à contact@cleva-games.fr via le SMTP OVH.

import nodemailer from 'nodemailer';

// Exécute la fonction en Europe plutôt qu'aux USA par défaut : le serveur
// SMTP OVH est en France (cf. api/retraction.js pour le détail).
export const config = {
  regions: ['cdg1']
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const email = clean(body.email, 200);

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email manquant ou invalide.' });
  }

  const contactEmail = process.env.CONTACT_EMAIL || 'contact@cleva-games.fr';

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) !== 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  try {
    await transporter.sendMail({
      from: '"cleva." <' + process.env.SMTP_USER + '>',
      to: contactEmail,
      replyTo: email,
      subject: 'Nouvelle inscription — Prévenez-moi',
      text: 'Nouvelle inscription à la liste d\'attente via le site.\n\nEmail : ' + email
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe email error', err);
    return res.status(502).json({ error: 'Envoi impossible pour le moment.' });
  }
}
