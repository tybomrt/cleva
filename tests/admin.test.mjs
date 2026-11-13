// Tests de l'interface d'administration, de la tâche quotidienne et du filtre « mariages actifs »
// des pages d'énigme. Base simulée en mémoire (mêmes règles que api/_lib/db.mjs).
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryStore } from '../api/_lib/dossier-core.mjs';
import { makeAdminHandler, makeCronHandler } from '../api/_lib/admin-handlers.mjs';
import { makeDossierHandler, makePhotoHandler } from '../api/_lib/handlers.mjs';
import { todayParis, addDays, addYears, deleteOn } from '../api/_lib/admin-core.mjs';
import { stripMetadata } from '../api/_lib/jpeg.mjs';

const PASSWORD = 'mot-de-passe-de-test';
const DAY = 864e5;

// Petit JPEG valide (en-tête + segment EXIF à retirer + début d'image).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66, 0xff, 0xdb, 0x00, 0x04, 0x01, 0x02, 0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);
const JPEG_B64 = JPEG.toString('base64');

// --- Fausse base, même comportement que adminStore (db.mjs) ---
function fakeDb(clock) {
  const weddings = new Map(), photos = new Map(), sessions = new Map();
  const key = (id, r) => id + '/' + r;
  const store = {
    async listWeddings() {
      return [...weddings.values()].map((w) => ({
        ...w, photos: [...photos.keys()].filter((k) => k.startsWith(w.id + '/')).map((k) => k.split('/')[1]).sort(),
      }));
    },
    async insertWedding(w) { weddings.set(w.id, { ...w, archived_on: null }); },
    async updateWedding(id, w) { Object.assign(weddings.get(id), w); },
    async setExpiry(id, d) { weddings.get(id).expires_at = d; },
    async archive(id) { const w = weddings.get(id); if (!w.archived_on) w.archived_on = todayParis(clock.t); },
    async restore(id, d) { Object.assign(weddings.get(id), { archived_on: null, expires_at: d }); },
    async deleteWedding(id) {
      weddings.delete(id);
      for (const k of [...photos.keys()]) if (k.startsWith(id + '/')) photos.delete(k);
    },
    async setPhoto(id, r, jpeg) { photos.set(key(id, r), jpeg); },
    async deletePhoto(id, r) { photos.delete(key(id, r)); },
    async adminPhoto(id, r) { return photos.get(key(id, r)) || null; },
    async createSession(h, exp) { sessions.set(h, exp); },
    async sessionValid(h, now) { return sessions.has(h) && sessions.get(h) > now; },
    async deleteSession(h) { sessions.delete(h); },
    async purgeSessions() {},
    async purgeAttempts() {},
  };
  // Les deux fonctions des pages d'énigme, branchées sur la même fausse base.
  const players = {
    async findCandidates(inputs) {
      return [...weddings.values()].filter((w) => !w.archived_on && w.cles.some((k) => inputs.includes(k)));
    },
    async photoRoles(id) { return (await store.listWeddings()).find((w) => w.id === id).photos; },
    async getPhoto(id, r) {
      const w = weddings.get(id), jpeg = photos.get(key(id, r));
      return w && jpeg ? { jpeg, expires_at: w.expires_at, archived_on: w.archived_on } : null;
    },
  };
  return { store, players, weddings };
}

function fakeRes() {
  const r = { statusCode: 0, headers: {}, body: Buffer.alloc(0) };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (b) => { r.body = b ? Buffer.from(b) : Buffer.alloc(0); };
  return r;
}

