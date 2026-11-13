// Les fonctions branchées sur la vraie base (Vercel et serveur local).
import { makeDossierHandler, makePhotoHandler } from './handlers.mjs';
import { makeAdminHandler, makeCronHandler } from './admin-handlers.mjs';
import { findCandidates, photoRoles, getPhoto, attemptStore, ipHash, adminStore } from './db.mjs';

export const dossierHandler = makeDossierHandler({ findCandidates, photoRoles, rateStore: attemptStore, ipHash });
export const photoHandler = makePhotoHandler({ getPhoto });
export const adminHandler = makeAdminHandler({
  store: adminStore, rateStore: attemptStore, ipHash,
  password: () => process.env.ADMIN_PASSWORD || '',
});
export const cronHandler = makeCronHandler({ store: adminStore, secret: () => process.env.CRON_SECRET || '' });
