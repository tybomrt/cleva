// Fonction serverless Vercel — formulaire de rétractation (legal/retractation.html)
//
// Envoie deux emails via le SMTP OVH de cleva-games.fr :
//   1. la notification de rétractation à contact@cleva-games.fr
//   2. un accusé de réception au client (obligatoire "sans délai",
//      article L221-21 du Code de la consommation)
//
// Variables d'environnement requises (à configurer sur Vercel) :
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
//   CONTACT_EMAIL (optionnel, défaut : contact@cleva-games.fr)

import nodemailer from 'nodemailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = { nom: 200, email: 200, commande: 100, reception: 100, message: 2000 };

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLen);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // Piège à bots : champ caché côté formulaire, jamais rempli par un humain.
  if (clean(body.website, 100)) {
    return res.status(200).json({ ok: true });
  }

  const nom = clean(body.nom, MAX_LEN.nom);
  const email = clean(body.email, MAX_LEN.email);
  const commande = clean(body.commande, MAX_LEN.commande);
  const reception = clean(body.reception, MAX_LEN.reception);
  const message = clean(body.message, MAX_LEN.message);

  if (!nom || !email || !commande || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
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

  const recap =
    'Nom : ' + nom + '\n' +
    'Email : ' + email + '\n' +
    'Commande passée le : ' + commande + '\n' +
    (reception ? 'Produit reçu le : ' + reception + '\n' : '') +
    (message ? '\nMessage :\n' + message + '\n' : '');

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: contactEmail,
      replyTo: email,
      subject: 'Rétractation — ' + nom,
      text: 'Nouvelle demande de rétractation reçue via le site.\n\n' + recap
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Confirmation de réception de votre rétractation — cleva.',
      text:
        'Bonjour ' + nom + ',\n\n' +
        'Nous avons bien reçu votre demande de rétractation concernant votre commande ' +
        'du ' + commande + '. Conformément à l\'article L221-21 du Code de la consommation, ' +
        'ce message vaut accusé de réception.\n\n' +
        'Nous revenons vers vous rapidement pour la suite (modalités de retour du produit ' +
        'et remboursement).\n\n' +
        'Récapitulatif de votre demande :\n' + recap +
        '\nL\'équipe cleva.'
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('retraction email error', err);
    return res.status(502).json({ error: 'Envoi impossible pour le moment.' });
  }
}