// Environnement complet : admin, tâche quotidienne, pages d'énigme, horloge réglable.
function setup({ password = PASSWORD, start = Date.parse('2026-11-13T10:00:00Z') } = {}) {
  const clock = { t: start };
  const now = () => clock.t;
  const db = fakeDb(clock);
  const admin = makeAdminHandler({ store: db.store, rateStore: memoryStore(), ipHash: (ip) => ip, password: () => password, now });
  const cron = makeCronHandler({ store: db.store, secret: () => 'secret-cron', now });
  const dossier = makeDossierHandler({ ...db.players, rateStore: memoryStore(), ipHash: (ip) => ip, now });
  const photo = makePhotoHandler({ getPhoto: db.players.getPhoto, now });
  let cookie = '';

  async function run(handler, req) {
    const res = fakeRes();
    await handler({ headers: {}, ...req }, res);
    const type = res.headers['content-type'] || '';
    return { status: res.statusCode, headers: res.headers, body: res.body, json: type.startsWith('application/json') ? JSON.parse(res.body) : null };
  }
  const env = {
    clock, db,
    today: () => todayParis(clock.t),
    async post(body, { ip = '1.1.1.1', withCookie = true, headers = {} } = {}) {
      const r = await run(admin, {
        method: 'POST', url: '/api/admin', body,
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, cookie: withCookie ? cookie : '', ...headers },
      });
      const set = r.headers['set-cookie'];
      if (set) cookie = set.split(';')[0];
      return r;
    },
    async login(pw = PASSWORD, ip) { return env.post({ action: 'login', password: pw }, { ip }); },
    async adminPhoto(id, role) {
      return run(admin, { method: 'GET', url: '/api/admin?action=photo&id=' + id + '&role=' + role, headers: { cookie } });
    },
    async cron(auth = 'Bearer secret-cron') { return run(cron, { method: 'GET', url: '/api/cron-weddings', headers: { authorization: auth } }); },
    async find(prenom1, prenom2) {
      return run(dossier, { method: 'POST', body: { prenom1, nom1: '', prenom2, nom2: '' }, headers: { 'x-forwarded-for': '9.9.9.9' } });
    },
    async playerPhoto(id, role) { return run(photo, { method: 'GET', url: '/api/photo?d=' + id + '&r=' + role }); },
    async add(extra = {}) {
      return env.post({
        action: 'save', wedding_date: '2026-12-05',
        marie1_prenom: 'Camille', marie1_nom: 'Dupont', marie2_prenom: 'Alex', marie2_nom: 'Martin',
        temoin1_prenom: 'Sam', temoin2_prenom: 'Léo', marie1_genre: 'f', marie2_genre: 'h', temoin1_genre: 'h', temoin2_genre: 'f', ...extra,
      });
    },
  };
  return env;
}
async function listOf(env) { return (await env.post({ action: 'list' })).json; }

test('dates : +30 jours, +1 an, jour de Paris', () => {
  assert.equal(addDays('2026-12-05', 30), '2027-01-04');
  assert.equal(addYears('2028-02-29', 1), '2029-02-28');
  assert.equal(deleteOn('2026-11-13'), '2027-11-13');
  assert.equal(todayParis(Date.parse('2026-11-13T23:30:00Z')), '2026-11-14'); // 0 h 30 à Paris
});

test('toutes les fonctions d’administration exigent une session', async () => {
  const env = setup();
  for (const action of ['me', 'list', 'save', 'extend', 'archive', 'restore', 'delete']) {
    const r = await env.post({ action, id: 'A'.repeat(22) });
    assert.equal(r.status, 401, action);
    assert.deepEqual(r.json, { status: 'login' });
  }
  assert.equal((await env.adminPhoto('A'.repeat(22), 'marie1')).status, 401);
  // Un faux cookie ne suffit pas.
  const r = await env.post({ action: 'list' }, { withCookie: false, headers: { cookie: 'cleva_admin=nimportequoi' } });
  assert.equal(r.status, 401);
  assert.equal(env.db.weddings.size, 0);
});

test('connexion : mauvais mot de passe refusé, bon mot de passe → cookie de session sécurisé', async () => {
  const env = setup();
  const bad = await env.login('mauvais');
  assert.equal(bad.status, 401);
  assert.equal(bad.headers['set-cookie'], undefined);
  const ok = await env.login();
  assert.equal(ok.status, 200);
  const c = ok.headers['set-cookie'];
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api/admin', 'Max-Age=604800']) assert.ok(c.includes(flag), flag);
  assert.equal((await env.post({ action: 'me' })).status, 200);
  // Déconnexion : la session ne marche plus, même si quelqu'un a gardé le cookie.
  const kept = c.split(';')[0];
  await env.post({ action: 'logout' });
  assert.equal((await env.post({ action: 'me' }, { withCookie: false, headers: { cookie: kept } })).status, 401);
});

