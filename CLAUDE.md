# cleva. — site web

## Le projet
Site pour cleva., escape game de mariage (1 boîte = 1 table), en 2 pages : Accueil
(index.html, FAQ incluse en bas de page) et Le produit (produit.html).
Paiement externe via Stripe (lien existant, ne pas recréer de logique de paiement ici).

## Stack
- HTML/CSS/JS, pas de framework front (pas de React/Vue/etc., pas de composants).
- Déployé sur Vercel. Une fonction serverless dans /api pour le formulaire email (Node.js).
  Aucune config de build côté Vercel : les fichiers à la racine (`index.html`,
  `produit.html`, `styles/tailwind.css`) sont déjà les artefacts finaux, servis tels quels.
- **`index.html` et `produit.html` sont générés — ne pas les éditer à la main.**
  Le contenu source vit dans `templates/pages/*.html` (une page = un fichier, avec des
  directives `<!--#include "partials/xxx.html" cle="valeur" -->` pour les blocs partagés)
  et `templates/partials/*.html` (header, footer, section notify — communs aux deux pages,
  avec des `{{variables}}` pour ce qui diffère par page, ex. `cta_href`, `faq_href`).
  `scripts/build-html.js` (Node pur, zéro dépendance) assemble le tout.
- Tailwind CSS compilé via Tailwind CLI (`tailwind.config.js` à la racine), plus de CDN
  runtime. `styles/tailwind.src.css` (source) → `styles/tailwind.css` (généré, commité,
  chargé par un simple `<link>`). Le scan des classes se fait sur les fichiers HTML
  *générés* (pas sur les templates, qui contiennent des `{{variables}}` à la place des
  classes réelles) — d'où l'ordre du build : HTML avant CSS.
- **`npm run build`** régénère tout (HTML puis CSS) après toute modif de template, partial,
  ou classe Tailwind. **`npm start`** (= `npm run dev`) fait un build complet puis lance
  les watchers (HTML + CSS) et `browser-sync` sur `:4173` — c'est la commande à utiliser
  pour éditer en local, plus besoin de relancer quoi que ce soit à la main.
- Polices : Marcellus (titres/marque, via `font-display`) et DM Sans (texte courant, via
  `font-sans`, appliqué par défaut sur `<body>`). Chargées via Google Fonts (`<link>`).

## Page d'énigme (QR code dans les boîtes)
- Messagerie fictive dans `m/yPIJmt0brVePOdo8/` : page autonome (HTML/CSS/JS à la main, hors
  templates et hors Tailwind, pour rester légère). Contenu des messages : `data.js`.
- Le QR code imprimé pointe vers `/q/zktAqDX8cT0o`, redirigé (307 temporaire, `vercel.json`) vers la page.
  Les deux adresses sont des suites aléatoires : ne jamais les remplacer par des mots devinables.
  **Ne jamais supprimer cette redirection** : les boîtes déjà livrées en dépendent.
- Écran de verrouillage au départ : code = heure de « Début cérémonie » entourée sur le planning
  papier (`lock.code` dans `data.js`, actuellement 1730). Une fois déverrouillé, le téléphone le
  reste (localStorage) ; ajouter `?lock` à l'adresse pour le reverrouiller en test.
- Ne jamais la lier depuis le site, ni l'ajouter au sitemap, à `llms.txt` ou à `robots.txt`.
  `noindex` via meta + en-tête `X-Robots-Tag`.

## Page d'énigme n° 2 : la boîte mail de la mariée
- Boîte mail fictive dans `m/g5yhusBhTNYr7X0n/` : même principe (autonome, hors templates et
  hors Tailwind). Contenu des e-mails : `data.js` (seul fichier à modifier).
- QR code : `/q/uMxvRsgK7km5` → redirection 307 vers la page (`vercel.json`). Mêmes règles que
  l'énigme 1 : adresses aléatoires, ne jamais supprimer la redirection une fois des boîtes livrées,
  jamais liée depuis le site, ni dans sitemap / `llms.txt` / `robots.txt`, `noindex`.
- **Autre couple que l'énigme 1**. La mariée (« Moi », future.mariee@mail.fr) et sa témoin
  (« Ma témoin 💍 ») n'ont **pas de prénom** : rester générique, pour que chaque couple s'y
  retrouve. Ce sont des femmes : accorder les textes au féminin. Deuxième témoin : Inès Moreau.
  Aucun personnage, photo ou anecdote en commun avec la messagerie (Lucas, Clara, etc.).
- Deux échanges comptent pour l'énigme : « Toujours pas remboursée » (non lu, en haut : la mariée
  se plaint d'un prestataire — jamais nommé — qui ne rembourse pas le trop-perçu, sa témoin la
  renvoie vers l'origami) et « Un petit cadeau (à plier) » (ancien, à retrouver via la recherche). `?reset` remet tout en non lu.
- Dates **relatives au jour d'ouverture** (= jour du mariage) : `date: 'J-1 22:15'` = la veille.
  La mariée écrit à J-2, sa témoin répond à J-1. Ne jamais écrire de date en dur dans les textes
  (« vendredi 24 octobre »…). `?jour=AAAA-MM-JJ` simule un autre jour pour tester.
- La pièce jointe origami est une vidéo YouTube intégrée (muette, plein écran au lancement).
  L'iframe garde `referrerpolicy="strict-origin-when-cross-origin"` : sans en-tête Referer
  (la page est en `no-referrer`), YouTube refuse la lecture (« Erreur 153 »).

