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