test('connexion : 5 essais par quart d’heure et par IP, puis attente', async () => {
  const env = setup();
  for (let i = 0; i < 5; i++) assert.equal((await env.login('faux', '7.7.7.7')).status, 401);
  const blocked = await env.login(PASSWORD, '7.7.7.7'); // même le bon mot de passe est bloqué
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.status, 'wait');
  assert.equal((await env.login(PASSWORD, '8.8.8.8')).status, 200); // autre IP : pas bloquée
  env.clock.t += 15 * 60 * 1000 + 1;
  assert.equal((await env.login(PASSWORD, '7.7.7.7')).status, 200);
});

test('connexion impossible tant que ADMIN_PASSWORD n’est pas réglé', async () => {
  const env = setup({ password: '' });
  const r = await env.login('');
  assert.equal(r.status, 503);
  assert.equal(r.json.status, 'setup');
});

test('requête venant d’un autre site refusée', async () => {
  const env = setup();
  await env.login();
  assert.equal((await env.post({ action: 'list' }, { headers: { 'content-type': 'text/plain' } })).status, 403);
  assert.equal((await env.post({ action: 'list' }, { headers: { origin: 'https://pirate.example', host: 'cleva-games.fr' } })).status, 403);
  assert.equal((await env.post({ action: 'list' }, { headers: { origin: 'https://cleva-games.fr', host: 'cleva-games.fr' } })).status, 200);
});

test('ajout : échéance par défaut = date + 30 jours, photos nettoyées, mariage reconnu', async () => {
  const env = setup();
  await env.login();
  const r = await env.add({ photos: { marie1: JPEG_B64, temoin2: JPEG_B64 } });
  assert.equal(r.json.status, 'ok');
  assert.match(r.json.id, /^[A-Za-z0-9_-]{22}$/);
  const [w] = (await listOf(env)).active;
  assert.equal(w.expires_at, '2027-01-04');
  assert.deepEqual(w.photos, ['marie1', 'temoin2']);
  assert.equal(w.active, true);
  const stored = env.db.store.adminPhoto(w.id, 'marie1');
  assert.deepEqual(await stored, stripMetadata(JPEG));
  assert.ok(!(await stored).includes(Buffer.from('Exif')));
  // Reconnu par l'écran « Retrouver le dossier » (normalisation identique : « léo » / « LEO »).
  const f = await env.find('camille', 'ALEX');
  assert.equal(f.json.status, 'ok');
  assert.equal(f.json.dossier.prenoms.temoin2, 'Léo');
  // Genres transmis au jeu pour accorder les textes.
  assert.deepEqual(f.json.dossier.genres, { marie1: 'f', marie2: 'h', temoin1: 'h', temoin2: 'f' });
  assert.equal(w.marie1_genre, 'f');
  assert.equal((await env.playerPhoto(w.id, 'marie1')).status, 200);
});

test('ajout : champs manquants, genre manquant, échéance passée et photo illisible refusés', async () => {
  const env = setup();
  await env.login();
  assert.match((await env.add({ marie2_nom: '  ' })).json.error, /nom du marié 2/);
  assert.match((await env.add({ temoin1_genre: undefined })).json.error, /homme.*femme.*témoin 1/);
  assert.match((await env.add({ marie2_genre: 'x' })).json.error, /marié 2/);
  assert.equal((await env.add({ wedding_date: '2026-02-30' })).status, 400);
  assert.match((await env.add({ wedding_date: '2026-01-01' })).json.error, /déjà passée/);
  assert.match((await env.add({ photos: { marie1: 'pasunephoto' } })).json.error, /photo/);
  assert.equal(env.db.weddings.size, 0);
});