## Dossiers : prénoms et photos des vrais mariés dans les deux pages d'énigme
- Les QR codes sont identiques pour toutes les boîtes. À la première ouverture, un écran
  « Retrouver le dossier » (Raphaël, wedding planner) demande qui se marie ; le choix est gardé
  dans localStorage (`cleva-dossier`, commun aux deux pages). `?dossier=reset` l'efface (tests).
- Code partagé : `m/dossier/dossier.js` + `dossier.css`, chargés par les deux `index.html` à la
  place de `app.js` (qui n'est chargé qu'une fois le dossier choisi).
- Dans les `data.js`, les prénoms sont des jetons `{marie1}` `{marie2}` `{temoin1}` `{temoin2}`
  (sans dossier : Lucas, Sacha, Clara, Julien). `roles` dit quelle personne prend prénom + photo :
  SMS man = marie1, woman = temoin1, julien = temoin2 ; mail sacha = marie2. Ne jamais réécrire
  ces prénoms en dur. Vrai mariage sans photo : pastille avec l'initiale du prénom (jamais la photo
  du personnage par défaut).
- Chaque personne a un genre (f / h, choisi dans l'admin). Tout texte qui dépend du genre d'un rôle
  s'écrit `{temoin2:masculin|féminin}` ; `{couple:…|…}` = féminin si les deux mariés sont des femmes ;
  `{groupe:…|…}` = féminin si toutes les personnes jouées dans la page (`roles`) sont des femmes.
  Sans genre : accord du personnage par défaut (Lucas h, Sacha h, Clara f, Julien h).
- Serveur : `api/dossier.mjs` (reconnaissance, 10 essais / 10 min / IP) et `api/photo.mjs` ; toute
  la logique dans `api/_lib/` (testée : `npm test`). Données dans Neon (projet `cleva-dossiers`),
  **jamais dans le dépôt** (il est public et Vercel sert toute la racine). Variables d'env. :
  `DATABASE_URL`, `DOSSIER_SALT`, `ADMIN_PASSWORD`, `CRON_SECRET` (Vercel + `.env` local, ignoré par
  Git ; en local, mots de passe de test seulement). Les fonctions de `api/` restent en `.mjs`
  (en `.js`, Vercel les convertit en CommonJS et elles plantent au chargement).
- Cycle de vie (règles : `api/_lib/admin-core.mjs`) : un mariage est **actif** jusqu'au soir de son
  échéance (`expires_at`, par défaut mariage + 30 jours, heure de Paris), puis **archivé** : plus
  reconnu (même réponse qu'un inconnu), photos plus servies (404 ; `dossier.js` remet alors la photo
  par défaut). Archives **supprimées définitivement 1 an après l'archivage**, photos comprises.
  Tâche quotidienne : `api/cron-weddings.mjs` (Vercel Cron, 3 h UTC, `crons` dans `vercel.json`,
  protégée par `CRON_SECRET`). Schéma : `scripts/weddings/schema.sql` (relançable sans risque).
- **Administration** (la voie normale) : `/admin/PjDaZmwTaAeANTAn/` — adresse secrète, jamais liée,
  ni dans sitemap / `llms.txt` / `robots.txt`, `noindex` (meta + en-tête). Mot de passe
  `ADMIN_PASSWORD`, session 7 jours (cookie HttpOnly, 5 essais / 15 min / IP). Ajouter, modifier,
  prolonger, archiver, restaurer, supprimer définitivement (depuis les archives seulement). Photos
  recadrées en 144 px JPEG dans le navigateur. Une seule fonction : `api/admin.mjs`
  (logique : `api/_lib/admin-handlers.mjs`).
- Solution de secours en ligne de commande : `npm run add-wedding -- --date … --m1-prenom … --m1-nom …
  --m1-photo … [--echeance AAAA-MM-JJ]` (détail en tête de `scripts/weddings/add-wedding.mjs`) et
  `npm run purge-weddings` (= la tâche quotidienne ; `-- --dry-run` pour voir). Mariage de test :
  Camille Dupont & Alex Martin, témoins Sam et Léo.
- Tester en local avec l'API : `npm run dev:dossiers` (http://localhost:4176/m/… et /admin/…).

## Conventions
- Classes Tailwind directement dans le HTML (des templates) pour le style. `main.css`
  réservé aux quelques overrides custom que Tailwind ne couvre pas.
- Un fichier CSS par grande zone si ça grossit, sinon tout dans main.css.
- JS vanilla, pas de dépendance front ajoutée sans raison. Les outils de *build* (Tailwind
  CLI, le script de templating) sont acceptés puisqu'ils ne s'exécutent jamais dans le
  navigateur — le site livré reste 100% statique.
- Images optimisées avant d'être ajoutées dans /assets/images (pas de fichiers >500ko).

## Voix de marque (@tybocrea / cleva.)
Drôle, autodérision, bienveillant, concret, conversationnel.
Jamais corporate, jamais donneur de leçons.
Pour toute copy (boutons, titres, micro-texte), rester dans ce registre.

## Ce qu'il ne faut pas casser
- Le lien Stripe existant (buy.stripe.com/...) doit rester fonctionnel partout où il est utilisé.
- La boîte mail OVH (cleva-games.fr) ne doit pas être affectée par un changement DNS futur.
