// Les deux fonctions branchées sur la vraie base (Vercel et serveur local).
import { makeDossierHandler, makePhotoHandler } from './handlers.mjs';
import { findCandidates, photoRoles, getPhoto, attemptStore, ipHash } from './db.mjs';

export const dossierHandler = makeDossierHandler({ findCandidates, photoRoles, rateStore: attemptStore, ipHash });
export const photoHandler = makePhotoHandler({ getPhoto });
