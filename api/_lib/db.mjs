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

// Mariages qui contiennent au moins une des valeurs saisies (la décision se fait ensuite dans resolve()).
export async function findCandidates(inputs) {
  return sql()(
    `SELECT id, marie1_prenom, marie1_nom, marie2_prenom, marie2_nom, temoin1_prenom, temoin2_prenom, cles
       FROM weddings WHERE cles && $1::text[] LIMIT 50`,
    [inputs],
  );
}

export async function photoRoles(id) {
  const rows = await sql()('SELECT role FROM wedding_photos WHERE wedding_id = $1', [id]);
  return rows.map((r) => r.role);
}

export async function getPhoto(id, role) {
  if (!ID_RE.test(id) || !ROLES.includes(role)) return null;
  const rows = await sql()(
    "SELECT encode(jpeg, 'base64') AS b64 FROM wedding_photos WHERE wedding_id = $1 AND role = $2",
    [id, role],
  );
  return rows.length ? Buffer.from(rows[0].b64, 'base64') : null;
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
