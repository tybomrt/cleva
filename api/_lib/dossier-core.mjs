// Cœur de l'écran « Retrouver le dossier » (pages d'énigme /m/) — code pur, sans base de données,
// pour pouvoir le tester (tests/dossier.test.mjs). Utilisé par api/dossier.js et les scripts.

export const ROLES = ['marie1', 'marie2', 'temoin1', 'temoin2'];
export const ID_RE = /^[A-Za-z0-9_-]{22}$/;
const MAX_LEN = 60;

// Minuscules, sans accents, sans espaces, tirets ni apostrophes.
// « Jean-Éric » → « jeaneric » · « D’Artagnan » → « dartagnan » · « Lefèvre » → « lefevre »
export function normalize(value) {
  if (typeof value !== 'string') return '';
  return value
    .slice(0, MAX_LEN)
    .replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s\-‐-―'’‘`´ʼ]/g, '');
}

// Les 4 champs du formulaire → valeurs normalisées, non vides, sans doublons (l'ordre n'a pas d'importance).
export function prepareInputs(values) {
  const out = [];
  for (const v of Array.isArray(values) ? values.slice(0, 4) : []) {
    const n = normalize(v);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

// Les 4 valeurs reconnues d'un mariage, normalisées : [prénom1, nom1, prénom2, nom2].
export function weddingKeys(w) {
  return [w.marie1_prenom, w.marie1_nom, w.marie2_prenom, w.marie2_nom].map(normalize);
}

// Nombre maximal de valeurs saisies qui correspondent chacune à une valeur DISTINCTE du mariage
// (couplage maximal : « Dupont » saisi une fois ne compte qu'une fois, même si les deux mariés s'appellent Dupont).
export function matchScore(inputs, keys) {
  const slotOf = new Array(keys.length).fill(-1);
  function tryInput(i, seen) {
    for (let j = 0; j < keys.length; j++) {
      if (keys[j] !== inputs[i] || seen[j]) continue;
      seen[j] = true;
      if (slotOf[j] < 0 || tryInput(slotOf[j], seen)) { slotOf[j] = i; return true; }
    }
    return false;
  }
  let score = 0;
  for (let i = 0; i < inputs.length; i++) if (tryInput(i, [])) score++;
  return score;
}

// Décision. Ne révèle jamais combien de mariages correspondent :
//   'ok'   → exactement un mariage avec au moins 2 valeurs distinctes reconnues
//   'more' → moins de 2 valeurs saisies, une seule valeur reconnue, ou plusieurs mariages possibles
//   'none' → rien ne correspond
export function resolve(inputs, candidates) {
  if (inputs.length < 2) return { status: 'more' };
  let best = 0;
  const full = [];
  for (const w of candidates) {
    const s = matchScore(inputs, w.cles || weddingKeys(w));
    if (s > best) best = s;
    if (s >= 2) full.push(w);
  }
  if (full.length === 1) return { status: 'ok', wedding: full[0] };
  if (full.length > 1 || best === 1) return { status: 'more' };
  return { status: 'none' };
}

// Ce que le navigateur reçoit en cas de succès : prénoms + URL des photos (via l'id secret). Rien d'autre.
export function publicDossier(w, photoRoles) {
  const photos = {};
  for (const r of ROLES) {
    if (photoRoles.includes(r)) photos[r] = '/api/photo?d=' + w.id + '&r=' + r;
  }
  return {
    id: w.id,
    prenoms: {
      marie1: w.marie1_prenom, marie2: w.marie2_prenom,
      temoin1: w.temoin1_prenom, temoin2: w.temoin2_prenom,
    },
    photos,
  };
}

// Limitation des essais par adresse IP (store : { count(key, sinceMs), add(key, atMs) }).
export function createRateLimiter({ store, limit = 10, windowMs = 10 * 60 * 1000, now = Date.now }) {
  return {
    // true = essai autorisé (et compté) ; false = trop d'essais.
    async hit(key) {
      const t = now();
      const n = await store.count(key, t - windowMs);
      if (n >= limit) return false;
      await store.add(key, t);
      return true;
    },
  };
}

// Store en mémoire (tests et serveur local).
export function memoryStore() {
  const hits = new Map();
  return {
    async count(key, since) { return (hits.get(key) || []).filter((t) => t > since).length; },
    async add(key, at) { hits.set(key, (hits.get(key) || []).concat(at)); },
  };
}
