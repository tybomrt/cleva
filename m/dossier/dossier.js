/* Écran « Retrouver le dossier », commun aux deux pages d'énigme (messagerie et boîte mail).

   À la première ouverture sur un téléphone, Raphaël demande qui se marie. Le serveur
   (api/dossier.mjs) reconnaît le mariage et renvoie les prénoms + les URL des photos ; la page
   remplace alors les jetons {marie1} {marie2} {temoin1} {temoin2} de data.js et les photos des
   personnes listées dans data.roles (sans photo : pastille avec l'initiale). Les jetons genrés
   {temoin2:masculin|féminin}, {couple:…|…}, {groupe:…|…} s'accordent au genre reçu.
   Sans dossier : Lucas, Sacha, Clara, Julien et les photos actuelles.

   Le choix est gardé dans localStorage (même adresse pour les deux pages : une seule saisie).
   ?dossier=reset dans l'adresse efface ce choix (tests).

   Utilisation, à la place du <script> de app.js :
     <script src="/m/dossier/dossier.js" data-data="MESSAGES_DATA" data-app="/m/.../app.js"></script>
   app.js n'est chargé qu'une fois le dossier choisi : il ne voit jamais les jetons. */
(function () {
  'use strict';

  var KEY = 'cleva-dossier';
  var DEFAULTS = { marie1: 'Lucas', marie2: 'Sacha', temoin1: 'Clara', temoin2: 'Julien' };
  // Genre des personnages par défaut (sans dossier, ou dossier ancien sans genre).
  var DEFAULT_GENRES = { marie1: 'h', marie2: 'h', temoin1: 'f', temoin2: 'h' };
  // Couleur de la pastille d'initiale quand un vrai marié / témoin n'a pas de photo.
  var COLORS = { marie1: '#E8C6B8', marie2: '#C9D3EC', temoin1: '#E3C9D6', temoin2: '#C8D9A6' };
  var ROLES = ['marie1', 'marie2', 'temoin1', 'temoin2'];
  var me = document.currentScript;
  var DATA = window[me.getAttribute('data-data')];
  var APP = me.getAttribute('data-app');

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  if (/[?&]dossier=reset\b/.test(location.search)) { try { localStorage.removeItem(KEY); } catch (e) {} }

  /* ---------- Personnalisation de data.js ---------- */
  function personalize(choice) {
    var perso = choice && choice.mode === 'perso';
    var names = {}, genres = {}, photos = (perso && choice.photos) || {};
    ROLES.forEach(function (r) {
      var v = perso && choice.prenoms && typeof choice.prenoms[r] === 'string' ? choice.prenoms[r].trim() : '';
      names[r] = v || DEFAULTS[r];
      var g = perso && choice.genres && choice.genres[r];
      genres[r] = g === 'f' || g === 'h' ? g : DEFAULT_GENRES[r];
    });
    var roles = DATA.roles || {};
    // {couple:…|…} : féminin si les deux mariés sont des femmes.
    // {groupe:…|…} : féminin si toutes les personnes jouées par le vrai mariage dans cette page sont des femmes.
    var fem = {
      couple: genres.marie1 === 'f' && genres.marie2 === 'f',
      groupe: Object.keys(roles).length > 0 && Object.keys(roles).every(function (pid) { return genres[roles[pid]] === 'f'; }),
    };
    ROLES.forEach(function (r) { fem[r] = genres[r] === 'f'; });
    // Remplace les jetons dans tous les textes (messages, noms, objets…) :
    //   {temoin2:ma chemise|ma robe} → selon le genre ; {marie1} → prénom.
    (function walk(o) {
      for (var k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        if (typeof o[k] === 'string') {
          o[k] = o[k]
            .replace(/\{(marie1|marie2|temoin1|temoin2|couple|groupe):([^|{}]*)\|([^{}]*)\}/g, function (_, r, m, f) { return fem[r] ? f : m; })
            .replace(/\{(marie1|marie2|temoin1|temoin2)\}/g, function (_, r) { return names[r]; });
        } else if (o[k] && typeof o[k] === 'object') walk(o[k]);
      }
    })(DATA);
    // Photos des personnes qui jouent un rôle. Vrai mariage sans photo (ou photo plus servie) :
    // pastille avec l'initiale du prénom, jamais la photo du personnage par défaut.
    for (var pid in roles) {
      var p = DATA.people && DATA.people[pid], r = roles[pid];
      if (!p) continue;
      if (!perso) continue;
      if (photos[r] && /^\/api\/photo\?/.test(photos[r])) {
        p.avatar = photos[r];
      } else {
        delete p.avatar;
        p.initials = names[r].charAt(0).toUpperCase();
        if (!p.color) p.color = COLORS[r];
      }
    }
  }

  function start(choice) {
    // Photos des mariés : chacune est vérifiée avant l'affichage. Si le mariage a été archivé
    // entre-temps (le serveur ne la sert plus), la photo par défaut reste : jamais d'image cassée.
    checkPhotos(choice, function () {
      personalize(choice);
      var s = document.createElement('script');
      s.src = APP;
      document.body.appendChild(s);
    });
  }
  function checkPhotos(choice, done) {
    var photos = choice && choice.mode === 'perso' && choice.photos;
    var roles = photos ? Object.keys(photos) : [];
    if (!roles.length) return done();
    var loaded = {}, left = roles.length, finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      // On ne garde que les photos réellement chargées (le choix enregistré, lui, ne change pas :
      // si le mariage est restauré, ses photos reviennent).
      roles.forEach(function (r) { if (!loaded[r]) delete photos[r]; });
      done();
    }
    // Au pire 4 s d'attente (réseau lent) : les photos pas encore chargées sont laissées de côté.
    var timer = setTimeout(finish, 4000);
    roles.forEach(function (r) {
      var img = new Image();
      img.onload = function () { loaded[r] = true; if (!--left) finish(); };
      img.onerror = function () { if (!--left) finish(); };
      img.src = String(photos[r]);
    });
  }

  var saved = load();
  if (saved && (saved.mode === 'default' || saved.mode === 'perso')) return start(saved);

  /* ---------- Écran de sélection ---------- */
  var fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@400;500&display=swap';
  document.head.appendChild(fonts);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function field(name, label, auto) {
    var wrap = el('label', 'dossier-field');
    wrap.appendChild(el('span', 'dossier-label', label));
    var input = el('input');
    input.name = name; input.type = 'text'; input.maxLength = 60;
    input.autocomplete = auto; input.setAttribute('autocapitalize', 'words'); input.spellcheck = false;
    wrap.appendChild(input);
    return wrap;
  }
  function group(n) {
    var fs = el('fieldset', 'dossier-group');
    fs.appendChild(el('legend', 'dossier-legend', 'Marié ' + n));
    // Prénom et nom côte à côte : le bouton reste visible sans faire défiler.
    var row = el('div', 'dossier-row');
    row.appendChild(field('prenom' + n, 'Prénom', 'off'));
    row.appendChild(field('nom' + n, 'Nom de famille', 'off'));
    fs.appendChild(row);
    return fs;
  }

  var screen = el('div', 'dossier');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', 'dossier-title');
  var card = el('div', 'dossier-card');
  var head = el('header', 'dossier-head');
  var h1 = el('h1', 'dossier-title', 'Raphaël Verdier');
  h1.id = 'dossier-title';
  head.appendChild(h1);
  head.appendChild(el('p', 'dossier-kicker', 'Wedding planner'));
  card.appendChild(head);
  card.appendChild(el('p', 'dossier-intro', 'Je jongle entre plusieurs dossiers. Dites-moi qui se marie, que je retrouve le bon.'));

  var form = el('form', 'dossier-form');
  form.noValidate = true;
  // Réponse de Raphaël EN HAUT du formulaire : sur téléphone, le bas est caché par le clavier.
  var notice = el('div', 'dossier-notice');
  notice.hidden = true;
  var msg = el('p', 'dossier-msg');
  msg.setAttribute('role', 'status');
  notice.appendChild(msg);
  var skip = el('button', 'dossier-skip', 'Continuer sans dossier');
  skip.type = 'button';
  skip.hidden = true;
  notice.appendChild(skip);
  form.appendChild(notice);
  form.appendChild(group(1));
  form.appendChild(group(2));
  var button = el('button', 'dossier-submit', 'Retrouver le dossier');
  button.type = 'submit';
  form.appendChild(button);
  card.appendChild(form);
  screen.appendChild(card);
  document.body.appendChild(screen);
  document.documentElement.classList.add('dossier-open');

  // tone 'info' (recherche en cours) : discret ; sinon message d'erreur bien visible.
  function say(text, showSkip, tone) {
    msg.textContent = text;
    skip.hidden = !showSkip;
    notice.hidden = false;
    notice.className = 'dossier-notice' + (tone === 'info' ? ' is-info' : ' is-error');
    try { notice.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }
  var MORE = "Je n'ai pas réussi à identifier les mariés, merci de compléter les autres champs.";
  function close(choice) {
    save(choice);
    screen.remove();
    document.documentElement.classList.remove('dossier-open');
    start(choice);
  }

  skip.addEventListener('click', function () { close({ v: 1, mode: 'default' }); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = {};
    ['prenom1', 'nom1', 'prenom2', 'nom2'].forEach(function (k) { v[k] = form.elements[k].value.trim(); });
    var filled = Object.keys(v).filter(function (k) { return v[k]; }).length;
    if (filled < 2) return say(MORE, false);

    button.disabled = true;
    say('Je cherche…', false, 'info');
    fetch('/api/dossier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
      .then(function (r) { return r.json().catch(function () { return { status: 'error' }; }); })
      .then(function (r) {
        button.disabled = false;
        if (r.status === 'ok' && r.dossier) {
          return close({ v: 1, mode: 'perso', id: r.dossier.id, prenoms: r.dossier.prenoms, genres: r.dossier.genres || {}, photos: r.dossier.photos });
        }
        if (r.status === 'more') return say(MORE, false);
        if (r.status === 'none') return say("Je ne trouve pas ce dossier. Vérifiez l'orthographe.", true);
        if (r.status === 'wait') return say('Doucement, je fouille encore mes classeurs. Réessayez dans quelques minutes.', true);
        say('Petit souci de connexion. Réessayez dans un instant.', true);
      })
      .catch(function () {
        button.disabled = false;
        say('Petit souci de connexion. Réessayez dans un instant.', true);
      });
  });

  // Curseur dans le premier champ seulement sur ordinateur : sur téléphone, le clavier
  // s'ouvrirait et cacherait le texte de Raphaël.
  if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) form.elements.prenom1.focus();
})();
