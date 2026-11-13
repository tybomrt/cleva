// Fonctions de l'interface d'administration (api/admin.mjs) et de la tâche quotidienne
// (api/cron-weddings.mjs), écrites pour tourner à l'identique sur Vercel et sur le serveur local.
// La base est passée en paramètre (store) : la vraie dans live.mjs, une fausse dans les tests.
//
// store : {
//   listWeddings() → [{ id, wedding_date, expires_at, archived_on, marie1_prenom…, cles, photos: [rôles] }]
//   insertWedding(w), updateWedding(id, w), setExpiry(id, date), archive(id), restore(id, expires),
//   deleteWedding(id), setPhoto(id, role, jpeg), deletePhoto(id, role), adminPhoto(id, role) → Buffer|null,
//   createSession(hash, expiresMs), sessionValid(hash) → bool, deleteSession(hash), purgeSessions(),
//   purgeAttempts(),
// }
import { randomBytes } from 'node:crypto';
import { ROLES, ID_RE, createRateLimiter } from './dossier-core.mjs';
import {
  todayParis, isDate, addDays, deleteOn, isActive, dailyPlan, validateWedding, findClashes, coupleName,
  checkPassword, newSessionToken, tokenHash, parseCookies, sessionCookie, SESSION_COOKIE, SESSION_DAYS,
} from './admin-core.mjs';
import { photoFromBase64 } from './jpeg.mjs';
import { clientIp } from './handlers.mjs';

const MAX_BODY = 600 * 1024; // 4 photos de ~10 ko en base64, avec beaucoup de marge

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  for (const k in headers) res.setHeader(k, headers[k]);
  if (Buffer.isBuffer(body)) return res.end(body);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) return null; }
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// Protection contre les requêtes venues d'un autre site : cookie SameSite=Strict, plus
// JSON obligatoire (un formulaire d'un autre site ne peut pas en envoyer), plus Origin vérifié.
function sameOrigin(req) {
  const h = req.headers || {};
  if (!/^application\/json\b/i.test(h['content-type'] || '')) return false;
  if (!h.origin) return true;
  try { return new URL(h.origin).host === (h['x-forwarded-host'] || h.host); } catch (e) { return false; }
}

// Ce que la page d'administration reçoit pour un mariage.
function view(w, today) {
  return {
    id: w.id,
    wedding_date: w.wedding_date, expires_at: w.expires_at,
    marie1_prenom: w.marie1_prenom, marie1_nom: w.marie1_nom,
    marie2_prenom: w.marie2_prenom, marie2_nom: w.marie2_nom,
    temoin1_prenom: w.temoin1_prenom, temoin2_prenom: w.temoin2_prenom,
    photos: w.photos || [],
    archived_on: w.archived_on || null,
    delete_on: w.archived_on ? deleteOn(w.archived_on) : null,
    active: isActive(w, today),
  };
}

// photos : { rôle: base64 (nouvelle) | null (retirer) } — rôle absent = inchangé.
function readPhotos(input) {
  const out = {};
  const p = input && typeof input === 'object' ? input : {};
  for (const r of ROLES) {
    if (!(r in p)) continue;
    if (p[r] === null) { out[r] = null; continue; }
    const jpeg = photoFromBase64(p[r]);
    if (!jpeg) return { error: 'Une des photos n’a pas pu être lue. Essayez avec une autre (JPG ou PNG).' };
    out[r] = jpeg;
  }
  return { photos: out };
}

