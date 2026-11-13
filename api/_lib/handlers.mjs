// Fonctions « Retrouver le dossier » et « photo », écrites pour tourner à l'identique
// sur Vercel (api/dossier.mjs, api/photo.mjs) et sur le serveur local (scripts/dev-server.mjs).
// N'utilisent que res.statusCode / res.setHeader / res.end : compatibles avec les deux.
import { prepareInputs, resolve, publicDossier, createRateLimiter } from './dossier-core.mjs';
import { isActive, todayParis } from './admin-core.mjs';

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
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 4000) break; }
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

export function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || '').trim();
}

// deps : { findCandidates(inputs), photoRoles(id), rateStore, ipHash(ip), now?() }
// Seuls les mariages actifs (non archivés, échéance pas passée) sont reconnus : un mariage archivé
// reçoit exactement la même réponse qu'un mariage inconnu.
export function makeDossierHandler(deps) {
  const now = deps.now || Date.now;
  const limiter = createRateLimiter({ store: deps.rateStore, now });
  return async function handler(req, res) {
    if (req.method !== 'POST') return send(res, 405, { status: 'error' });
    try {
      if (!(await limiter.hit(deps.ipHash(clientIp(req))))) return send(res, 429, { status: 'wait' });
      const b = await readBody(req);
      const inputs = prepareInputs([b.prenom1, b.nom1, b.prenom2, b.nom2]);
      const today = todayParis(now());
      const candidates = inputs.length >= 2 ? (await deps.findCandidates(inputs)).filter((w) => isActive(w, today)) : [];
      const r = resolve(inputs, candidates);
      if (r.status !== 'ok') return send(res, 200, { status: r.status });
      return send(res, 200, { status: 'ok', dossier: publicDossier(r.wedding, await deps.photoRoles(r.wedding.id)) });
    } catch (e) {
      console.error('dossier', e && e.message);
      return send(res, 500, { status: 'error' });
    }
  };
}

// deps : { getPhoto(id, role) → { jpeg, archived_on, expires_at } | null, now?() }
// Photo servie seulement si le mariage est actif. Sinon 404 : la page garde la photo par défaut.
export function makePhotoHandler(deps) {
  const now = deps.now || Date.now;
  return async function handler(req, res) {
    if (req.method !== 'GET') return send(res, 405, { status: 'error' });
    try {
      const u = new URL(req.url, 'http://x');
      const p = await deps.getPhoto(u.searchParams.get('d') || '', u.searchParams.get('r') || '');
      if (!p || !p.jpeg || !isActive(p, todayParis(now()))) return send(res, 404, { status: 'none' });
      // Revérifiée à chaque affichage (no-cache) : après un archivage, elle disparaît aussitôt.
      return send(res, 200, p.jpeg, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-cache' });
    } catch (e) {
      console.error('photo', e && e.message);
      return send(res, 500, { status: 'error' });
    }
  };
}
