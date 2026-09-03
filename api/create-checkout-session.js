// Fonction serverless Vercel — crée une Stripe Checkout Session dynamique
// à partir de la quantité de tables choisie, en remplacement des 15 liens
// de paiement statiques créés à la main dans le dashboard Stripe.

import Stripe from 'stripe';

// Même raison qu'api/retraction.js / api/subscribe.js : rapprocher
// l'exécution du reste de l'infra plutôt que du défaut US.
export const config = {
  regions: ['cdg1']
};

const SITE_URL = 'https://www.cleva-games.fr';
const QTE_MAX = 15;

// Grille tarifaire dégressive : doit rester identique à prixParBoite()
// dans scripts/main.js (source de vérité pour l'affichage côté client).
function prixParBoite(n) {
  if (n >= 8) return 25;
  if (n >= 5) return 28;
  return 30;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const quantity = parseInt(req.body && req.body.quantity, 10);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > QTE_MAX) {
    return res.status(400).json({ error: 'Quantité invalide.' });
  }

  const prixUnitaire = prixParBoite(quantity);
  const totalCents = quantity * prixUnitaire * 100;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      allow_promotion_codes: true,
      shipping_address_collection: {
        allowed_countries: ['FR']
      },
      custom_fields: [
        {
          key: 'date_mariage',
          label: { type: 'custom', custom: 'Date du mariage (JJ/MM/AAAA)' },
          type: 'text'
        }
      ],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: totalCents,
            product_data: {
              name: 'cleva. — ' + quantity + (quantity > 1 ? ' boîtes' : ' boîte'),
              description: quantity + ' × ' + prixUnitaire + ' € la boîte'
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        quantity: String(quantity)
      },
      success_url: SITE_URL + '/produit?commande=confirmee',
      cancel_url: SITE_URL + '/produit'
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-checkout-session error', err);
    return res.status(502).json({ error: 'Paiement momentanément indisponible.' });
  }
}
