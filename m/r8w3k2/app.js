/* Messagerie de l'énigme : liste des conversations, fil, lecteur vocal, transcription. */
(function () {
  'use strict';

  var DATA = window.MESSAGES_DATA;
  var screenList = document.getElementById('screen-list');
  var screenConv = document.getElementById('screen-conv');
  var list = document.getElementById('conv-list');
  var thread = document.getElementById('thread');

  // Petit utilitaire de création d'éléments (le texte passe par textContent, jamais innerHTML).
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Icônes Lucide (play, pause), en version pleine.
  var ICON_PLAY  = '<svg class="ico ico-sm ico-fill i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3l14 9-14 9z"/></svg>';
  var ICON_PAUSE = '<svg class="ico ico-sm ico-fill i-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>';

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  // Onde sonore « crédible » et stable : pseudo-aléatoire déterministe à partir du chemin du fichier.
  function waveHeights(seedStr, count) {
    var h = 2166136261;
    for (var i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    function rand() { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }
    var out = [], prev = 0.5;
    for (var j = 0; j < count; j++) {
      var v = 0.6 * prev + 0.4 * rand();
      var edge = Math.min(1, (j + 1) / 4, (count - j) / 4); // attaque et fin plus douces
      out.push(Math.max(0.15, v * edge * (0.7 + 0.6 * rand())));
      prev = v;
    }
    return out;
  }

  /* ---------- Lecteur vocal (un seul vocal joue à la fois) ---------- */
  var current = null;

  // Le vocal + son bouton « Transcrire » placé SOUS la bulle.
  function buildVoice(msg, stack) {
    var bubble = el('div', 'bubble voice');
    stack.appendChild(bubble);
    var audio = new Audio();
    audio.preload = 'metadata';
    audio.src = msg.audio;
    var total = msg.duration || 0;

    var main = el('div', 'voice-main');
    var play = el('button', 'play');
    play.type = 'button';
    play.setAttribute('aria-label', 'Écouter le message vocal');
    play.innerHTML = ICON_PLAY + ICON_PAUSE;

    var wave = el('div', 'wave');
    wave.setAttribute('aria-hidden', 'true');
    var bars = waveHeights(msg.audio, 30).map(function (v) {
      var s = el('span');
      s.style.height = Math.round(v * 100) + '%';
      wave.appendChild(s);
      return s;
    });

    main.appendChild(play);
    main.appendChild(wave);

    var foot = el('div', 'voice-foot');
    var dur = el('span', 'dur', fmt(total));
    foot.appendChild(dur);

    foot.appendChild(el('span', 'time', msg.time));

    bubble.appendChild(main);
    bubble.appendChild(foot);

    if (msg.transcript) {
      var transcribe = el('button', 'transcribe-btn');
      transcribe.type = 'button';
      transcribe.textContent = 'Transcrire';
      stack.appendChild(transcribe);
      transcribe.addEventListener('click', function () { runTranscription(msg, stack, transcribe); });
    }

    function paint() {
      var d = audio.duration && isFinite(audio.duration) ? audio.duration : total;
      var p = d ? audio.currentTime / d : 0;
      var lit = Math.round(p * bars.length);
      bars.forEach(function (b, i) { b.classList.toggle('on', i < lit); });
      dur.textContent = audio.currentTime > 0 ? fmt(audio.currentTime) : fmt(d);
    }

    audio.addEventListener('loadedmetadata', function () {
      if (isFinite(audio.duration)) total = audio.duration;
      paint();
    });
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('play', function () { bubble.classList.add('playing'); play.setAttribute('aria-label', 'Mettre en pause'); });
    audio.addEventListener('pause', function () { bubble.classList.remove('playing'); play.setAttribute('aria-label', 'Écouter le message vocal'); });
    audio.addEventListener('ended', function () { audio.currentTime = 0; paint(); });

    play.addEventListener('click', function () {
      if (audio.paused) {
        if (current && current !== audio) current.pause();
        current = audio;
        audio.play().catch(function () {});
      } else {
        audio.pause();
      }
    });

    // Toucher l'onde = se déplacer dans le vocal.
    wave.addEventListener('click', function (e) {
      var r = wave.getBoundingClientRect();
      var d = isFinite(audio.duration) ? audio.duration : total;
      if (!d) return;
      audio.currentTime = Math.min(d, Math.max(0, (e.clientX - r.left) / r.width * d));
      paint();
    });
  }

  /* ---------- Transcription : petit chargement, puis le texte s'écrit ---------- */
  function runTranscription(msg, stack, btn) {
    var loading = el('div', 'transcribe-loading');
    loading.appendChild(el('span', 'spinner'));
    loading.appendChild(document.createTextNode('Transcription…'));
    btn.replaceWith(loading);
    reveal(stack);

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () {
      var box = el('div', 'transcript');
      var text = el('span', 'caret');
      box.appendChild(text);
      loading.replaceWith(box);

      var full = msg.transcript;
      var bubble = stack;
      if (reduced) { text.textContent = full; text.classList.remove('caret'); reveal(bubble); return; }

      // Vitesse adaptée : ~1,5 s max quelle que soit la longueur.
      var step = Math.max(1, Math.ceil(full.length / 75));
      var i = 0;
      (function tick() {
        i = Math.min(full.length, i + step);
        text.textContent = full.slice(0, i);
        reveal(bubble);
        if (i < full.length) setTimeout(tick, 20);
        else text.classList.remove('caret');
      })();
    }, reduced ? 500 : 1200 + Math.random() * 600);
  }

  // Garde la bulle visible pendant qu'elle grandit.
  function reveal(node) {
    var t = thread.getBoundingClientRect();
    var r = node.getBoundingClientRect();
    if (r.bottom > t.bottom - 8) thread.scrollTop += r.bottom - t.bottom + 12;
  }

  /* ---------- Avatars : photo, ou initiales sur pastille colorée ---------- */
  function makeAvatar(person, cls) {
    person = person || {};
    if (person.avatar) {
      var img = el('img', cls);
      img.src = person.avatar;
      img.alt = person.name || '';
      img.decoding = 'async';
      return img;
    }
    var d = el('div', cls + ' initials', person.initials || (person.name || '?').charAt(0));
    d.style.background = person.color || '#CFD4DB';
    d.setAttribute('aria-label', person.name || '');
    return d;
  }

  // Avatar de groupe : deux membres qui se chevauchent (comme Messenger), sinon l'emoji du groupe.
  function makeGroupAvatar(conv, cls) {
    if (!conv.members) return el('div', cls + ' emoji-avatar', conv.icon);
    var g = el('div', cls + ' group-avatar');
    g.setAttribute('aria-hidden', 'true');
    conv.members.slice(0, 2).forEach(function (id) { g.appendChild(makeAvatar(DATA.people[id], 'ga-item')); });
    return g;
  }

  // Avatar d'une conversation (liste ou en-tête), avec le point vert « en ligne » si besoin.
  function convAvatar(conv, cls) {
    if (!conv.with) return makeGroupAvatar(conv, cls);
    var person = DATA.people[conv.with] || {};
    var wrap = el('div', 'av-wrap');
    var av = makeAvatar(person, cls);
    if (av.tagName === 'IMG') av.alt = ''; else av.removeAttribute('aria-label');
    wrap.appendChild(av);
    if (person.online) wrap.appendChild(el('span', 'online-dot'));
    return wrap;
  }

  var ICON_SEEN = '<svg class="ico ico-xs seen-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>';

  // Tout ce qui n'a pas d'expéditeur est un repère (date ou ligne « non lus »), pas un message.
  function isSep(m) { return m && !m.from; }

  // Nombre de messages reçus après la ligne « non lus » d'une conversation.
  function countAfterMarker(conv) {
    var k = -1;
    conv.messages.forEach(function (m, i) { if (m.unreadMarker) k = i; });
    if (k < 0) return 0;
    return conv.messages.slice(k + 1).filter(function (m) { return m.from; }).length;
  }

  // La pastille de non-lus se déduit de la ligne « non lus » si elle n'est pas fixée à la main.
  DATA.conversations.forEach(function (c) {
    if (c.unread === undefined) c.unread = countAfterMarker(c);
  });

  function minutes(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }

  function lastOf(conv) {
    for (var i = conv.messages.length - 1; i >= 0; i--) if (!isSep(conv.messages[i])) return conv.messages[i];
  }

  // Dans la liste : l'heure si le dernier message est d'aujourd'hui, sinon « Hier », « Lundi », « 14 oct. »...
  function listLabel(conv) {
    var day = null;
    for (var i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].day && !conv.messages[i].from) { day = conv.messages[i].day; break; }
    }
    return !day || day === "Aujourd'hui" ? lastOf(conv).time : day;
  }

  function previewText(conv) {
    var m = lastOf(conv);
    var body = m.audio ? '🎤 Message vocal' : (m.emoji || m.text);
    if (m.from === 'me') return 'Vous : ' + body;
    if (!conv.with) return ((DATA.people[m.from] || {}).name || '') + ' : ' + body;
    return body;
  }

  /* ---------- Écran liste ---------- */
  function renderList() {
    var card = el('ul', 'conv-card');
    list.appendChild(card);
    DATA.conversations.forEach(function (conv) {
      var li = el('li');
      var item = el('a', 'conv-item' + (conv.unread ? ' unread' : ''));
      item.href = '#' + conv.id;

      item.appendChild(convAvatar(conv, 'conv-avatar'));

      var body = el('div', 'conv-body');
      var top = el('div', 'conv-line');
      top.appendChild(el('span', 'conv-name', conv.title));
      top.appendChild(el('span', 'conv-time', listLabel(conv)));
      var bottom = el('div', 'conv-line');
      bottom.appendChild(el('span', 'conv-preview', previewText(conv)));
      // Dernier message envoyé par moi et lu : double coche bleue à droite, sous l'heure.
      if (lastOf(conv).from === 'me') {
        var check = el('span', 'conv-seen');
        check.innerHTML = ICON_SEEN;
        check.setAttribute('aria-label', 'Lu');
        bottom.appendChild(check);
      }
      if (conv.unread) {
        var badge = el('span', 'badge', String(conv.unread));
        badge.setAttribute('aria-label', conv.unread + ' message' + (conv.unread > 1 ? 's' : '') + ' non lu' + (conv.unread > 1 ? 's' : ''));
        bottom.appendChild(badge);
      }
      body.appendChild(top);
      body.appendChild(bottom);
      item.appendChild(body);
      li.appendChild(item);
      card.appendChild(li);
    });
  }

  // Pastille sur l'onglet « Messages » = nombre de conversations non lues.
  function updateTabBadge() {
    var unreadConvs = DATA.conversations.filter(function (c) { return c.unread; }).length;
    var tabBadge = document.getElementById('tab-badge');
    tabBadge.textContent = unreadConvs;
    tabBadge.hidden = !unreadConvs;
  }

  /* ---------- Onglets Appels, Contacts, Réglages ---------- */
  var PHONE_PATH = 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z';
  // Icônes Lucide : phone-incoming / phone-outgoing / phone-missed
  var CALL_ARROWS = {
    in: '<path d="M16 2v6h6"/><path d="m22 2-6 6"/>',
    out: '<path d="m16 8 6-6"/><path d="M22 8V2h-6"/>',
    missed: '<path d="m16 2 6 6"/><path d="m22 2-6 6"/>',
  };
  var CALL_LABEL = { in: 'Appel entrant', out: 'Appel sortant', missed: 'Appel manqué' };
  var CHEVRON = '<svg class="ico ico-sm chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

  function convWith(personId) {
    return DATA.conversations.filter(function (c) { return c.with === personId; })[0];
  }

  // Une ligne de carte : lien vers la conversation si elle existe, sinon simple bouton.
  function cardRow(personId, avatarCls) {
    var conv = convWith(personId);
    var item;
    if (conv) { item = el('a', 'conv-item'); item.href = '#' + conv.id; }
    else { item = el('button', 'conv-item'); item.type = 'button'; }
    var av = makeAvatar(DATA.people[personId], 'conv-avatar ' + avatarCls);
    if (av.tagName === 'IMG') av.alt = ''; else av.removeAttribute('aria-label');
    item.appendChild(av);
    return item;
  }

  function renderCalls() {
    var card = el('ul', 'conv-card is-compact');
    DATA.calls.forEach(function (call) {
      var li = el('li');
      var item = cardRow(call.who, 'is-sm');
      var body = el('div', 'conv-body');
      var name = (DATA.people[call.who] || {}).name + (call.count > 1 ? ' (' + call.count + ')' : '');
      body.appendChild(el('span', 'conv-name' + (call.type === 'missed' ? ' is-missed' : ''), name));
      var sub = el('span', 'conv-preview call-sub');
      sub.innerHTML = '<svg class="ico ico-xs" viewBox="0 0 24 24" aria-hidden="true">' + CALL_ARROWS[call.type] + '<path d="' + PHONE_PATH + '"/></svg>';
      sub.appendChild(document.createTextNode(CALL_LABEL[call.type] + (call.length ? ' · ' + call.length : '')));
      body.appendChild(sub);
      item.appendChild(body);
      item.appendChild(el('span', 'conv-time', call.day === "Aujourd'hui" ? call.time : call.day));
      li.appendChild(item);
      card.appendChild(li);
    });
    list.appendChild(card);
  }

  function renderContacts() {
    var ids = Object.keys(DATA.people).filter(function (id) { return id !== 'me'; });
    ids.sort(function (a, b) { return DATA.people[a].name.localeCompare(DATA.people[b].name, 'fr'); });
    var letter = null, card = null;
    ids.forEach(function (id) {
      var first = DATA.people[id].name.normalize('NFD').charAt(0).toUpperCase();
      if (first !== letter) {
        letter = first;
        list.appendChild(el('div', 'section-label', letter));
        card = el('ul', 'conv-card is-compact');
        list.appendChild(card);
      }
      var li = el('li');
      var item = cardRow(id, 'is-sm');
      var body = el('div', 'conv-body');
      body.appendChild(el('span', 'conv-name', DATA.people[id].name));
      if (DATA.people[id].online) body.appendChild(el('span', 'conv-preview is-online', 'En ligne'));
      item.appendChild(body);
      li.appendChild(item);
      card.appendChild(li);
    });
  }

  // Icônes Lucide des réglages, sur une tuile colorée.
  var SETTINGS = [
    ['Compte', '#2F6FDB', '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5"/>'],
    ['Confidentialité', '#5B5FC7', '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'],
    ['Notifications', '#D9534F', '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>'],
    ['Discussions', '#1F9D55', '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'],
    ['Stockage et données', '#C77A1F', '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>'],
    ['Aide', '#6B7280', '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'],
  ];

  function renderSettings() {
    // Carte profil
    var profile = el('ul', 'conv-card');
    var pli = el('li');
    var pItem = el('button', 'conv-item');
    pItem.type = 'button';
    var me = makeAvatar(DATA.people.me, 'conv-avatar');
    me.alt = '';
    pItem.appendChild(me);
    var pBody = el('div', 'conv-body');
    pBody.appendChild(el('span', 'conv-name', 'Mon profil'));
    pBody.appendChild(el('span', 'conv-preview', 'Disponible'));
    pItem.appendChild(pBody);
    pItem.insertAdjacentHTML('beforeend', CHEVRON);
    pli.appendChild(pItem);
    profile.appendChild(pli);
    list.appendChild(profile);

    // Rubriques
    var card = el('ul', 'conv-card settings-card');
    SETTINGS.forEach(function (row) {
      var li = el('li');
      var item = el('button', 'conv-item settings-item');
      item.type = 'button';
      var tile = el('span', 'settings-tile');
      tile.style.background = row[1];
      tile.innerHTML = '<svg class="ico ico-sm" viewBox="0 0 24 24" aria-hidden="true">' + row[2] + '</svg>';
      item.appendChild(tile);
      item.appendChild(el('span', 'conv-name', row[0]));
      item.insertAdjacentHTML('beforeend', CHEVRON);
      li.appendChild(item);
      card.appendChild(li);
    });
    list.appendChild(card);
  }

  var HOME = {
    messages: { title: 'Messages', render: renderList, action: 'Nouvelle conversation', search: true },
    appels:   { title: 'Appels',   render: renderCalls, action: null, search: false },
    contacts: { title: 'Contacts', render: renderContacts, action: 'Nouveau contact', search: true },
    reglages: { title: 'Réglages', render: renderSettings, action: null, search: false },
  };

  function showHome(tab) {
    var cfg = HOME[tab];
    list.textContent = '';
    cfg.render();
    list.scrollTop = 0;
    document.getElementById('home-title').textContent = cfg.title;
    var action = document.getElementById('home-action');
    action.hidden = !cfg.action;
    if (cfg.action) action.setAttribute('aria-label', cfg.action);
    document.getElementById('home-search').hidden = !cfg.search;
    document.querySelectorAll('.tab').forEach(function (t) {
      var on = t.getAttribute('data-tab') === tab;
      t.classList.toggle('is-active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    updateTabBadge();
  }

  /* ---------- Écran conversation ---------- */
  function renderConversation(conv) {
    document.getElementById('conv-title').textContent = conv.title;
    var icon = document.getElementById('conv-icon');
    icon.textContent = '';
    var photo = conv.with || conv.members;
    icon.classList.toggle('has-photo', !!photo);
    if (photo) icon.appendChild(convAvatar(conv, 'topbar-photo'));
    else icon.textContent = conv.icon;

    // Sous-titre : « En ligne » pour un contact connecté, la liste des membres pour un groupe.
    var sub = document.getElementById('conv-sub');
    var person = conv.with && DATA.people[conv.with];
    sub.textContent = person && person.online ? 'En ligne'
      : conv.members ? conv.members.map(function (id) { return (DATA.people[id] || {}).name; }).concat('Vous').join(', ')
      : '';
    sub.hidden = !sub.textContent;
    sub.classList.toggle('is-online', !!(person && person.online));

    thread.textContent = '';
    var msgs = conv.messages;
    msgs.forEach(function (msg, i) {
      if (msg.unreadMarker) {
        var n = countAfterMarker(conv);
        var marker = el('div', 'unread-marker');
        marker.id = 'unread-marker';
        marker.appendChild(el('span', '', n + ' message' + (n > 1 ? 's' : '') + ' non lu' + (n > 1 ? 's' : '')));
        thread.appendChild(marker);
        return;
      }
      if (isSep(msg)) { thread.appendChild(el('div', 'day-sep', msg.day)); return; }
      var prev = msgs[i - 1], next = msgs[i + 1];
      var isOut = msg.from === 'me';
      // Une série = messages consécutifs d'une même personne, sans saut d'1 h ou plus entre eux.
      function bigGap(a, b) { return minutes(b.time) - minutes(a.time) >= 60; }
      var firstOfGroup = !prev || prev.from !== msg.from || bigGap(prev, msg);
      var lastOfGroup = !next || next.from !== msg.from || bigGap(msg, next);

      var row = el('div', 'row ' + (isOut ? 'out' : 'in') + (firstOfGroup && i > 0 && !isSep(prev) ? ' group-start' : ''));
      // Saut temporel (1 h ou plus depuis le message précédent, même jour) : on aère nettement.
      if (prev && !isSep(prev) && minutes(msg.time) - minutes(prev.time) >= 60) row.classList.add('time-gap');

      // Avatar seulement sur le dernier message d'une série ; sinon un espace vide de même taille.
      row.appendChild(lastOfGroup ? makeAvatar(DATA.people[msg.from], 'avatar') : el('div', 'avatar ghost'));

      if (msg.emoji) {
        var em = el('div', 'emoji', msg.emoji);
        em.setAttribute('aria-label', msg.emoji + ' ' + msg.time);
        row.appendChild(em);
      } else if (msg.audio) {
        row.classList.add('has-voice');
        var stack = el('div', 'stack');
        buildVoice(msg, stack);
        row.appendChild(stack);
      } else {
        var bubble = el('div', 'bubble');
        bubble.appendChild(document.createTextNode(msg.text));
        bubble.appendChild(el('span', 'time time-spacer', msg.time)).setAttribute('aria-hidden', 'true');
        bubble.appendChild(el('span', 'time', msg.time));
        row.appendChild(bubble);
      }
      thread.appendChild(row);
    });

    // « Vu » sous mon dernier message s'il clôt la conversation.
    var last = lastOf(conv);
    if (last.from === 'me') {
      var seen = el('div', 'seen', 'Vu');
      seen.insertAdjacentHTML('afterbegin', ICON_SEEN);
      thread.appendChild(seen);
    }

    // Conversation ouverte = messages lus : la pastille disparaît de la liste.
    conv.unread = 0;
  }

  /* ---------- Navigation (#id-conversation dans l'URL, le bouton retour du téléphone marche) ---------- */
  var openedFromList = false;

  function route() {
    if (current) current.pause();
    var id = decodeURIComponent(location.hash.slice(1));
    var conv = DATA.conversations.filter(function (c) { return c.id === id; })[0];
    if (conv) {
      renderConversation(conv);
      screenList.hidden = true;
      screenConv.hidden = false;
      // Comme WhatsApp : on arrive sur la ligne « non lus » s'il y en a une, sinon tout en bas.
      var marker = document.getElementById('unread-marker');
      thread.scrollTop = marker ? marker.offsetTop - 16 : thread.scrollHeight;
    } else {
      showHome(HOME[id] ? id : 'messages');
      screenConv.hidden = true;
      screenList.hidden = false;
    }
  }

  // Changer d'onglet ne s'empile pas dans l'historique (comme une vraie appli).
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      var tab = t.getAttribute('data-tab');
      location.replace('#' + (tab === 'messages' ? '' : tab));
    });
  });

  list.addEventListener('click', function (e) { if (e.target.closest('a.conv-item')) openedFromList = true; });
  document.getElementById('back').addEventListener('click', function () {
    if (openedFromList) { openedFromList = false; history.back(); }
    else location.hash = '';
  });
  window.addEventListener('hashchange', route);
  route();
})();
