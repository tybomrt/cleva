#!/usr/bin/env node
// SOLUTION DE SECOURS : la même chose est faite chaque nuit par la tâche quotidienne Vercel
// (api/cron-weddings.mjs). Ce script ne sert que si elle ne tourne plus, ou pour vérifier.
//
// Applique les règles des dossiers (api/_lib/admin-core.mjs) :
//   - archive les mariages dont l'échéance est passée (plus reconnus, photos plus servies) ;
//   - supprime définitivement (photos comprises) ceux archivés depuis plus d'un an ;
//   - efface les sessions d'administration expirées et les traces d'essais de plus d'un jour.
//
//   npm run purge-weddings              → applique
//   npm run purge-weddings -- --dry-run → affiche seulement ce qui serait fait
//
// Lit DATABASE_URL dans .env.
import { adminStore } from '../../api/_lib/db.mjs';
import { todayParis, dailyPlan, coupleName } from '../../api/_lib/admin-core.mjs';
import { runDaily } from '../../api/_lib/admin-handlers.mjs';

const dry = process.argv.includes('--dry-run');
const today = todayParis();
const all = await adminStore.listWeddings();
const byId = new Map(all.map((w) => [w.id, w]));
const plan = dailyPlan(all, today);

const say = (verb, ids, extra) => {
  for (const id of ids) {
    const w = byId.get(id);
    console.log('  ' + verb + ' : ' + coupleName(w) + ' (' + extra(w) + ')');
  }
};
say(dry ? 'serait archivé' : 'archivé', plan.archive, (w) => 'échéance ' + w.expires_at);
say(dry ? 'serait supprimé' : 'supprimé', plan.remove, (w) => 'archivé le ' + w.archived_on);

if (!dry) await runDaily(adminStore, today);
console.log((dry ? '(essai) ' : '✓ ') + plan.archive.length + ' mariage(s) ' + (dry ? 'à archiver' : 'archivé(s)') + ', ' +
  plan.remove.length + ' ' + (dry ? 'à supprimer définitivement' : 'supprimé(s) définitivement') + '.');
