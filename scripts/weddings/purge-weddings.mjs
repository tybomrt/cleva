#!/usr/bin/env node
// Supprime les mariages dont la date est dépassée de plus de 30 jours (photos comprises),
// et les traces d'essais de plus d'un jour.
//
//   npm run purge-weddings              → supprime
//   npm run purge-weddings -- --dry-run → affiche seulement ce qui serait supprimé
//
// Lit DATABASE_URL dans .env.
import { sql } from '../../api/_lib/db.mjs';

const dry = process.argv.includes('--dry-run');
const db = sql();
const WHERE = "wedding_date < current_date - interval '30 days'";

const rows = dry
  ? await db(`SELECT marie1_prenom, marie1_nom, marie2_prenom, marie2_nom, wedding_date::text AS d FROM weddings WHERE ${WHERE} ORDER BY wedding_date`)
  : await db(`DELETE FROM weddings WHERE ${WHERE} RETURNING marie1_prenom, marie1_nom, marie2_prenom, marie2_nom, wedding_date::text AS d`);
if (!dry) await db("DELETE FROM dossier_attempts WHERE at < now() - interval '1 day'");

const verb = dry ? 'serait supprimé' : 'supprimé';
for (const r of rows) console.log('  ' + verb + ' : ' + r.marie1_prenom + ' ' + r.marie1_nom + ' & ' + r.marie2_prenom + ' ' + r.marie2_nom + ' (' + r.d + ')');
console.log((dry ? '(essai) ' : '✓ ') + rows.length + ' mariage(s) ' + (dry ? 'à supprimer' : 'supprimé(s)') + '.');
