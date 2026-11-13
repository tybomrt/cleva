#!/usr/bin/env node
// Ajoute un mariage (« dossier ») à la base des pages d'énigme.
//
//   npm run add-wedding -- \
//     --date 2026-12-05 \
//     --m1-prenom Camille --m1-nom Dupont --m1-photo ~/photos/camille.jpg \
//     --m2-prenom Alex    --m2-nom Martin --m2-photo ~/photos/alex.jpg \
//     --t1-prenom Sam     --t1-photo ~/photos/sam.jpg \
//     --t2-prenom Léo     --t2-photo ~/photos/leo.jpg
//
// marie1 = Lucas dans les SMS · marie2 = Sacha dans les mails · temoin1 = Clara · temoin2 = Julien.
// Les photos sont recadrées au carré en 144 px (outil `sips` de macOS) et stockées dans la base,
// sans métadonnées (ni GPS, ni appareil). Les photos sont facultatives : sans photo, la page
// garde la photo par défaut. Lit DATABASE_URL dans .env.
import { parseArgs } from 'node:util';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { sql } from '../../api/_lib/db.mjs';
import { weddingKeys, matchScore } from '../../api/_lib/dossier-core.mjs';

const opts = {
  date: { type: 'string' },
  'm1-prenom': { type: 'string' }, 'm1-nom': { type: 'string' }, 'm1-photo': { type: 'string' },
  'm2-prenom': { type: 'string' }, 'm2-nom': { type: 'string' }, 'm2-photo': { type: 'string' },
  't1-prenom': { type: 'string' }, 't1-photo': { type: 'string' },
  't2-prenom': { type: 'string' }, 't2-photo': { type: 'string' },
  force: { type: 'boolean', default: false },
};
let a;
try { a = parseArgs({ options: opts }).values; } catch (e) { fail(e.message); }

function fail(msg) {
  console.error('✗ ' + msg + '\n  Exemple : voir l’en-tête de scripts/weddings/add-wedding.mjs');
  process.exit(1);
}
function need(k) {
  const v = (a[k] || '').trim();
  if (!v) fail('--' + k + ' manquant');
  if (v.length > 60) fail('--' + k + ' trop long');
  return v;
}

const w = {
  wedding_date: need('date'),
  marie1_prenom: need('m1-prenom'), marie1_nom: need('m1-nom'),
  marie2_prenom: need('m2-prenom'), marie2_nom: need('m2-nom'),
  temoin1_prenom: need('t1-prenom'), temoin2_prenom: need('t2-prenom'),
};
if (!/^\d{4}-\d{2}-\d{2}$/.test(w.wedding_date) || isNaN(Date.parse(w.wedding_date))) fail('--date au format AAAA-MM-JJ');
w.cles = weddingKeys(w);
if (w.cles.some((k) => !k)) fail('un prénom ou un nom est vide une fois normalisé');

// Photo → JPEG carré 144 px, sans métadonnées.
const PHOTO_FLAGS = { marie1: 'm1-photo', marie2: 'm2-photo', temoin1: 't1-photo', temoin2: 't2-photo' };
function toJpeg144(src) {
  const path = resolvePath(src.replace(/^~(?=\/)/, homedir()));
  if (!existsSync(path)) fail('photo introuvable : ' + src);
  const dir = mkdtempSync(join(tmpdir(), 'cleva-photo-'));
  try {
    const out = join(dir, 'p.jpg');
    const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], { encoding: 'utf8' });
    const W = +/pixelWidth: (\d+)/.exec(info)[1], H = +/pixelHeight: (\d+)/.exec(info)[1];
    // Le plus petit côté passe à 144 px, puis recadrage centré en carré.
    const resize = W < H ? ['--resampleWidth', '144'] : ['--resampleHeight', '144'];
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', ...resize, path, '--out', out], { stdio: 'ignore' });
    execFileSync('sips', ['--cropToHeightWidth', '144', '144', out], { stdio: 'ignore' });
    return stripMetadata(readFileSync(out));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
// Retire les segments APP1…APP15 et COM d'un JPEG (EXIF, GPS, XMP, ICC…).
function stripMetadata(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) fail('conversion JPEG ratée');
  const parts = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xda) { parts.push(buf.subarray(i)); break; } // début de l'image : on garde tout le reste
    const len = buf.readUInt16BE(i + 2);
    const keep = !((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe);
    if (keep) parts.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return Buffer.concat(parts);
}

const photos = {};
for (const role in PHOTO_FLAGS) {
  if (a[PHOTO_FLAGS[role]]) photos[role] = toJpeg144(a[PHOTO_FLAGS[role]]);
}

// Garde-fou : un autre mariage déjà en base partage-t-il 2 valeurs ? (les deux deviendraient ambigus)
const db = sql();
const others = await db('SELECT id, marie1_prenom, marie1_nom, marie2_prenom, marie2_nom, cles FROM weddings WHERE cles && $1::text[]', [w.cles]);
const clash = others.filter((o) => matchScore([...new Set(w.cles)], o.cles) >= 2);
if (clash.length && !a.force) {
  console.error('⚠ Ces mariages partagent déjà au moins deux valeurs avec le nouveau :');
  for (const o of clash) console.error('   ' + o.marie1_prenom + ' ' + o.marie1_nom + ' & ' + o.marie2_prenom + ' ' + o.marie2_nom);
  fail('ces mariages risquent de répondre « Encore un nom » sans fin, faute de pouvoir les départager. Relancer avec --force pour ajouter quand même.');
}

const id = randomBytes(16).toString('base64url'); // 22 caractères, 128 bits
await db(
  `INSERT INTO weddings (id, wedding_date, marie1_prenom, marie1_nom, marie2_prenom, marie2_nom, temoin1_prenom, temoin2_prenom, cles)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[])`,
  [id, w.wedding_date, w.marie1_prenom, w.marie1_nom, w.marie2_prenom, w.marie2_nom, w.temoin1_prenom, w.temoin2_prenom, w.cles],
);
for (const role in photos) {
  await db("INSERT INTO wedding_photos (wedding_id, role, jpeg) VALUES ($1, $2, decode($3, 'base64'))", [id, role, photos[role].toString('base64')]);
}

const purge = new Date(Date.parse(w.wedding_date) + 30 * 864e5).toISOString().slice(0, 10);
console.log('✓ Mariage ajouté : ' + w.marie1_prenom + ' ' + w.marie1_nom + ' & ' + w.marie2_prenom + ' ' + w.marie2_nom +
  ' (témoins ' + w.temoin1_prenom + ', ' + w.temoin2_prenom + ')');
console.log('  date ' + w.wedding_date + ' · supprimé par purge-weddings à partir du ' + purge);
console.log('  photos : ' + (Object.keys(photos).map((r) => r + ' ' + Math.round(photos[r].length / 1024) + ' ko').join(', ') || 'aucune'));
