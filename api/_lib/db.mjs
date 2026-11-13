// Accès à la base des dossiers (Neon Postgres, projet cleva-dossiers).
// DATABASE_URL : variable d'environnement Vercel (et .env en local, jamais commité).
import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import { ID_RE, ROLES } from './dossier-core.mjs';

let sqlFn = null;
export function sql() {
  if (!sqlFn) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
    sqlFn = neon(process.env.DATABASE_URL);
  }
  return sqlFn;
}

// Jour d'archivage (heure de Paris) et échéance, en texte AAAA-MM-JJ : c'est ce qu'attend admin-core.mjs.
const STATUS_COLS = "expires_at::text AS expires_at, ((archived_at AT TIME ZONE 'Europe/Paris')::date)::text AS archived_on";

// Mariages non archivés qui contiennent au moins une des valeurs saisies. Le filtre final
// (échéance passée) et la décision se font ensuite dans handlers.mjs / resolve().
export async function findCandidates(inputs) {
  return sql()(
    `SELECT id, marie1_prenom, marie1_nom, marie2_prenom, marie2_nom, temoin1_prenom, temoin2_prenom, cles, ${STATUS_COLS}
       FROM weddings WHERE archived_at IS NULL AND cles && $1::text[] LIMIT 50`,
    [inputs],
  );
}

export async function photoRoles(id) {
  const rows = await sql()('SELECT role FROM wedding_photos WHERE wedding_id = $1', [id]);
  return rows.map((r) => r.role);
}

// Photo + état du mariage (handlers.mjs ne la sert que si le mariage est actif).
export async function getPhoto(id, role) {
  if (!ID_RE.test(id) || !ROLES.includes(role)) return null;
  const rows = await sql()(
    `SELECT encode(p.jpeg, 'base64') AS b64, w.expires_at::text AS expires_at,
            ((w.archived_at AT TIME ZONE 'Europe/Paris')::date)::text AS archived_on
       FROM wedding_photos p JOIN weddings w ON w.id = p.wedding_id
      WHERE p.wedding_id = $1 AND p.role = $2`,
    [id, role],
  );
  if (!rows.length) return null;
  return { jpeg: Buffer.from(rows[0].b64, 'base64'), expires_at: rows[0].expires_at, archived_on: rows[0].archived_on };
}

// Essais : l'IP n'est jamais stockée en clair.
export function ipHash(ip) {
  return createHash('sha256').update((process.env.DOSSIER_SALT || '') + '|' + ip).digest('base64url').slice(0, 32);
}
export const attemptStore = {
  async count(key, since) {
    const rows = await sql()(
      'SELECT count(*)::int AS n FROM dossier_attempts WHERE ip_hash = $1 AND at > to_timestamp($2 / 1000.0)',
      [key, since],
    );
    return rows[0].n;
  },
  async add(key) {
    await sql()('INSERT INTO dossier_attempts (ip_hash) VALUES ($1)', [key]);
    // Ménage : les essais de plus d'un jour ne servent plus à rien.
    if (Math.random() < 0.05) await sql()("DELETE FROM dossier_attempts WHERE at < now() - interval '1 day'");
  },
};

// Base vue par l'interface d'administration (voir la liste des fonctions en tête de admin-handlers.mjs).
const WEDDING_COLS = `w.id, w.wedding_date::text AS wedding_date, w.marie1_prenom, w.marie1_nom, w.marie2_prenom, w.marie2_nom,
  w.temoin1_prenom, w.temoin2_prenom, w.cles, w.expires_at::text AS expires_at,
  ((w.archived_at AT TIME ZONE 'Europe/Paris')::date)::text AS archived_on,
  COALESCE((SELECT array_agg(p.role ORDER BY p.role) FROM wedding_photos p WHERE p.wedding_id = w.id), '{}') AS photos`;

export const adminStore = {
  async listWeddings() {
    return sql()(`SELECT ${WEDDING_COLS} FROM weddings w ORDER BY w.wedding_date`);
  },
  async insertWedding(w) {
    await sql()(
      `INSERT INTO weddings (id, wedding_date, expires_at, marie1_prenom, marie1_nom, marie2_prenom, marie2_nom, temoin1_prenom, temoin2_prenom, cles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[])`,
      [w.id, w.wedding_date, w.expires_at, w.marie1_prenom, w.marie1_nom, w.marie2_prenom, w.marie2_nom, w.temoin1_prenom, w.temoin2_prenom, w.cles],
    );
  },
  async updateWedding(id, w) {
    await sql()(
      `UPDATE weddings SET wedding_date = $2, expires_at = $3, marie1_prenom = $4, marie1_nom = $5, marie2_prenom = $6,
         marie2_nom = $7, temoin1_prenom = $8, temoin2_prenom = $9, cles = $10::text[] WHERE id = $1`,
      [id, w.wedding_date, w.expires_at, w.marie1_prenom, w.marie1_nom, w.marie2_prenom, w.marie2_nom, w.temoin1_prenom, w.temoin2_prenom, w.cles],
    );
  },
  async setExpiry(id, date) { await sql()('UPDATE weddings SET expires_at = $2 WHERE id = $1', [id, date]); },
  async archive(id) { await sql()('UPDATE weddings SET archived_at = now() WHERE id = $1 AND archived_at IS NULL', [id]); },
  async restore(id, expires) { await sql()('UPDATE weddings SET archived_at = NULL, expires_at = $2 WHERE id = $1', [id, expires]); },
  async deleteWedding(id) { await sql()('DELETE FROM weddings WHERE id = $1', [id]); }, // photos : ON DELETE CASCADE
  async setPhoto(id, role, jpeg) {
    await sql()(
      `INSERT INTO wedding_photos (wedding_id, role, jpeg) VALUES ($1, $2, decode($3, 'base64'))
       ON CONFLICT (wedding_id, role) DO UPDATE SET jpeg = EXCLUDED.jpeg`,
      [id, role, jpeg.toString('base64')],
    );
  },
  async deletePhoto(id, role) { await sql()('DELETE FROM wedding_photos WHERE wedding_id = $1 AND role = $2', [id, role]); },
  async adminPhoto(id, role) {
    const rows = await sql()("SELECT encode(jpeg, 'base64') AS b64 FROM wedding_photos WHERE wedding_id = $1 AND role = $2", [id, role]);
    return rows.length ? Buffer.from(rows[0].b64, 'base64') : null;
  },
  async createSession(hash, expiresMs) {
    await sql()('INSERT INTO admin_sessions (token_hash, expires_at) VALUES ($1, to_timestamp($2 / 1000.0))', [hash, expiresMs]);
  },
  async sessionValid(hash, nowMs) {
    const rows = await sql()('SELECT 1 FROM admin_sessions WHERE token_hash = $1 AND expires_at > to_timestamp($2 / 1000.0)', [hash, nowMs]);
    return rows.length > 0;
  },
  async deleteSession(hash) { await sql()('DELETE FROM admin_sessions WHERE token_hash = $1', [hash]); },
  async purgeSessions() { await sql()('DELETE FROM admin_sessions WHERE expires_at < now()'); },
  async purgeAttempts() { await sql()("DELETE FROM dossier_attempts WHERE at < now() - interval '1 day'"); },
};
