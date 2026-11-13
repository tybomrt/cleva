// Fonction serverless Vercel — tâche quotidienne (Vercel Cron, voir « crons » dans vercel.json) :
// archive les mariages arrivés à échéance, supprime définitivement ceux archivés depuis plus d'un an.
// Vercel l'appelle avec « Authorization: Bearer <CRON_SECRET> » ; sans ce secret, elle refuse.
import { cronHandler } from './_lib/live.mjs';

export const config = { regions: ['fra1'] };

export default cronHandler;
