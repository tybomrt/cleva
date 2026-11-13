// Règles de l'interface d'administration des mariages — code pur, sans base de données,
// pour pouvoir le tester (tests/admin.test.mjs). Utilisé par api/admin.mjs, api/cron-weddings.mjs,
// api/dossier.mjs, api/photo.mjs et les scripts de secours.
//
// Cycle de vie d'un mariage :
//   actif      → reconnu par « Retrouver le dossier » jusqu'au soir de son échéance (heure de Paris) ;
//   archivé    → à l'échéance (tâche quotidienne) ou à la main : plus reconnu, photos plus servies ;
//   supprimé   → 1 an après l'archivage (tâche quotidienne), ou à la main depuis les archives.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { weddingKeys, matchScore } from './dossier-core.mjs';

export const DEFAULT_EXPIRY_DAYS = 30;
export const SESSION_DAYS = 7;
export const SESSION_COOKIE = 'cleva_admin';
export const MAX_LEN = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- Dates (toujours des chaînes AAAA-MM-JJ, jour de Paris) ---------- */

export function todayParis(nowMs = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(nowMs));
}
export function isDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function addYears(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  // 29 février + 1 an → 28 février
  const out = new Date(Date.UTC(y + n, m - 1, d));
  if (out.getUTCMonth() !== m - 1) out.setUTCDate(0);
  return out.toISOString().slice(0, 10);
}
export function daysBetween(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 864e5);
}
export function defaultExpiry(weddingDate) { return addDays(weddingDate, DEFAULT_EXPIRY_DAYS); }
// Date de suppression définitive d'un mariage archivé.
export function deleteOn(archivedOn) { return addYears(archivedOn, 1); }

// Un mariage est actif s'il n'est pas archivé et que son échéance n'est pas passée.
// (Une ligne sans échéance — anciens tests — est considérée comme sans limite.)
export function isActive(w, today) {
  if (!w || w.archived_on) return false;
  return !w.expires_at || w.expires_at >= today;
}

// Tâche quotidienne : qui archiver, qui supprimer définitivement.
export function dailyPlan(weddings, today) {
  const archive = [], remove = [];
  for (const w of weddings) {
    if (!w.archived_on && w.expires_at && w.expires_at < today) archive.push(w.id);
    else if (w.archived_on && deleteOn(w.archived_on) <= today) remove.push(w.id);
  }
  return { archive, remove };
}

/* ---------- Saisie d'un mariage ---------- */

export const FIELDS = ['marie1_prenom', 'marie1_nom', 'marie2_prenom', 'marie2_nom', 'temoin1_prenom', 'temoin2_prenom'];
const LABELS = {
  marie1_prenom: 'le prénom du marié 1', marie1_nom: 'le nom du marié 1',
  marie2_prenom: 'le prénom du marié 2', marie2_nom: 'le nom du marié 2',
  temoin1_prenom: 'le prénom du témoin 1', temoin2_prenom: 'le prénom du témoin 2',
};

// → { ok: true, w } ou { ok: false, error } (message prêt à afficher).
export function validateWedding(input, today) {
  const b = input && typeof input === 'object' ? input : {};
  const w = {};
  for (const f of FIELDS) {
    const v = typeof b[f] === 'string' ? b[f].trim().replace(/\s+/g, ' ') : '';
    if (!v) return { ok: false, error: 'Il manque ' + LABELS[f] + '.' };
    if (v.length > MAX_LEN) return { ok: false, error: 'C’est un peu long pour ' + LABELS[f] + ' (60 caractères maximum).' };
    w[f] = v;
  }
  if (!isDate(b.wedding_date)) return { ok: false, error: 'Il manque la date du mariage.' };
  w.wedding_date = b.wedding_date;
  w.expires_at = b.expires_at ? b.expires_at : defaultExpiry(w.wedding_date);
  if (!isDate(w.expires_at)) return { ok: false, error: 'La date d’échéance n’est pas valable.' };
  if (w.expires_at < today) return { ok: false, error: 'L’échéance est déjà passée : choisissez une date à partir d’aujourd’hui.' };
  w.cles = weddingKeys(w);
  if (w.cles.some((k) => !k)) return { ok: false, error: 'Un prénom ou un nom ne contient que des signes (tirets, apostrophes…).' };
  return { ok: true, w };
}

// Mariages actifs qui partagent au moins deux valeurs avec `cles` (même garde-fou que add-wedding).
export function findClashes(cles, weddings, today, excludeId) {
  const mine = [...new Set(cles)];
  return weddings.filter((o) => o.id !== excludeId && isActive(o, today) && matchScore(mine, o.cles || weddingKeys(o)) >= 2);
}
export function coupleName(w) {
  return w.marie1_prenom + ' ' + w.marie1_nom + ' & ' + w.marie2_prenom + ' ' + w.marie2_nom;
}

/* ---------- Mot de passe et sessions ---------- */

function sha256(s) { return createHash('sha256').update(String(s)).digest(); }

// Comparaison à temps constant (ne révèle rien de la longueur ou du début du mot de passe).
export function checkPassword(given, expected) {
  if (typeof given !== 'string' || !given || typeof expected !== 'string' || !expected) return false;
  return timingSafeEqual(sha256(given), sha256(expected));
}
export function newSessionToken() { return randomBytes(32).toString('base64url'); }
// En base, on ne garde que l'empreinte du jeton : une fuite de la base ne donne pas de session.
export function tokenHash(token) { return sha256('cleva-admin|' + token).toString('base64url'); }

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export function sessionCookie(token, maxAgeSec) {
  return SESSION_COOKIE + '=' + (token || '') + '; Path=/api/admin; Max-Age=' + maxAgeSec + '; HttpOnly; Secure; SameSite=Strict';
}