test('garde-fou : un mariage actif qui partage deux valeurs → avertissement, puis « quand même »', async () => {
  const env = setup();
  await env.login();
  await env.add();
  const clash = await env.add({ marie2_prenom: 'Zoé', marie2_nom: 'Durand', marie1_nom: 'Dupont' }); // Camille + Dupont
  assert.equal(clash.json.status, 'clash');
  assert.deepEqual(clash.json.clashes, ['Camille Dupont & Alex Martin']);
  assert.equal(env.db.weddings.size, 1);
  // Une seule valeur commune : pas d'avertissement.
  assert.equal((await env.add({ marie1_nom: 'Bernard', marie2_prenom: 'Zoé', marie2_nom: 'Roux' })).json.status, 'ok');
  // Confirmer quand même.
  assert.equal((await env.add({ marie2_prenom: 'Zoé', marie2_nom: 'Durand', force: true })).json.status, 'ok');
  assert.equal(env.db.weddings.size, 3);
});

test('modification : prénoms, dates, photos remplacées ou retirées, clés recalculées', async () => {
  const env = setup();
  await env.login();
  const { id } = (await env.add({ photos: { marie1: JPEG_B64, marie2: JPEG_B64 } })).json;
  const r = await env.post({
    action: 'save', id, wedding_date: '2027-03-20', expires_at: '2027-04-19',
    marie1_prenom: 'Camille', marie1_nom: 'Dupont-Leroy', marie2_prenom: 'Alexandre', marie2_nom: 'Martin',
    temoin1_prenom: 'Sam', temoin2_prenom: 'Noé', marie1_genre: 'f', marie2_genre: 'h', temoin1_genre: 'h', temoin2_genre: 'h', photos: { marie2: null, temoin1: JPEG_B64 },
  });
  assert.equal(r.json.status, 'ok'); // pas d'avertissement contre lui-même
  const [w] = (await listOf(env)).active;
  assert.equal(w.wedding_date, '2027-03-20');
  assert.equal(w.expires_at, '2027-04-19');
  assert.equal(w.temoin2_genre, 'h');
  assert.deepEqual(w.photos, ['marie1', 'temoin1']);
  assert.deepEqual(env.db.weddings.get(id).cles, ['camille', 'dupontleroy', 'alexandre', 'martin']);
  assert.equal((await env.find('Camille', 'Alex')).json.status, 'more'); // « Alex » n'est plus reconnu
  assert.equal((await env.find('Camille', 'Alexandre')).json.status, 'ok');
});

test('prolongation : +7 jours, +30 jours, date précise', async () => {
  const env = setup();
  await env.login();
  const { id } = (await env.add()).json;
  assert.equal((await env.post({ action: 'extend', id, days: 7 })).json.expires_at, '2027-01-11');
  assert.equal((await env.post({ action: 'extend', id, days: 30 })).json.expires_at, '2027-02-10');
  assert.equal((await env.post({ action: 'extend', id, expires_at: '2027-06-01' })).json.expires_at, '2027-06-01');
  assert.equal((await env.post({ action: 'extend', id, expires_at: '2020-01-01' })).status, 400);
  assert.equal((await env.post({ action: 'extend', id, days: 1000 })).status, 400);
  assert.equal(env.db.weddings.get(id).expires_at, '2027-06-01');
});

test('archivage automatique à l’échéance : plus reconnu, photos plus servies', async () => {
  const env = setup();
  await env.login();
  const { id } = (await env.add({ photos: { marie1: JPEG_B64 } })).json; // échéance 2027-01-04
  assert.equal((await env.cron('Bearer mauvais')).status, 401);
  assert.equal((await env.cron('')).status, 401);

  env.clock.t = Date.parse('2027-01-04T20:00:00Z'); // soir de l'échéance : encore actif
  assert.equal((await env.cron()).json.archived, 0);
  assert.equal((await env.find('Camille', 'Alex')).json.status, 'ok');

  env.clock.t = Date.parse('2027-01-05T03:00:00Z'); // lendemain, 4 h à Paris
  // Avant même le passage de la tâche, l'échéance passée suffit à ne plus le reconnaître.
  assert.deepEqual((await env.find('Camille', 'Alex')).json, { status: 'none' });
  assert.equal((await env.playerPhoto(id, 'marie1')).status, 404);
  const c = await env.cron();
  assert.deepEqual(c.json, { status: 'ok', archived: 1, deleted: 0 });
  assert.equal((await env.post({ action: 'list' })).status, 401); // la session de 7 jours a expiré
  await env.login();
  const l = await listOf(env);
  assert.equal(l.active.length, 0);
  assert.equal(l.archived[0].archived_on, '2027-01-05');
  assert.equal(l.archived[0].delete_on, '2028-01-05');
});

