/* Boîte mail de l'énigme : liste, recherche, lecture d'une conversation, pièces jointes. */
(function () {
  'use strict';

  var DATA = window.MAIL_DATA;
  var PEOPLE = DATA.people;
  var ME = PEOPLE.me;

  var screenList = document.getElementById('screen-list');
  var screenThread = document.getElementById('screen-thread');
  var list = document.getElementById('mail-list');
  var thread = document.getElementById('thread');
  var search = document.getElementById('search');
  var searchClear = document.getElementById('search-clear');

  // Création d'éléments : le texte passe toujours par textContent, jamais innerHTML.
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(paths, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'ico ' + (cls || 'ico-sm'));
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = paths; // chemins d'icônes en dur dans ce fichier, jamais du contenu
    return s;
  }
  var ICON_CLIP = '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>';
  var ICON_STAR = '<path d="M11.5 2.3a.5.5 0 0 1 .9 0l2.3 4.7a2 2 0 0 0 1.6 1.1l5.2.8a.5.5 0 0 1 .3.9l-3.8 3.7a2 2 0 0 0-.6 1.8l.9 5.2a.5.5 0 0 1-.8.6l-4.6-2.5a2 2 0 0 0-1.9 0L6.4 21a.5.5 0 0 1-.8-.6l.9-5.2a2 2 0 0 0-.6-1.8L2.1 9.8a.5.5 0 0 1 .3-.9l5.2-.8a2 2 0 0 0 1.6-1.1z"/>';
  var ICON_DOWN = '<path d="m6 9 6 6 6-6"/>';

  /* ---------- Personnes ---------- */
  function person(id) { return PEOPLE[id] || { name: id, email: '' }; }
  // Prénom seul pour une personne ; nom complet pour une entreprise (celles qui ont des initials).
  function shortName(id) {
    if (id === 'me') return 'moi';
    var p = person(id);
    return p.initials ? p.name : p.name.split(' ')[0];
  }
  function initialsOf(p) {
    if (p.initials) return p.initials;
    var parts = p.name.split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function avatar(id, cls) {
    var p = person(id);
    if (p.avatar) {
      var img = el('img', 'avatar ' + (cls || ''));
      img.src = p.avatar; img.alt = ''; img.loading = 'lazy';
      return img;
    }
    var span = el('span', 'avatar initials ' + (cls || ''), initialsOf(p));
    span.style.background = p.color || '#D5DAE1';
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  /* ---------- Dates ---------- */
  var MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  // « Aujourd'hui » = le jour où l'on ouvre la page (ou ?jour=AAAA-MM-JJ pour tester).
  var TODAY = (function () {
    var q = /[?&]jour=(\d{4})-(\d{2})-(\d{2})/.exec(location.search);
    if (q) return new Date(+q[1], +q[2] - 1, +q[3]);
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  })();

  // 'J-2 21:47' → avant-hier à 21h47 (calcul en calendrier local, sans souci d'heure d'été).
  function parts(d) {
    var m = /^J([+-]\d+)?\s+(\d{1,2}):(\d{2})$/.exec(String(d).trim());
    var off = m && m[1] ? +m[1] : 0;
    var day = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + off);
    var h = m ? +m[2] : 0, mi = m ? +m[3] : 0;
    return {
      off: off, d: day.getDate(), mo: day.getMonth() + 1, wd: day.getDay(), h: h, mi: mi,
      ts: new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, mi).getTime(),
    };
  }
  function hm(p) { return String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0'); }
  function listDate(d) {
    var p = parts(d);
    return p.off === 0 ? hm(p) : p.d + ' ' + MONTHS[p.mo - 1];
  }
  function fullDate(d) {
    var p = parts(d);
    return (p.off === 0 ? "Aujourd'hui" : DAYS[p.wd] + ' ' + p.d + ' ' + MONTHS[p.mo - 1]) + ', ' + hm(p);
  }

  /* ---------- Lu / non lu (mémorisé sur ce téléphone) ---------- */
  var READ_KEY = 'mail-g5yh-read';
  var readIds = {};
  try {
    if (/[?&]reset\b/.test(location.search)) localStorage.removeItem(READ_KEY);
    readIds = JSON.parse(localStorage.getItem(READ_KEY) || '{}') || {};
  } catch (e) { readIds = {}; }
  function isUnread(t) { return !!t.keepUnread || (!!t.unread && !readIds[t.id]); }
  function markRead(t) {
    if (!t.unread || readIds[t.id]) return;
    readIds[t.id] = 1;
    try { localStorage.setItem(READ_KEY, JSON.stringify(readIds)); } catch (e) {}
  }

  /* ---------- Recherche (insensible à la casse et aux accents) ---------- */
  // Normalise caractère par caractère pour garder la correspondance avec le texte d'origine
  // (nécessaire pour surligner « temoin » dans « Témoin »).
  function normMap(text) {
    var out = '', map = [];
    for (var i = 0; i < text.length; i++) {
      var n = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      for (var k = 0; k < n.length; k++) { out += n[k]; map.push(i); }
    }
    return { s: out, map: map };
  }
  function norm(text) { return normMap(text).s; }
  function termsOf(q) {
    return norm(q).split(/[\s,;]+/).filter(Boolean);
  }

  // Texte avec les termes recherchés surlignés.
  function highlight(text, terms) {
    var frag = document.createDocumentFragment();
    if (!terms.length) { frag.appendChild(document.createTextNode(text)); return frag; }
    var nm = normMap(text), ranges = [];
    terms.forEach(function (t) {
      var from = 0, i;
      while ((i = nm.s.indexOf(t, from)) !== -1) {
        ranges.push([nm.map[i], nm.map[i + t.length - 1] + 1]);
        from = i + t.length;
      }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var pos = 0;
    ranges.forEach(function (r) {
      if (r[0] < pos) r[0] = pos;
      if (r[1] <= r[0]) return;
      if (r[0] > pos) frag.appendChild(document.createTextNode(text.slice(pos, r[0])));
      frag.appendChild(el('mark', null, text.slice(r[0], r[1])));
      pos = r[1];
    });
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    return frag;
  }

  function oneLine(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // Tout ce qui est cherchable dans une conversation.
  function haystack(t) {
    var bits = [t.subject];
    t.messages.forEach(function (m) {
      [m.from].concat(m.to || ['me']).forEach(function (id) {
        var p = person(id);
        bits.push(p.name, p.email);
        if (id === 'me') bits.push('moi');
      });
      bits.push(m.body);
      (m.attachments || []).forEach(function (a) { bits.push(a.name, 'pièce jointe'); });
    });
    return norm(bits.join(' \n '));
  }

  /* ---------- Préparation des conversations ---------- */
  var threads = DATA.threads.map(function (t) {
    var last = t.messages[t.messages.length - 1];
    return {
      id: t.id, subject: t.subject, unread: t.unread, keepUnread: t.keepUnread, starred: t.starred, promo: t.promo, expanded: t.expanded,
      messages: t.messages, last: last,
      hasAttachment: t.messages.some(function (m) { return m.attachments && m.attachments.length; }),
      hay: haystack(t),
    };
  });
  threads.sort(function (a, b) { return parts(b.last.date).ts - parts(a.last.date).ts; });
  var byId = {};
  threads.forEach(function (t) { byId[t.id] = t; });

  // « Chloé, moi  3 » : participants dans l'ordre d'apparition.
  function senders(t) {
    var seen = [], ids = [];
    t.messages.forEach(function (m) { if (seen.indexOf(m.from) === -1) { seen.push(m.from); ids.push(m.from); } });
    if (ids.length === 1) return ids[0] === 'me' ? 'moi' : person(ids[0]).name;
    return ids.map(shortName).join(', ');
  }
  function mainSender(t) {
    for (var i = t.messages.length - 1; i >= 0; i--) if (t.messages[i].from !== 'me') return t.messages[i].from;
    var to = t.messages[0].to; return to && to[0] ? to[0] : 'me';
  }

  // Aperçu sous l'objet : autour du premier terme trouvé, sinon début du dernier e-mail.
  function snippet(t, terms) {
    if (terms.length) {
      for (var i = t.messages.length - 1; i >= 0; i--) {
        var body = oneLine(t.messages[i].body), nb = norm(body);
        for (var k = 0; k < terms.length; k++) {
          var at = nb.indexOf(terms[k]);
          if (at !== -1) {
            var start = Math.max(0, at - 28);
            var cut = body.lastIndexOf(' ', start);
            start = start > 0 && cut > 0 ? cut + 1 : start;
            return (start > 0 ? '… ' : '') + body.slice(start);
          }
        }
      }
    }
    return oneLine(t.last.body);
  }

  /* ---------- Liste ---------- */
  var query = '';

  function renderList() {
    var terms = termsOf(query);
    var shown = threads.filter(function (t) {
      return terms.every(function (term) { return t.hay.indexOf(term) !== -1; });
    });

    var folder = document.getElementById('folder');
    if (terms.length) {
      folder.textContent = shown.length
        ? shown.length + ' résultat' + (shown.length > 1 ? 's' : '')
        : '';
    } else {
      var unread = threads.filter(isUnread).length;
      folder.textContent = DATA.folder + (unread ? ' · ' + unread + ' non lu' + (unread > 1 ? 's' : '') : '');
    }

    list.textContent = '';
    if (!shown.length) {
      var empty = el('div', 'empty');
      empty.appendChild(el('p', 'empty-title', 'Aucun e-mail ne correspond à « ' + query.trim() + ' »'));
      empty.appendChild(el('p', 'empty-sub', 'On a même regardé sous le tapis. Essayez un autre mot : un prénom, un objet…'));
      list.appendChild(empty);
      return;
    }

    var ul = el('ul', 'mail-items');
    shown.forEach(function (t) {
      var li = el('li');
      var a = el('a', 'mail-item' + (isUnread(t) ? ' unread' : ''));
      a.href = '#' + t.id;

      a.appendChild(avatar(mainSender(t), 'avatar-lg'));

      var body = el('div', 'mail-body');
      var line1 = el('div', 'mail-line');
      var from = el('span', 'mail-from');
      from.appendChild(highlight(senders(t), terms));
      line1.appendChild(from);
      if (t.messages.length > 1) line1.appendChild(el('span', 'mail-count', String(t.messages.length)));
      line1.appendChild(el('span', 'mail-date', listDate(t.last.date)));
      body.appendChild(line1);

      var line2 = el('div', 'mail-line');
      var subj = el('span', 'mail-subject');
      subj.appendChild(highlight(t.subject, terms));
      line2.appendChild(subj);
      body.appendChild(line2);

      var line3 = el('div', 'mail-line');
      var prev = el('span', 'mail-snippet');
      prev.appendChild(highlight(snippet(t, terms), terms));
      line3.appendChild(prev);
      var star = svg(ICON_STAR, 'ico-md star' + (t.starred ? ' on' : ''));
      line3.appendChild(star);
      body.appendChild(line3);

      if (t.hasAttachment || t.promo) {
        var chips = el('div', 'mail-chips');
        if (t.promo) chips.appendChild(el('span', 'chip chip-promo', 'Promo'));
        t.messages.forEach(function (m) {
          (m.attachments || []).forEach(function (att) {
            var c = el('span', 'chip');
            c.appendChild(svg(ICON_CLIP, 'ico-xs'));
            var label = el('span');
            label.appendChild(highlight(att.name, terms));
            c.appendChild(label);
            chips.appendChild(c);
          });
        });
        body.appendChild(chips);
      }

      a.appendChild(body);
      li.appendChild(a);
      ul.appendChild(li);
    });
    list.appendChild(ul);
  }

  /* ---------- Conversation ---------- */
  function recipients(m) {
    var to = m.to || ['me'];
    return 'à ' + to.map(shortName).join(', ');
  }

  function isImage(src) { return /\.(jpe?g|png|webp|gif|svg)$/i.test(src); }

  function buildMessage(m, expanded, terms) {
    var art = el('article', 'msg' + (expanded ? ' open' : ''));

    var head = el('button', 'msg-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    head.appendChild(avatar(m.from, 'avatar-md'));

    var meta = el('span', 'msg-meta');
    var l1 = el('span', 'msg-line');
    var p = person(m.from);
    l1.appendChild(el('span', 'msg-from', m.from === 'me' ? 'Moi' : p.name));
    l1.appendChild(el('span', 'msg-date', fullDate(m.date)));
    meta.appendChild(l1);
    var l2 = el('span', 'msg-line');
    var sub = el('span', 'msg-sub msg-to');
    sub.appendChild(document.createTextNode(recipients(m)));
    sub.appendChild(svg(ICON_DOWN, 'ico-xs'));
    l2.appendChild(sub);
    var prev = el('span', 'msg-sub msg-preview');
    prev.appendChild(highlight(oneLine(m.body), terms));
    l2.appendChild(prev);
    meta.appendChild(l2);
    head.appendChild(meta);
    art.appendChild(head);

    var details = el('div', 'msg-details');
    details.appendChild(el('span', null, 'De : ' + p.name + ' <' + p.email + '>'));
    details.appendChild(el('span', null, 'À : ' + (m.to || ['me']).map(function (id) { var q = person(id); return q.name + ' <' + q.email + '>'; }).join(', ')));
    details.appendChild(el('span', null, 'Date : ' + fullDate(m.date)));
    details.hidden = true;
    art.appendChild(details);
    sub.addEventListener('click', function (e) {
      if (!art.classList.contains('open')) return;
      e.stopPropagation();
      details.hidden = !details.hidden;
    });

    var content = el('div', 'msg-content');
    String(m.body).split(/\n\s*\n/).forEach(function (para) {
      var pEl = el('p');
      pEl.appendChild(highlight(para.trim(), terms));
      content.appendChild(pEl);
    });

    if (m.attachments && m.attachments.length) {
      var atts = el('div', 'atts');
      atts.appendChild(el('p', 'atts-title', m.attachments.length + ' pièce' + (m.attachments.length > 1 ? 's' : '') + ' jointe' + (m.attachments.length > 1 ? 's' : '')));
      m.attachments.forEach(function (att) {
        var card = el('button', 'att');
        card.type = 'button';
        card.setAttribute('aria-label', 'Ouvrir la pièce jointe ' + att.name);
        if (att.youtube) {
          card.classList.add('att-video');
          card.setAttribute('aria-label', 'Lire la vidéo ' + att.name);
          var poster = el('span', 'att-poster');
          var pimg = el('img', 'att-thumb');
          pimg.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(att.youtube) + '/hqdefault.jpg';
          pimg.alt = ''; pimg.loading = 'lazy';
          poster.appendChild(pimg);
          var playBtn = el('span', 'att-play');
          playBtn.appendChild(svg('<path d="M7 4v16l13-8z"/>', 'ico-lg ico-fill'));
          poster.appendChild(playBtn);
          card.appendChild(poster);
        } else if (isImage(att.src)) {
          var thumb = el('img', 'att-thumb');
          thumb.src = att.src; thumb.alt = ''; thumb.loading = 'lazy';
          card.appendChild(thumb);
        }
        var cap = el('span', 'att-cap');
        cap.appendChild(svg(ICON_CLIP, 'ico-xs'));
        var nm = el('span', 'att-name');
        nm.appendChild(highlight(att.name, terms));
        cap.appendChild(nm);
        if (att.size) cap.appendChild(el('span', 'att-size', att.size));
        card.appendChild(cap);
        card.addEventListener('click', function () {
          if (att.youtube) openVideo(att); else openViewer(att);
        });
        atts.appendChild(card);
      });
      content.appendChild(atts);
    }
    art.appendChild(content);

    head.addEventListener('click', function () {
      var open = art.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) details.hidden = true;
    });
    return art;
  }

  function renderThread(t) {
    var terms = termsOf(query);
    thread.textContent = '';
    var h = el('div', 'thread-head');
    var title = el('h1', 'thread-subject');
    title.appendChild(highlight(t.subject, terms));
    h.appendChild(title);
    var tags = el('div', 'thread-tags');
    tags.appendChild(el('span', 'chip', DATA.folder));
    if (t.starred) tags.appendChild(svg(ICON_STAR, 'ico-md star on'));
    h.appendChild(tags);
    thread.appendChild(h);

    t.messages.forEach(function (m, i) {
      var isLast = i === t.messages.length - 1;
      // Ouverts : le dernier e-mail, ceux avec une pièce jointe, et ceux qui contiennent la recherche.
      var matches = terms.length && terms.some(function (term) { return norm(m.body).indexOf(term) !== -1; });
      var hasAtt = !!(m.attachments && m.attachments.length);
      thread.appendChild(buildMessage(m, t.expanded || isLast || hasAtt || matches || t.messages.length <= 1, terms));
    });
  }

  /* ---------- Navigation (#id-de-conversation) ---------- */
  var openedFromList = false;

  function route() {
    var id = decodeURIComponent(location.hash.slice(1));
    var t = byId[id];
    closeViewer(true);
    closeVideo();
    if (t) {
      markRead(t);
      renderThread(t);
      screenList.hidden = true;
      screenThread.hidden = false;
      thread.scrollTop = 0;
      document.title = t.subject;
    } else {
      renderList();
      screenThread.hidden = true;
      screenList.hidden = false;
      document.title = DATA.folder;
    }
  }

  list.addEventListener('click', function (e) {
    if (e.target.closest('.mail-item')) openedFromList = true;
  });
  document.getElementById('back').addEventListener('click', function () {
    if (openedFromList) { openedFromList = false; history.back(); }
    else location.hash = '';
  });
  window.addEventListener('hashchange', route);

  /* ---------- Recherche : filtrage en direct ---------- */
  function onSearch() {
    query = search.value;
    searchClear.hidden = !query;
    renderList();
    list.scrollTop = 0;
  }
  search.addEventListener('input', onSearch);
  document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    search.blur(); // ferme le clavier du téléphone
  });
  searchClear.addEventListener('click', function () {
    search.value = '';
    onSearch();
    search.focus();
  });
  search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && search.value) { search.value = ''; onSearch(); }
  });

  /* ---------- Visionneuse de pièce jointe ---------- */
  var viewer = document.getElementById('viewer');
  var viewerImg = document.getElementById('viewer-img');
  var lastFocus = null;

  function openViewer(att) {
    lastFocus = document.activeElement;
    viewerImg.src = att.src;
    viewerImg.alt = att.name;
    viewerImg.classList.remove('zoomed');
    document.getElementById('viewer-name').textContent = att.name;
    var dl = document.getElementById('viewer-download');
    dl.href = att.src;
    dl.setAttribute('download', att.name);
    viewer.hidden = false;
    document.getElementById('viewer-close').focus();
  }
  function closeViewer(silent) {
    if (viewer.hidden) return;
    viewer.hidden = true;
    if (!silent && lastFocus) lastFocus.focus();
  }
  document.getElementById('viewer-close').addEventListener('click', function () { closeViewer(); });
  // Toucher l'image = zoom (taille réelle, on se déplace en faisant glisser).
  viewerImg.addEventListener('click', function () { viewerImg.classList.toggle('zoomed'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeViewer(); });

  /* ---------- Vidéo YouTube : lue dans la page, sans son, en plein écran ---------- */
  var video = document.getElementById('video');
  var videoFrame = document.getElementById('video-frame');

  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  // iPhone : pas de plein écran sur un bloc de page, seulement sur la vidéo elle-même.
  // Dans ce cas, playsinline=0 laisse iOS passer la vidéo en plein écran dès la lecture.
  var canFullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  function openVideo(att) {
    lastFocus = document.activeElement;
    video.hidden = false;

    // Le plein écran doit être demandé tout de suite, pendant le clic (règle des navigateurs).
    if (canFullscreen) {
      var req = video.requestFullscreen || video.webkitRequestFullscreen;
      var p = req.call(video);
      if (p && p.then) {
        p.then(function () {
          // Android : bascule en paysage si possible (ignoré ailleurs).
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
        }).catch(function () {});
      }
    }

    var params = 'autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=' + (canFullscreen ? 1 : 0);
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(att.youtube) + '?' + params;
    frame.title = att.name;
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    // YouTube refuse de lire une vidéo intégrée sans en-tête Referer : la page est en
    // « no-referrer », on autorise donc l'envoi du seul nom de domaine pour cette vidéo.
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    videoFrame.textContent = '';
    videoFrame.appendChild(frame);
    document.getElementById('video-close').focus();
  }

  function closeVideo() {
    if (video.hidden) return;
    video.hidden = true;
    videoFrame.textContent = ''; // retire le lecteur : la vidéo s'arrête
    if (fsElement()) {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { var p = exit.call(document); if (p && p.catch) p.catch(function () {}); }
    }
    if (screen.orientation && screen.orientation.unlock) { try { screen.orientation.unlock(); } catch (e) {} }
    if (lastFocus) lastFocus.focus();
  }

  document.getElementById('video-close').addEventListener('click', closeVideo);
  // Sortie du plein écran (bouton retour, geste, Échap) = on referme la vidéo.
  function onFsChange() { if (!fsElement()) closeVideo(); }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeVideo(); });

  /* ---------- Boutons décoratifs (Répondre, Supprimer…) ---------- */
  var toast = document.getElementById('toast');
  var toastTimer = null;
  document.querySelectorAll('[data-readonly]').forEach(function (b) {
    b.addEventListener('click', function () {
      toast.textContent = 'Ici on enquête, on ne touche à rien 🕵️';
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
    });
  });

  /* ---------- Démarrage ---------- */
  var meAvatar = document.getElementById('me-avatar');
  if (ME.avatar) meAvatar.src = ME.avatar; else meAvatar.hidden = true;
  meAvatar.title = ME.name + ' · ' + ME.email;
  route();
})();
