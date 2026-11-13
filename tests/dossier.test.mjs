// Tests de l'écran « Retrouver le dossier » : normalisation, règle de reconnaissance, limitation des essais.
// Lancer : npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, prepareInputs, weddingKeys, matchScore, resolve, memoryStore, createRateLimiter } from '../api/_lib/dossier-core.mjs';
import { makeDossierHandler } from '../api/_lib/handlers.mjs';

function wedding(id, m1p, m1n, m2p, m2n) {
  const w = { id, marie1_prenom: m1p, marie1_nom: m1n, marie2_prenom: m2p, marie2_nom: m2n, temoin1_prenom: 'Sam', temoin2_prenom: 'Léo' };
  w.cles = weddingKeys(w);
  return w;
}
const DUPONT = wedding('A'.repeat(22), 'Camille', 'Dupont', 'Alex', 'Martin');
const LUCAS1 = wedding('B'.repeat(22), 'Lucas', 'Bernard', 'Inès', 'Moreau');
const LUCAS2 = wedding('C'.repeat(22), 'Lucas', 'Petit', 'Chloé', 'Roux');
const MEMENOM = wedding('D'.repeat(22), 'Jean-Éric', 'Le Gall', 'Anne-Sophie', 'Le Gall');
const COMPOSE = wedding('E'.repeat(22), 'Marie-Hélène', "D'Artagnan", 'Zoé', 'Saint-Exupéry');
const ALL = [DUPONT, LUCAS1, LUCAS2, MEMENOM, COMPOSE];

// Simule la base : renvoie les mariages qui partagent au moins une valeur.
function find(inputs) { return ALL.filter((w) => w.cles.some((k) => inputs.includes(k))); }
function check(p1, n1, p2, n2) {
  const inputs = prepareInputs([p1, n1, p2, n2]);
  return resolve(inputs, find(inputs));
}

test('normalisation : minuscules, accents, espaces, tirets, apostrophes', () => {
  assert.equal(normalize('Hélène'), 'helene');
  assert.equal(normalize('  JEAN-ÉRIC '), 'jeaneric');
  assert.equal(normalize("D'Artagnan"), 'dartagnan');
  assert.equal(normalize('D’Artagnan'), 'dartagnan');
  assert.equal(normalize('Le Gall'), 'legall');
  assert.equal(normalize('Saint – Exupéry'), 'saintexupery');
  assert.equal(normalize('Cœur'), 'coeur');
  assert.equal(normalize(null), '');
  assert.equal(normalize(42), '');
});

test('deux valeurs identiques saisies ne comptent qu’une fois', () => {
  assert.deepEqual(prepareInputs(['Dupont', 'dupont', 'DUPONT', '']), ['dupont']);
});

test('deux prénoms, dans n’importe quel ordre et n’importe quel champ', () => {
  assert.equal(check('Camille', '', 'Alex', '').status, 'ok');
  assert.equal(check('Alex', '', 'Camille', '').status, 'ok');
  assert.equal(check('', 'Camille', '', 'Alex').status, 'ok');
  assert.equal(check('Camille', 'Alex', '', '').wedding.id, DUPONT.id);
});

test('un prénom + le nom de l’autre marié (ou du même)', () => {
  assert.equal(check('Camille', 'Martin', '', '').status, 'ok');
  assert.equal(check('', 'Dupont', 'Alex', '').status, 'ok');
  assert.equal(check('Camille', 'Dupont', '', '').status, 'ok');
});

test('avec ou sans accents et majuscules', () => {
  assert.equal(check('CAMILLE', 'martin', '', '').status, 'ok');
  assert.equal(check('Ines', 'bernard', '', '').status, 'ok');
  assert.equal(check('INÈS', 'Bernard', '', '').status, 'ok');
  assert.equal(check('chloe', 'ROUX', '', '').wedding.id, LUCAS2.id);
});

test('noms composés (tirets, espaces, apostrophes)', () => {
  assert.equal(check('marie helene', 'dartagnan', '', '').status, 'ok');
  assert.equal(check('Zoé', 'Saint Exupery', '', '').status, 'ok');
  assert.equal(check('MarieHélène', '', 'zoe', '').status, 'ok');
});

test('une seule information → « Encore un nom »', () => {
  assert.equal(check('Camille', '', '', '').status, 'more');
  assert.equal(check('', '', '', 'Dupont').status, 'more');
  assert.equal(check('Camille', 'camille', '', '').status, 'more'); // doublon = une seule valeur
  // Une seule valeur saisie, même inconnue : pas de recherche, donc rien n'est révélé.
  assert.equal(check('Xyz', '', '', '').status, 'more');
  // Deux valeurs dont une seule reconnue.
  assert.equal(check('Camille', 'Inconnu', '', '').status, 'more');
});

test('deux couples avec le même prénom (Lucas), noms différents', () => {
  assert.equal(check('Lucas', '', '', '').status, 'more');
  assert.equal(check('Lucas', 'Bernard', '', '').wedding.id, LUCAS1.id);
  assert.equal(check('Lucas', 'Petit', '', '').wedding.id, LUCAS2.id);
  assert.equal(check('Lucas', '', 'Inès', '').wedding.id, LUCAS1.id);
  // « Lucas » + une valeur de chaque couple ne suffit pas à trancher : un seul couple atteint 2.
  assert.equal(check('Lucas', 'Roux', '', '').wedding.id, LUCAS2.id);
});

