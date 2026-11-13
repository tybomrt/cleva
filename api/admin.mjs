// Fonction serverless Vercel — interface d'administration des mariages (page /admin/<adresse secrète>/).
// POST { action: 'login' | 'logout' | 'me' | 'list' | 'save' | 'extend' | 'archive' | 'restore' | 'delete', … }
// GET  ?action=photo&id=…&role=… (photos, y compris archivées, pour la page d'administration)
// Tout sauf « login » exige la session (cookie HttpOnly). Logique : api/_lib/admin-handlers.mjs.
// Variables d'environnement : DATABASE_URL, DOSSIER_SALT, ADMIN_PASSWORD.
import { adminHandler } from './_lib/live.mjs';

export const config = { regions: ['fra1'] };

export default adminHandler;
