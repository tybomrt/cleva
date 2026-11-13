/* Administration des dossiers (mariages des pages d'énigme).
   Parle uniquement à /api/admin (session dans un cookie HttpOnly, invisible ici).
   Les photos sont recadrées au carré en 144 px JPEG ici même (canvas) : rien d'autre que
   ces pixels n'est envoyé (ni GPS, ni appareil photo). */
(function () {
  'use strict';

  var API = '/api/admin';
  var ROLES = ['marie1', 'marie2', 'temoin1', 'temoin2'];
  var SIZE = 144;

  var state = { today: null, active: [], archived: [], tab: 'active', editing: null, photos: {}, autoExpiry: false, prevDate: '' };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Dates (chaînes AAAA-MM-JJ) ---------- */
  function addDays(date, n) {
    var d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
  var FMT = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
  var FMT_DAY = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function fmt(date) { return date ? FMT.format(new Date(date + 'T00:00:00Z')) : ''; }
  function fmtDay(date) { return date ? FMT_DAY.format(new Date(date + 'T00:00:00Z')) : ''; }
  function today() { return state.today || new Date().toISOString().slice(0, 10); }
  // « dans 52 jours », « demain », « aujourd'hui »…
  function relative(date) {
    var n = daysBetween(today(), date);
    if (n === 0) return "aujourd'hui";
    if (n === 1) return 'demain';
    if (n === -1) return 'hier';
    if (n > 1) return 'dans ' + n + ' jours';
    return 'il y a ' + (-n) + ' jours';
  }

  /* ---------- Appels au serveur ---------- */
  function api(body) {
    return fetch(API, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return { status: 'error' }; }).then(function (j) {
        if (r.status === 401 && j.status === 'login') {
          showLogin(state.today ? 'Ta session a expiré : reconnecte-toi.' : '');
          throw new Error('login');
        }
        return j;
      });
    }, function () {
      return { status: 'error', error: 'Pas de connexion internet ? Réessaie dans un instant.' };
    });
  }
  function errorOf(r) { return (r && r.error) || 'Petit souci. Réessaie dans un instant.'; }
  function photoUrl(id, role) { return API + '?action=photo&id=' + encodeURIComponent(id) + '&role=' + role + '&t=' + Date.now(); }

  var toastTimer;
  function toast(text) {
    var t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3000);
  }
  function show(id, text) { var n = $(id); n.textContent = text || ''; n.hidden = !text; }

  /* ---------- Écrans ---------- */
  function view(name) {
    ['login', 'list', 'edit'].forEach(function (v) { $('view-' + v).hidden = v !== name; });
    $('logout').hidden = name === 'login';
    window.scrollTo(0, 0);
  }

  function showLogin(msg) {
    view('login');
    show('login-msg', msg);
    var input = $('login-form').elements.password;
    input.value = '';
    if (matchMedia('(hover: hover)').matches) input.focus();
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = f.querySelector('button');
    if (!f.elements.password.value) return show('login-msg', 'Il manque le mot de passe.');
    btn.disabled = true;
    api({ action: 'login', password: f.elements.password.value }).then(function (r) {
      btn.disabled = false;
      if (r.status === 'ok') { show('login-msg', ''); return loadList(); }
      show('login-msg', errorOf(r));
      f.elements.password.select();
    }, function () { btn.disabled = false; });
  });

  $('logout').addEventListener('click', function () {
    api({ action: 'logout' }).then(function () { showLogin(''); toast('À bientôt !'); }, function () {});
  });

  /* ---------- Listes ---------- */
  function loadList() {
    return api({ action: 'list' }).then(function (r) {
      if (r.status !== 'ok') { toast(errorOf(r)); return; }
      state.today = r.today; state.active = r.active; state.archived = r.archived;
      renderList();
      view('list');
    }, function () {});
  }

  function setTab(tab) {
    state.tab = tab;
    $('tab-active').setAttribute('aria-selected', String(tab === 'active'));
    $('tab-archived').setAttribute('aria-selected', String(tab === 'archived'));
    $('panel-active').hidden = tab !== 'active';
    $('panel-archived').hidden = tab !== 'archived';
  }
  $('tab-active').addEventListener('click', function () { setTab('active'); });
  $('tab-archived').addEventListener('click', function () { setTab('archived'); });

  function names(w) { return w.marie1_prenom + ' ' + w.marie1_nom + ' & ' + w.marie2_prenom + ' ' + w.marie2_nom; }

  function faces(w) {
    var box = el('div', 'faces');
    ROLES.forEach(function (r) {
      var prenom = w[r + '_prenom'] || '?';
      if (w.photos.indexOf(r) >= 0) {
        var img = el('img', 'face');
        img.src = photoUrl(w.id, r); img.alt = prenom;
        box.appendChild(img);
      } else {
        var s = el('span', 'face', prenom.charAt(0).toUpperCase());
        s.title = prenom;
        box.appendChild(s);
      }
    });
    return box;
  }
  function dateRow(list, key, value, when, whenCls) {
    var li = el('li');
    li.appendChild(el('span', 'k', key));
    var v = el('span', 'v', value);
    if (when) v.appendChild(el('span', 'when' + (whenCls ? ' ' + whenCls : ''), when));
    li.appendChild(v);
    list.appendChild(li);
  }
  function btn(text, cls, onClick) {
    var b = el('button', 'btn btn-small' + (cls ? ' ' + cls : ''), text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }
  function cardHead(w) {
    var head = el('div', 'card-head');
    head.appendChild(faces(w));
    var t = el('div');
    t.appendChild(el('h3', 'card-names', names(w)));
    t.appendChild(el('p', 'card-witnesses', 'Témoins : ' + w.temoin1_prenom + ' et ' + w.temoin2_prenom));
    head.appendChild(t);
    return head;
  }

  function activeCard(w) {
    var card = el('article', 'card');
    card.appendChild(cardHead(w));
    if (!w.marie1_genre || !w.marie2_genre || !w.temoin1_genre || !w.temoin2_genre) {
      card.appendChild(el('p', 'card-todo', 'Genre à préciser : ouvre la fiche pour que les textes du jeu soient bien accordés.'));
    }
    var dates = el('ul', 'card-dates');
    dateRow(dates, 'Mariage', fmt(w.wedding_date), relative(w.wedding_date));
    var n = daysBetween(today(), w.expires_at);
    var when = n < 0 ? 'échéance passée : archivage cette nuit' : n === 0 ? "dernier jour aujourd'hui" : relative(w.expires_at);
    dateRow(dates, 'Échéance', fmt(w.expires_at), when, n < 0 ? 'is-late' : n <= 7 ? 'is-soon' : '');
    card.appendChild(dates);
    var actions = el('div', 'card-actions');
    actions.appendChild(btn('+7 jours', '', function () { extend(w, { days: 7 }, this); }));
    actions.appendChild(btn('+30 jours', '', function () { extend(w, { days: 30 }, this); }));
    actions.appendChild(btn('Autre date', '', function () { pickExpiry(w); }));
    actions.appendChild(btn('Ouvrir', 'btn-primary grow', function () { openEditor(w); }));
    card.appendChild(actions);
    return card;
  }

  function archivedCard(w) {
    var card = el('article', 'card');
    card.appendChild(cardHead(w));
    var dates = el('ul', 'card-dates');
    dateRow(dates, 'Mariage', fmt(w.wedding_date));
    dateRow(dates, 'Archivé le', fmt(w.archived_on));
    dateRow(dates, 'Suppression définitive', fmt(w.delete_on), relative(w.delete_on));
    card.appendChild(dates);
    var actions = el('div', 'card-actions');
    actions.appendChild(btn('Restaurer', 'btn-primary', function () { restore(w); }));
    actions.appendChild(btn('Ouvrir', '', function () { openEditor(w); }));
    actions.appendChild(btn('Supprimer définitivement', 'btn-danger-soft grow', function () { removeForever(w); }));
    actions.lastChild.style.marginTop = '0';
    card.appendChild(actions);
    return card;
  }

  function renderList() {
    var la = $('list-active'), lr = $('list-archived');
    la.textContent = ''; lr.textContent = '';
    state.active.forEach(function (w) { la.appendChild(activeCard(w)); });
    state.archived.forEach(function (w) { lr.appendChild(archivedCard(w)); });
    $('count-active').textContent = '(' + state.active.length + ')';
    $('count-archived').textContent = '(' + state.archived.length + ')';
    $('empty-active').hidden = state.active.length > 0;
    $('empty-archived').hidden = state.archived.length > 0;
    setTab(state.tab);
  }

  /* ---------- Actions rapides ---------- */
  function extend(w, body, button) {
    if (button) button.disabled = true;
    return api(Object.assign({ action: 'extend', id: w.id }, body)).then(function (r) {
      if (button) button.disabled = false;
      if (r.status !== 'ok') { toast(errorOf(r)); return r; }
      toast('Échéance repoussée au ' + fmt(r.expires_at) + '.');
      return loadList().then(function () { return r; });
    }, function () {});
  }

  // Fenêtre « choisir une date » : action(date, force) → promesse de réponse serveur.
  function dateDialog(opts) {
    var dlg = $('dlg-date'), form = $('dlg-date-form'), input = form.elements.date;
    var force = false;
    $('dlg-date-title').textContent = opts.title;
    $('dlg-date-text').textContent = opts.text;
    $('dlg-date-ok').textContent = opts.ok;
    input.value = opts.value; input.min = today();
    show('dlg-date-msg', '');
    $('dlg-clash').hidden = true;
    form.onclick = function (e) {
      var plus = e.target.getAttribute && e.target.getAttribute('data-dplus');
      if (plus) input.value = addDays(today(), +plus);
    };
    form.onsubmit = function (e) {
      if (e.submitter && e.submitter.value === 'cancel') return;
      e.preventDefault();
      if (!input.value) return show('dlg-date-msg', 'Choisis une date.');
      if (input.value < today()) return show('dlg-date-msg', 'Cette date est déjà passée.');
      $('dlg-date-ok').disabled = true;
      opts.action(input.value, force).then(function (r) {
        $('dlg-date-ok').disabled = false;
        if (!r) return;
        if (r.status === 'ok') return dlg.close();
        if (r.status === 'clash') {
          var ul = $('dlg-clash-list'); ul.textContent = '';
          r.clashes.forEach(function (c) { ul.appendChild(el('li', '', c)); });
          $('dlg-clash').hidden = false;
          $('dlg-date-ok').textContent = 'Valider quand même';
          force = true;
          return;
        }
        show('dlg-date-msg', errorOf(r));
      }, function () { $('dlg-date-ok').disabled = false; dlg.close(); });
    };
    dlg.showModal();
  }

  function pickExpiry(w) {
    dateDialog({
      title: 'Choisir une échéance', ok: 'Valider',
      text: names(w) + ' : le dossier restera reconnu jusqu’au soir de cette date.',
      value: w.expires_at >= today() ? w.expires_at : addDays(today(), 7),
      action: function (date) {
        return api({ action: 'extend', id: w.id, expires_at: date }).then(function (r) {
          if (r.status === 'ok') { toast('Échéance fixée au ' + fmt(r.expires_at) + '.'); loadList(); }
          return r;
        });
      },
    });
  }

  function restore(w) {
    dateDialog({
      title: 'Restaurer ce mariage', ok: 'Restaurer',
      text: names(w) + ' sera de nouveau reconnu par les joueurs, jusqu’au soir de cette nouvelle échéance.',
      value: addDays(today(), 30),
      action: function (date, force) {
        return api({ action: 'restore', id: w.id, expires_at: date, force: force }).then(function (r) {
          if (r.status === 'ok') { toast('Mariage restauré : il est de nouveau reconnu.'); setTab('active'); loadList(); }
          return r;
        });
      },
    });
  }

  function confirmDialog(title, text, ok) {
    return new Promise(function (resolve) {
      var dlg = $('dlg-confirm');
      $('dlg-confirm-title').textContent = title;
      $('dlg-confirm-text').textContent = text;
      $('dlg-confirm-ok').textContent = ok;
      dlg.returnValue = '';
      dlg.onclose = function () { resolve(dlg.returnValue === 'ok'); };
      dlg.showModal();
    });
  }

  function archive(w) {
    return confirmDialog('Archiver ce mariage ?', names(w) + ' ne sera plus reconnu par l’écran « Retrouver le dossier », et ses photos ne seront plus montrées aux joueurs. Tu pourras le restaurer depuis les archives pendant un an.', 'Archiver')
      .then(function (ok) {
        if (!ok) return;
        return api({ action: 'archive', id: w.id }).then(function (r) {
          if (r.status !== 'ok') return toast(errorOf(r));
          toast('Mariage archivé.');
          return loadList();
        }, function () {});
      });
  }

  function removeForever(w) {
    var dlg = $('dlg-delete'), form = $('dlg-delete-form');
    $('dlg-delete-text').textContent = names(w);
    form.elements.confirm.value = '';
    show('dlg-delete-msg', '');
    form.onsubmit = function (e) {
      if (e.submitter && e.submitter.value === 'cancel') return;
      e.preventDefault();
      if (form.elements.confirm.value.trim().toLowerCase() !== 'supprimer') return show('dlg-delete-msg', 'Tape « supprimer » pour confirmer.');
      api({ action: 'delete', id: w.id, confirm: form.elements.confirm.value }).then(function (r) {
        if (r.status !== 'ok') return show('dlg-delete-msg', errorOf(r));
        dlg.close();
        toast('Mariage supprimé définitivement.');
        loadList();
      }, function () { dlg.close(); });
    };
    dlg.showModal();
  }

  /* ---------- Fiche (ajout / modification) ---------- */
  var form = $('edit-form');
  var force = false;
  var GENRES = ['marie1_genre', 'marie2_genre', 'temoin1_genre', 'temoin2_genre'];

  // « Marié 1 » / « Mariée 1 », « Témoin 1 » ; titre de section accordé au couple.
  function genreOf(role) { var c = form.querySelector('input[name="' + role + '_genre"]:checked'); return c ? c.value : ''; }
  function updateLabels() {
    document.querySelectorAll('.role-label').forEach(function (l) {
      var role = l.closest('.person').getAttribute('data-role');
      var f = genreOf(role) === 'f';
      l.textContent = (l.getAttribute('data-kind') === 'marie' ? (f ? 'Mariée ' : 'Marié ') : 'Témoin ') + l.getAttribute('data-num');
    });
    var both = genreOf('marie1') === 'f' && genreOf('marie2') === 'f';
    $('section-maries').textContent = both ? 'Les mariées' : 'Les mariés';
  }
  form.addEventListener('change', function (e) { if (/_genre$/.test(e.target.name)) updateLabels(); });

  function photoSlot(role) {
    var slot = document.querySelector('.person[data-role="' + role + '"] .photo-slot');
    var p = state.photos[role];
    slot.textContent = '';
    var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    file.addEventListener('change', function () { if (file.files[0]) loadPhoto(role, file.files[0]); });
    var b = el('button', 'photo-btn'); b.type = 'button';
    var prenom = form.elements[role + '_prenom'].value.trim();
    b.setAttribute('aria-label', (p.url ? 'Changer la photo' : 'Ajouter une photo') + (prenom ? ' de ' + prenom : ''));
    if (p.url) {
      b.classList.add('has-photo');
      var img = el('img'); img.src = p.url; img.alt = '';
      b.appendChild(img);
    } else {
      b.textContent = '+ Photo';
    }
    b.addEventListener('click', function () { file.click(); });
    slot.appendChild(b);
    slot.appendChild(file);
    if (p.url) {
      var change = el('button', 'photo-link', 'Changer'); change.type = 'button';
      change.addEventListener('click', function () { file.click(); });
      var remove = el('button', 'photo-link danger', 'Retirer'); remove.type = 'button';
      remove.addEventListener('click', function () { state.photos[role] = { change: null, url: '' }; photoSlot(role); });
      slot.appendChild(change); slot.appendChild(remove);
    }
  }

  // Recadrage carré centré, 144 px, JPEG : rien d'autre que les pixels ne sort du téléphone.
  function loadPhoto(role, file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var side = Math.min(img.naturalWidth, img.naturalHeight);
      var c = document.createElement('canvas');
      c.width = SIZE; c.height = SIZE;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SIZE, SIZE); // PNG transparents : fond blanc
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      var data = c.toDataURL('image/jpeg', 0.85);
      state.photos[role] = { change: data.split(',')[1], url: data };
      photoSlot(role);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      show('edit-msg', 'Cette photo n’a pas pu être ouverte. Essaie avec une photo en JPG ou PNG (sur ordinateur, les photos d’iPhone au format HEIC ne passent pas).');
    };
    img.src = url;
  }

  function openEditor(w) {
    state.editing = w || null;
    force = false;
    form.reset();
    show('edit-msg', '');
    $('clash').hidden = true;
    $('recalc').hidden = true;
    var archived = !!(w && w.archived_on);
    $('edit-title').textContent = w ? 'Modifier le dossier' : 'Nouveau mariage';
    $('edit-archived-note').hidden = !archived;
    $('expiry-block').hidden = archived;
    $('archive-now').hidden = !w || archived;
    ['marie1_prenom', 'marie1_nom', 'marie2_prenom', 'marie2_nom', 'temoin1_prenom', 'temoin2_prenom'].forEach(function (k) {
      form.elements[k].value = w ? w[k] : '';
    });
    GENRES.forEach(function (g) {
      form.querySelectorAll('input[name="' + g + '"]').forEach(function (i) { i.checked = !!w && w[g] === i.value; });
    });
    updateLabels();
    form.elements.wedding_date.value = w ? w.wedding_date : '';
    form.elements.expires_at.value = w ? w.expires_at : '';
    form.elements.expires_at.min = today();
    state.autoExpiry = !w; // nouveau mariage : l'échéance suit la date du mariage tant qu'on n'y touche pas
    state.prevDate = w ? w.wedding_date : '';
    ROLES.forEach(function (r) {
      state.photos[r] = { url: w && w.photos.indexOf(r) >= 0 ? photoUrl(w.id, r) : '' }; // pas de « change » = inchangée
      photoSlot(r);
    });
    view('edit');
  }

  $('add').addEventListener('click', function () { openEditor(null); });
  $('edit-back').addEventListener('click', function () { view('list'); });
  $('edit-cancel').addEventListener('click', function () { view('list'); });
  $('archive-now').addEventListener('click', function () { if (state.editing) archive(state.editing); });

  // Le prénom change → l'étiquette du bouton photo aussi.
  ROLES.forEach(function (r) {
    form.elements[r + '_prenom'].addEventListener('change', function () { photoSlot(r); });
  });

  // Date du mariage : nouvelle fiche → échéance recalculée d'office ; fiche existante → on propose.
  form.elements.wedding_date.addEventListener('change', function () {
    var d = form.elements.wedding_date.value;
    if (!d) return;
    var proposal = addDays(d, 30);
    if (state.autoExpiry) { form.elements.expires_at.value = proposal; return; }
    if (state.editing && !state.editing.archived_on && d !== state.prevDate && form.elements.expires_at.value !== proposal) {
      $('recalc-text').textContent = 'Mariage décalé ? Recalculer l’échéance au ' + fmt(proposal) + ' (30 jours après) ?';
      $('recalc').hidden = false;
    }
  });
  $('recalc-yes').addEventListener('click', function () {
    form.elements.expires_at.value = addDays(form.elements.wedding_date.value, 30);
    $('recalc').hidden = true;
  });
  $('recalc-no').addEventListener('click', function () { $('recalc').hidden = true; });
  form.elements.expires_at.addEventListener('change', function () { state.autoExpiry = false; });
  document.querySelectorAll('[data-plus]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = form.elements.expires_at.value;
      var base = cur && cur > today() ? cur : today();
      form.elements.expires_at.value = addDays(base, +b.getAttribute('data-plus'));
      state.autoExpiry = false;
    });
  });

  // Toute modification annule le « quand même » d'un doublon déjà signalé.
  form.addEventListener('input', function () { if (force) { force = false; $('clash').hidden = true; } });

  function submit() {
    var body = { action: 'save', force: force, photos: {} };
    if (state.editing) body.id = state.editing.id;
    ['marie1_prenom', 'marie1_nom', 'marie2_prenom', 'marie2_nom', 'temoin1_prenom', 'temoin2_prenom', 'wedding_date', 'expires_at'].forEach(function (k) {
      body[k] = form.elements[k].value.trim();
    });
    GENRES.forEach(function (g) { body[g] = genreOf(g.replace('_genre', '')); });
    if (state.editing && state.editing.archived_on) delete body.expires_at;
    ROLES.forEach(function (r) { if ('change' in state.photos[r]) body.photos[r] = state.photos[r].change; });
    if (!body.wedding_date) return show('edit-msg', 'Il manque la date du mariage.');

    $('save').disabled = true;
    show('edit-msg', '');
    api(body).then(function (r) {
      $('save').disabled = false;
      if (r.status === 'ok') {
        toast(state.editing ? 'Fiche enregistrée.' : 'Mariage ajouté : il est déjà reconnu par le jeu.');
        if (!state.editing) setTab('active');
        return loadList();
      }
      if (r.status === 'clash') {
        var ul = $('clash-list'); ul.textContent = '';
        r.clashes.forEach(function (c) { ul.appendChild(el('li', '', c)); });
        $('clash').hidden = false;
        $('clash').scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      show('edit-msg', errorOf(r));
      $('edit-msg').scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, function () { $('save').disabled = false; });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); force = false; submit(); });
  $('clash-force').addEventListener('click', function () { force = true; $('clash').hidden = true; submit(); });

  /* ---------- Démarrage : déjà connecté ? ---------- */
  api({ action: 'me' }).then(function (r) {
    if (r.status === 'ok') loadList();
    else showLogin('');
  }, function () {});
})();
