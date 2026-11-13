// Fonction serverless Vercel — photo d'un dossier : GET /api/photo?d=<id secret>&r=marie1|marie2|temoin1|temoin2
// Les photos ne sont jamais des fichiers publics : sans l'id secret (128 bits), aucune URL ne marche.
import { photoHandler } from './_lib/live.mjs';

export const config = { regions: ['fra1'] };

export default photoHandler;
