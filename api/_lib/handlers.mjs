// Fonctions « Retrouver le dossier » et « photo », écrites pour tourner à l'identique
// sur Vercel (api/dossier.mjs, api/photo.mjs) et sur le serveur local (scripts/dev-server.mjs).
// N'utilisent que res.statusCode / res.setHeader / res.end : compatibles avec les deux.
import { prepareInputs, resolve, publicDossier, createRateLimiter } from './dossier-core.mjs';

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

// deps : { findCandidates(inputs), photoRoles(id), rateStore, ipHash(ip) }
export function makeDossierHandler(deps) {
  const limiter = createRateLimiter({ store: deps.rateStore, now: deps.now });
  return async function handler(req, res) {
    if (req.method !== 'POST') return send(res, 405, { status: 'error' });
    try {
      if (!(await limiter.hit(deps.ipHash(clientIp(req))))) return send(res, 429, { status: 'wait' });
      const b = await readBody(req);
      const inputs = prepareInputs([b.prenom1, b.nom1, b.prenom2, b.nom2]);
      const candidates = inputs.length >= 2 ? await deps.findCandidates(inputs) : [];
      const r = resolve(inputs, candidates);
      if (r.status !== 'ok') return send(res, 200, { status: r.status });
      return send(res, 200, { status: 'ok', dossier: publicDossier(r.wedding, await deps.photoRoles(r.wedding.id)) });
    } catch (e) {
      console.error('dossier', e && e.message);
      return send(res, 500, { status: 'error' });
    }
  };
}

// deps : { getPhoto(id, role) }
export function makePhotoHandler(deps) {
  return async function handler(req, res) {
    if (req.method !== 'GET') return send(res, 405, { status: 'error' });
    try {
      const u = new URL(req.url, 'http://x');
      const img = await deps.getPhoto(u.searchParams.get('d') || '', u.searchParams.get('r') || '');
      if (!img) return send(res, 404, { status: 'none' });
      return send(res, 200, img, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' });
    } catch (e) {
      console.error('photo', e && e.message);
      return send(res, 500, { status: 'error' });
    }
  };
}
