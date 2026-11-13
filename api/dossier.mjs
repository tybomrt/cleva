// Fonction serverless Vercel — écran « Retrouver le dossier » des pages d'énigme (/m/).
// POST { prenom1, nom1, prenom2, nom2 } → { status: 'ok', dossier } | { status: 'more' | 'none' | 'wait' }
// Toute la logique est dans api/_lib/ (testée par tests/dossier.test.mjs).
// Variables d'environnement : DATABASE_URL (Neon, projet cleva-dossiers), DOSSIER_SALT.
import { dossierHandler } from './_lib/live.mjs';

// Au plus près de la base Neon (Francfort).
export const config = { regions: ['fra1'] };

export default dossierHandler;