// deps : { store, rateStore, ipHash(ip), password() → string, now?() }
export function makeAdminHandler(deps) {
  const now = deps.now || Date.now;
  const limiter = createRateLimiter({ store: deps.rateStore, limit: 5, windowMs: 15 * 60 * 1000, now });
  const store = deps.store;

  async function loggedIn(req) {
    const token = parseCookies((req.headers || {}).cookie)[SESSION_COOKIE];
    if (!token || token.length > 100) return false;
    return store.sessionValid(tokenHash(token), now());
  }

  async function findWedding(id) {
    if (typeof id !== 'string' || !ID_RE.test(id)) return null;
    return (await store.listWeddings()).find((w) => w.id === id) || null;
  }

  async function applyPhotos(id, photos) {
    for (const r in photos) {
      if (photos[r] === null) await store.deletePhoto(id, r);
      else await store.setPhoto(id, r, photos[r]);
    }
  }

  const actions = {
    async me() { return [200, { status: 'ok' }]; },

    async list() {
      const today = todayParis(now());
      const all = (await store.listWeddings()).map((w) => view(w, today));
      const active = all.filter((w) => !w.archived_on).sort((a, b) => a.wedding_date.localeCompare(b.wedding_date));
      const archived = all.filter((w) => w.archived_on).sort((a, b) => b.archived_on.localeCompare(a.archived_on));
      return [200, { status: 'ok', today, active, archived }];
    },

    // Ajout (sans id) ou modification (avec id). force = enregistrer malgré un doublon.
    async save(b) {
      const today = todayParis(now());
      let existing = null;
      if (b.id != null) {
        existing = await findWedding(b.id);
        if (!existing) return [404, { status: 'error', error: 'Ce mariage n’existe plus.' }];
      }
      // L'échéance d'un mariage archivé ne compte pas tant qu'il n'est pas restauré.
      const input = existing && existing.archived_on ? { ...b, expires_at: today } : b;
      const v = validateWedding(input, today);
      if (!v.ok) return [400, { status: 'error', error: v.error }];
      const p = readPhotos(b.photos);
      if (p.error) return [400, { status: 'error', error: p.error }];
      if (!existing || !existing.archived_on) {
        const clashes = findClashes(v.w.cles, await store.listWeddings(), today, existing && existing.id);
        if (clashes.length && b.force !== true) return [200, { status: 'clash', clashes: clashes.map(coupleName) }];
      }
      let id;
      if (existing) {
        id = existing.id;
        if (existing.archived_on) v.w.expires_at = existing.expires_at; // inchangée tant qu'archivé
        await store.updateWedding(id, v.w);
      } else {
        id = randomBytes(16).toString('base64url'); // 22 caractères, 128 bits, comme add-wedding
        await store.insertWedding({ id, ...v.w });
      }
      await applyPhotos(id, p.photos);
      return [200, { status: 'ok', id }];
    },

    // Prolonger : { id, days: 7|30 } (à partir de l'échéance actuelle, ou d'aujourd'hui si elle est passée)
    // ou { id, expires_at: 'AAAA-MM-JJ' }.
    async extend(b) {
      const today = todayParis(now());
      const w = await findWedding(b.id);
      if (!w || w.archived_on) return [404, { status: 'error', error: 'Ce mariage n’est pas (ou plus) en cours.' }];
      let date;
      if (b.days === 7 || b.days === 30) date = addDays(w.expires_at > today ? w.expires_at : today, b.days);
      else if (isDate(b.expires_at)) date = b.expires_at;
      else return [400, { status: 'error', error: 'Choisissez une date.' }];
      if (date < today) return [400, { status: 'error', error: 'Cette date est déjà passée.' }];
      await store.setExpiry(w.id, date);
      return [200, { status: 'ok', expires_at: date }];
    },

    async archive(b) {
      const w = await findWedding(b.id);
      if (!w || w.archived_on) return [404, { status: 'error', error: 'Ce mariage n’est pas (ou plus) en cours.' }];
      await store.archive(w.id);
      return [200, { status: 'ok' }];
    },

    async restore(b) {
      const today = todayParis(now());
      const w = await findWedding(b.id);
      if (!w || !w.archived_on) return [404, { status: 'error', error: 'Ce mariage n’est pas dans les archives.' }];
      if (!isDate(b.expires_at) || b.expires_at < today) {
        return [400, { status: 'error', error: 'Choisissez une nouvelle échéance, à partir d’aujourd’hui.' }];
      }
      const clashes = findClashes(w.cles, await store.listWeddings(), today, w.id);
      if (clashes.length && b.force !== true) return [200, { status: 'clash', clashes: clashes.map(coupleName) }];
      await store.restore(w.id, b.expires_at);
      return [200, { status: 'ok' }];
    },

    // Suppression définitive : seulement depuis les archives, et avec le mot « supprimer » tapé.
    async delete(b) {
      const w = await findWedding(b.id);
      if (!w) return [404, { status: 'error', error: 'Ce mariage n’existe plus.' }];
      if (!w.archived_on) return [400, { status: 'error', error: 'Archivez d’abord ce mariage : on ne supprime que depuis les archives.' }];
      if (String(b.confirm || '').trim().toLowerCase() !== 'supprimer') {
        return [400, { status: 'error', error: 'Tapez « supprimer » pour confirmer.' }];
      }
      await store.deleteWedding(w.id);
      return [200, { status: 'ok' }];
    },
  };

  return async function handler(req, res) {
    try {
      const u = new URL(req.url || '/', 'http://x');

      // Photos (y compris des mariages archivés) pour la page d'administration.
      if (req.method === 'GET') {
        if (u.searchParams.get('action') !== 'photo') return send(res, 405, { status: 'error' });
        if (!(await loggedIn(req))) return send(res, 401, { status: 'login' });
        const id = u.searchParams.get('id') || '', role = u.searchParams.get('role') || '';
        const img = ID_RE.test(id) && ROLES.includes(role) ? await store.adminPhoto(id, role) : null;
        if (!img) return send(res, 404, { status: 'none' });
        return send(res, 200, img, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' });
      }
      if (req.method !== 'POST') return send(res, 405, { status: 'error' });
      if (!sameOrigin(req)) return send(res, 403, { status: 'error', error: 'Requête refusée.' });
      const b = await readBody(req);
      if (!b || typeof b !== 'object') return send(res, 400, { status: 'error', error: 'Requête illisible.' });

      if (b.action === 'login') {
        const expected = deps.password();
        if (!expected) return send(res, 503, { status: 'setup', error: 'Le mot de passe n’est pas encore réglé (ADMIN_PASSWORD dans Vercel).' });
        if (!(await limiter.hit('admin:' + deps.ipHash(clientIp(req))))) {
          return send(res, 429, { status: 'wait', error: 'Trop d’essais. Réessayez dans un quart d’heure.' });
        }
        if (!checkPassword(b.password, expected)) return send(res, 401, { status: 'error', error: 'Ce n’est pas le bon mot de passe.' });
        const token = newSessionToken();
        await store.createSession(tokenHash(token), now() + SESSION_DAYS * 864e5);
        return send(res, 200, { status: 'ok' }, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
      }

      if (b.action === 'logout') {
        const token = parseCookies((req.headers || {}).cookie)[SESSION_COOKIE];
        if (token) await store.deleteSession(tokenHash(token));
        return send(res, 200, { status: 'ok' }, { 'Set-Cookie': sessionCookie('', 0) });
      }

      // Tout le reste exige une session valide.
      if (!Object.prototype.hasOwnProperty.call(actions, b.action)) return send(res, 400, { status: 'error', error: 'Action inconnue.' });
      if (!(await loggedIn(req))) return send(res, 401, { status: 'login' });
      const [status, body] = await actions[b.action](b);
      return send(res, status, body);
    } catch (e) {
      console.error('admin', e && e.message);
      return send(res, 500, { status: 'error', error: 'Petit souci côté serveur. Réessayez dans un instant.' });
    }
  };
}

// Tâche quotidienne (Vercel Cron) : archive à l'échéance, supprime 1 an après l'archivage.
// Vercel l'appelle avec l'en-tête « Authorization: Bearer <CRON_SECRET> ».
// deps : { store, secret() → string, now?() }
export async function runDaily(store, today) {
  const plan = dailyPlan(await store.listWeddings(), today);
  for (const id of plan.archive) await store.archive(id);
  for (const id of plan.remove) await store.deleteWedding(id);
  await store.purgeSessions();
  await store.purgeAttempts();
  return { archived: plan.archive.length, deleted: plan.remove.length };
}
export function makeCronHandler(deps) {
  const now = deps.now || Date.now;
  return async function handler(req, res) {
    const secret = deps.secret();
    const auth = (req.headers || {}).authorization || '';
    if (!secret || !checkPassword(auth, 'Bearer ' + secret)) return send(res, 401, { status: 'error' });
    try {
      const r = await runDaily(deps.store, todayParis(now()));
      console.log('cron-weddings', JSON.stringify(r));
      return send(res, 200, { status: 'ok', ...r });
    } catch (e) {
      console.error('cron-weddings', e && e.message);
      return send(res, 500, { status: 'error' });
    }
  };
}