test('plusieurs mariages correspondent → « Encore un nom » (jamais de liste)', () => {
  const twin = wedding('F'.repeat(22), 'Lucas', 'Bernard', 'Emma', 'Durand');
  const inputs = prepareInputs(['Lucas', 'Bernard', '', '']);
  assert.deepEqual(resolve(inputs, [LUCAS1, twin]), { status: 'more' });
  // Avec un 3e nom, on retrouve le bon.
  const inputs3 = prepareInputs(['Lucas', 'Bernard', 'Inès', '']);
  assert.equal(resolve(inputs3, [LUCAS1, twin]).status, 'more'); // les deux ont toujours ≥ 2
  const inputs4 = prepareInputs(['Lucas', 'Bernard', 'Inès', 'Moreau']);
  assert.equal(resolve(inputs4, [LUCAS1, twin]).status, 'more');
});

test('deux mariés avec le même nom de famille', () => {
  // « Le Gall » saisi une seule fois = une seule valeur, même s’il correspond aux deux mariés.
  assert.equal(check('Le Gall', '', '', '').status, 'more');
  assert.equal(check('Le Gall', 'le-gall', '', '').status, 'more');
  assert.equal(matchScore(['legall'], MEMENOM.cles), 1);
  assert.equal(check('Jean-Éric', 'Le Gall', '', '').status, 'ok');
  assert.equal(check('Anne-Sophie', '', '', 'Le Gall').status, 'ok');
  assert.equal(check('jean eric', 'anne sophie', '', '').status, 'ok');
});

test('aucune correspondance', () => {
  assert.equal(check('Bob', 'Leponge', '', '').status, 'none');
  assert.equal(check('Camile', 'Dupond', '', '').status, 'none'); // pas de tolérance aux fautes
});

test('limitation des essais : 10 par 10 minutes et par IP', async () => {
  let t = 1_000_000;
  const limiter = createRateLimiter({ store: memoryStore(), now: () => t });
  for (let i = 0; i < 10; i++) assert.equal(await limiter.hit('ip1'), true);
  assert.equal(await limiter.hit('ip1'), false);
  assert.equal(await limiter.hit('ip2'), true); // une autre IP n'est pas bloquée
  t += 10 * 60 * 1000 + 1;
  assert.equal(await limiter.hit('ip1'), true); // la fenêtre est passée
});

// --- Fonction complète, avec une fausse base ---
function fakeRes() {
  const r = { statusCode: 0, headers: {}, body: '' };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.end = (b) => { r.body = b ? String(b) : ''; };
  return r;
}
function call(handler, body, ip = '1.2.3.4') {
  const res = fakeRes();
  return handler({ method: 'POST', body, headers: { 'x-forwarded-for': ip } }, res).then(() => ({ status: res.statusCode, json: JSON.parse(res.body), headers: res.headers }));
}
function fakeHandler() {
  return makeDossierHandler({
    findCandidates: async (inputs) => find(inputs),
    photoRoles: async () => ['marie1', 'marie2', 'temoin1', 'temoin2'],
    rateStore: memoryStore(),
    ipHash: (ip) => ip,
  });
}

test('réponse de succès : prénoms et URL de photos seulement, jamais de liste', async () => {
  const r = await call(fakeHandler(), { prenom1: 'camille', nom1: '', prenom2: 'alex', nom2: '' });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json), ['status', 'dossier']);
  assert.deepEqual(r.json.dossier.prenoms, { marie1: 'Camille', marie2: 'Alex', temoin1: 'Sam', temoin2: 'Léo' });
  assert.equal(r.json.dossier.photos.marie1, '/api/photo?d=' + DUPONT.id + '&r=marie1');
  assert.ok(!JSON.stringify(r.json).includes('Dupont')); // aucun nom de famille renvoyé
  assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow, noarchive');
});

test('réponses « more » / « none » sans aucune autre information', async () => {
  const h = fakeHandler();
  assert.deepEqual((await call(h, { prenom1: 'Lucas' })).json, { status: 'more' });
  assert.deepEqual((await call(h, { prenom1: 'Bob', nom1: 'Leponge' })).json, { status: 'none' });
  assert.deepEqual((await call(h, 'pas du json')).json, { status: 'more' });
});

test('la fonction bloque après 10 essais, avec une réponse générique', async () => {
  const h = fakeHandler();
  for (let i = 0; i < 10; i++) assert.equal((await call(h, { prenom1: 'X', nom1: 'Y' })).status, 200);
  const r = await call(h, { prenom1: 'Camille', nom1: 'Martin' });
  assert.equal(r.status, 429);
  assert.deepEqual(r.json, { status: 'wait' });
  assert.equal((await call(h, { prenom1: 'Camille', nom1: 'Martin' }, '5.6.7.8')).json.status, 'ok');
});