test('archivage manuel : réponse identique à un mariage inconnu, photo visible pour l’admin seulement', async () => {
  const env = setup();
  await env.login();
  const { id } = (await env.add({ photos: { marie1: JPEG_B64 } })).json;
  assert.equal((await env.post({ action: 'archive', id })).json.status, 'ok');
  assert.deepEqual((await env.find('Camille', 'Alex')).json, (await env.find('Bob', 'Leponge')).json);
  assert.deepEqual((await env.find('Camille', 'Alex')).json, { status: 'none' });
  assert.equal((await env.playerPhoto(id, 'marie1')).status, 404);
  const ap = await env.adminPhoto(id, 'marie1');
  assert.equal(ap.status, 200);
  assert.equal(ap.headers['content-type'], 'image/jpeg');
  assert.equal((await env.post({ action: 'archive', id })).status, 404); // déjà archivé
  assert.equal((await env.post({ action: 'extend', id, days: 7 })).status, 404);
});

test('restauration : nouvelle échéance obligatoire, de nouveau reconnu', async () => {
  const env = setup();
  await env.login();
  const { id } = (await env.add({ photos: { marie1: JPEG_B64 } })).json;
  await env.post({ action: 'archive', id });
  assert.equal((await env.post({ action: 'restore', id })).status, 400);
  assert.equal((await env.post({ action: 'restore', id, expires_at: '2020-01-01' })).status, 400);
  // Garde-fou aussi à la restauration.
  await env.add({ marie2_prenom: 'Zoé', marie2_nom: 'Durand' });
  assert.equal((await env.post({ action: 'restore', id, expires_at: '2027-02-01' })).json.status, 'clash');
  const r = await env.post({ action: 'restore', id, expires_at: '2027-02-01', force: true });
  assert.equal(r.json.status, 'ok');
  const w = (await listOf(env)).active.find((x) => x.id === id);
  assert.equal(w.expires_at, '2027-02-01');
  assert.equal(w.archived_on, null);
  assert.equal((await env.find('Alex', 'Martin')).json.status, 'ok');
  assert.equal((await env.playerPhoto(id, 'marie1')).status, 200);
});

test('suppression définitive automatique 1 an après l’archivage, photos comprises', async () => {
  const env = setup();
  await env.login();
  const { id } = (await env.add({ photos: { marie1: JPEG_B64 } })).json;
  await env.post({ action: 'archive', id }); // archivé le 2026-11-13
  env.clock.t = Date.parse('2027-11-12T10:00:00Z');
  assert.equal((await env.cron()).json.deleted, 0);
  env.clock.t = Date.parse('2027-11-13T03:00:00Z');
  assert.equal((await env.cron()).json.deleted, 1);
  assert.equal(env.db.weddings.size, 0);
  assert.equal(await env.db.store.adminPhoto(id, 'marie1'), null);
});

test('suppression manuelle : refusée pour un mariage actif, confirmation obligatoire', async () => {
  const env = setup();
  await env.login();
  const { id } = (await env.add({ photos: { marie1: JPEG_B64 } })).json;
  const refused = await env.post({ action: 'delete', id, confirm: 'supprimer' });
  assert.equal(refused.status, 400);
  assert.match(refused.json.error, /Archive d’abord/);
  assert.equal(env.db.weddings.size, 1);
  await env.post({ action: 'archive', id });
  assert.equal((await env.post({ action: 'delete', id, confirm: 'oui' })).status, 400);
  assert.equal(env.db.weddings.size, 1);
  assert.equal((await env.post({ action: 'delete', id, confirm: ' Supprimer ' })).json.status, 'ok');
  assert.equal(env.db.weddings.size, 0);
  assert.equal(await env.db.store.adminPhoto(id, 'marie1'), null);
});
