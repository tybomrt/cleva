/* ==========================================================================
   cleva. — scripts
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. DATE DE LIVRAISON — source de vérité unique

     ⚠️  À REMPLIR PAR TYBO avant la mise en ligne.

     Le Code de la consommation (art. L216-1) impose d'indiquer la date ou le
     délai de livraison AVANT la conclusion du contrat. À défaut de date
     indiquée, le délai légal maximum retombe à 30 jours.

     Mets ici une date volontairement pessimiste : sur un produit fabriqué,
     la pratique du secteur est d'ajouter deux mois à son estimation réelle.
     Et rappelle-toi que pour un mariage, la date est une « condition
     essentielle du contrat » (L216-2) : un client peut résoudre la vente
     immédiatement, sans mise en demeure, si tu livres après son mariage.

     Exemples de formulation :
       'octobre 2026'                → acceptable
       'la semaine du 12 octobre 2026' → nettement mieux
     ---------------------------------------------------------------------- */
  var LIVRAISON = 'à partir du 11 janvier 2027';

  /* ------------------------------------------------------------------------
     2. Injection de la date et de l'année
     ---------------------------------------------------------------------- */
  function remplirTextes() {
    document.querySelectorAll('[data-livraison]').forEach(function (el) {
      el.textContent = LIVRAISON;
    });
    document.querySelectorAll('[data-annee]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ------------------------------------------------------------------------
     3. Sélecteur de tables (page produit)

     Fait passer mentalement de « 25 € » à « 250 € » en montrant la logique,
     au lieu de laisser la surprise arriver au panier.
     ---------------------------------------------------------------------- */
  var PRIX_BOITE = 25;

  function initSelecteur() {
    var invites = document.getElementById('invites');
    if (!invites) return;

    var parTable = document.getElementById('par-table');
    var nbBoites = document.getElementById('nb-boites');
    var total = document.getElementById('total');
    var note = document.getElementById('selecteur-note');
    var moins = document.getElementById('moins');
    var plus = document.getElementById('plus');

    function calculer() {
      var n = parseInt(invites.value, 10);
      if (isNaN(n) || n < 1) n = 1;
      if (n > 600) n = 600;

      var taille = parseInt(parTable.value, 10) || 8;
      var boites = Math.ceil(n / taille);

      nbBoites.textContent = boites;
      total.textContent = (boites * PRIX_BOITE).toLocaleString('fr-FR');

      var reste = n % taille;
      if (reste !== 0 && boites > 1) {
        note.textContent =
          'La dernière table n\'aura que ' + reste +
          (reste > 1 ? ' invités' : ' invité') +
          ' — une boîte fonctionne à partir de 4 joueurs.';
      } else {
        note.textContent = '';
      }
    }

    function pas(delta) {
      var n = parseInt(invites.value, 10);
      if (isNaN(n)) n = 0;
      invites.value = Math.max(1, Math.min(600, n + delta));
      calculer();
    }

    invites.addEventListener('input', calculer);
    parTable.addEventListener('change', calculer);
    if (moins) moins.addEventListener('click', function () { pas(-10); });
    if (plus) plus.addEventListener('click', function () { pas(10); });

    calculer();
  }

  /* ------------------------------------------------------------------------
     3bis. Sélecteur de quantité rapide (page produit, bloc achat en haut)

     Tarif dégressif : plus on prend de boîtes, moins elles coûtent cher.
     ---------------------------------------------------------------------- */
  function prixParBoite(n) {
    if (n >= 8) return 25;
    if (n >= 5) return 28;
    return 30;
  }

  var QTE_MAX = 15;

  function initQuantite() {
    var qte = document.getElementById('qte-tables');
    if (!qte) return;

    var titre = document.getElementById('qte-custom-titre');
    var prixAffiche = document.getElementById('qte-custom-price');
    var moins = document.getElementById('qte-moins');
    var plus = document.getElementById('qte-plus');
    var cta = document.getElementById('qte-cta');
    var headerCta = document.getElementById('header-cta-produit');

    // Si on revient d'un paiement Stripe annulé, api/create-checkout-session.js
    // renvoie vers ?qte=n pour ne pas faire perdre la sélection au client.
    var qteRetour = parseInt(new URLSearchParams(window.location.search).get('qte'), 10);
    if (!isNaN(qteRetour) && qteRetour >= 1 && qteRetour <= QTE_MAX) {
      qte.value = qteRetour;
      window.history.replaceState(null, '', window.location.pathname);
    }

    function nombreActuel() {
      var n = parseInt(qte.value, 10);
      if (isNaN(n) || n < 1) n = 1;
      return Math.min(n, QTE_MAX);
    }

    function calculer() {
      var n = nombreActuel();
      var prix = prixParBoite(n);

      if (titre) titre.textContent = n > 1 ? 'tables' : 'table';
      if (prixAffiche) {
        prixAffiche.textContent = (n * prix).toLocaleString('fr-FR') + '\u00a0\u20ac';
      }
      if (moins) moins.disabled = n <= 1;
      if (plus) plus.disabled = n >= QTE_MAX;
    }

    function pas(delta) {
      var n = parseInt(qte.value, 10);
      if (isNaN(n)) n = 1;
      qte.value = Math.max(1, Math.min(QTE_MAX, n + delta));
      calculer();
    }

    // Le prix est calcul\u00e9 c\u00f4t\u00e9 serveur \u00e0 partir de la m\u00eame grille tarifaire
    // (voir api/create-checkout-session.js) : le client ne fait que d\u00e9clencher
    // la cr\u00e9ation de la session Stripe puis suit l'URL renvoy\u00e9e.
    function irVersPaiement(bouton) {
      var texteOriginal = bouton.textContent;
      bouton.style.pointerEvents = 'none';
      bouton.textContent = 'Redirection\u2026';

      fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: nombreActuel() })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        })
        .then(function (data) {
          window.location.href = data.url;
        })
        .catch(function () {
          bouton.style.pointerEvents = '';
          bouton.textContent = 'Oups, r\u00e9essayez';
          setTimeout(function () { bouton.textContent = texteOriginal; }, 2500);
        });
    }

    qte.addEventListener('input', calculer);
    if (moins) moins.addEventListener('click', function () { pas(-1); });
    if (plus) plus.addEventListener('click', function () { pas(1); });
    if (cta) cta.addEventListener('click', function (e) { e.preventDefault(); irVersPaiement(cta); });
    if (headerCta) headerCta.addEventListener('click', function (e) { e.preventDefault(); irVersPaiement(headerCta); });

    calculer();
  }

  /* ------------------------------------------------------------------------
     4. Formulaire « Prévenez-moi »

     Sur une précommande à horizon lointain, la capture d'email n'est pas un
     lot de consolation : c'est le second produit de la page.
     Dépend de /api/subscribe.js, qui reste à implémenter côté serveur.
     ---------------------------------------------------------------------- */
  function initNotify() {
    var form = document.getElementById('notify-form');
    if (!form) return;

    var input = document.getElementById('notify-email');
    var msg = document.getElementById('notify-msg');
    var bouton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'Cet email ne semble pas valide.';
        msg.className = 'mt-3 text-sm text-primary';
        input.focus();
        return;
      }

      bouton.disabled = true;
      bouton.textContent = 'Envoi…';
      msg.textContent = '';

      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        })
        .then(function () {
          form.reset();
          msg.textContent = 'C\'est noté — je vous préviens dès que la première enquête est prête.';
          msg.className = 'mt-3 text-sm text-lin-400';
        })
        .catch(function () {
          msg.innerHTML =
            'Impossible d\'enregistrer votre email pour le moment. ' +
            'Écrivez-moi directement : <a class="text-accent-text underline underline-offset-4" href="mailto:contact@cleva-games.fr">contact@cleva-games.fr</a>';
          msg.className = 'mt-3 text-sm text-lin-400';
        })
        .finally(function () {
          bouton.disabled = false;
          bouton.textContent = 'Prévenez-moi';
        });
    });
  }

  /* ------------------------------------------------------------------------
     4bis. Formulaire de rétractation (legal/retractation.html)
     Dépend de /api/retraction.js, qui envoie la notification + l'accusé de
     réception via le SMTP OVH.
     ---------------------------------------------------------------------- */
  function initRetraction() {
    var form = document.getElementById('retraction-form');
    if (!form) return;

    var email = document.getElementById('retraction-email');
    var msg = document.getElementById('retraction-msg');
    var bouton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        msg.textContent = 'Cet email ne semble pas valide.';
        msg.className = 'text-sm text-primary';
        email.focus();
        return;
      }

      var data = {
        nom: form.nom.value.trim(),
        email: email.value.trim(),
        commande: form.commande.value,
        reception: form.reception.value,
        message: form.message.value.trim(),
        website: form.website.value
      };

      bouton.disabled = true;
      bouton.textContent = 'Envoi…';
      msg.textContent = '';

      fetch('/api/retraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        })
        .then(function () {
          form.reset();
          msg.textContent = 'C\'est noté — vous allez recevoir un email de confirmation.';
          msg.className = 'text-sm text-ink-soft';
        })
        .catch(function () {
          msg.innerHTML =
            'Impossible d\'envoyer votre demande pour le moment. ' +
            'Écrivez-nous directement : <a class="text-accent-text underline underline-offset-4" href="mailto:contact@cleva-games.fr">contact@cleva-games.fr</a>';
          msg.className = 'text-sm text-ink-soft';
        })
        .finally(function () {
          bouton.disabled = false;
          bouton.textContent = 'Envoyer ma rétractation';
        });
    });
  }

  /* ------------------------------------------------------------------------
     5. Barre d'achat collante — masquée quand le bloc précommande est visible
     ---------------------------------------------------------------------- */
  function initBuybar() {
    var bar = document.getElementById('buybar');
    var cible = document.getElementById('precommande');
    if (!bar || !cible || !('IntersectionObserver' in window)) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        bar.style.transform = entry.isIntersecting ? 'translateY(110%)' : 'translateY(0)';
      });
    }, { threshold: 0.15 });

    bar.style.transition = 'transform .25s ease';
    obs.observe(cible);
  }

  /* ------------------------------------------------------------------------
     6. Animations d'apparition — révèle le contenu au scroll (.reveal).
     Le contenu visible au chargement (.reveal-on-load) s'anime en CSS pur,
     sans JS : cf. main.css.
     ---------------------------------------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    els.forEach(function (el) { obs.observe(el); });
  }

  /* ------------------------------------------------------------------------
     7. Accordéons animés (.accordion) — FAQ et page produit. Ouverture/
     fermeture en douceur au lieu du toggle instantané natif de <details>.
     Anime la hauteur et l'opacité du contenu via l'API Web Animations ; le
     contenu (question comprise) reste lisible sans JS.
     ---------------------------------------------------------------------- */
  function initAccordion() {
    var items = document.querySelectorAll('details.accordion');
    if (!items.length || !('animate' in document.createElement('div'))) return;

    items.forEach(function (details) {
      var summary = details.querySelector('summary');
      var content = details.querySelector('.accordion-content');
      if (!summary || !content) return;

      var animation = null;
      var contentAnimation = null;
      var isClosing = false;
      var isExpanding = false;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        details.style.overflow = 'hidden';

        if (isClosing || !details.open) {
          open();
        } else if (isExpanding || details.open) {
          close();
        }
      });

      function open() {
        details.style.height = details.offsetHeight + 'px';
        details.open = true;
        window.requestAnimationFrame(function () { expand(); });
      }

      function detailsPadding() {
        var cs = getComputedStyle(details);
        return parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      }

      function expand() {
        isExpanding = true;
        var startHeight = details.offsetHeight;
        // Mesure la hauteur réelle de <details> une fois ouvert (height:auto),
        // plutôt que de la reconstituer en additionnant summary + content +
        // padding : un margin-collapse entre le premier enfant de
        // .accordion-content et .accordion-content lui-même (ex. `mt-5` sur
        // la liste) n'est pas compté dans content.offsetHeight, ce qui sous-
        // estimait la hauteur finale et provoquait un petit saut visible à
        // la fin de l'animation, une fois `height` repassé à `auto`.
        details.style.height = 'auto';
        var endHeight = details.offsetHeight;
        details.style.height = startHeight + 'px';
        runAnimation(startHeight, endHeight, true);
      }

      function close() {
        isClosing = true;
        var startHeight = details.offsetHeight;
        var endHeight = summary.offsetHeight + detailsPadding();
        runAnimation(startHeight, endHeight, false);
      }

      function runAnimation(startHeight, endHeight, willBeOpen) {
        if (animation) animation.cancel();
        if (contentAnimation) contentAnimation.cancel();

        animation = details.animate(
          { height: [startHeight + 'px', endHeight + 'px'] },
          { duration: 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
        contentAnimation = content.animate(
          { opacity: willBeOpen ? [0, 1] : [1, 0] },
          { duration: 350, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
        );

        animation.onfinish = function () { onAnimationFinish(willBeOpen); };
        animation.oncancel = function () {
          isClosing = false;
          isExpanding = false;
        };
      }

      function onAnimationFinish(willBeOpen) {
        details.open = willBeOpen;
        animation = null;
        if (contentAnimation) {
          contentAnimation.cancel();
          contentAnimation = null;
        }
        content.style.opacity = '';
        isClosing = false;
        isExpanding = false;
        details.style.height = '';
        details.style.overflow = '';
      }
    });
  }

  /* ------------------------------------------------------------------------
     8. Hero desktop : recadrage dynamique pour garder la boîte visible

     hero-desktop.webp est affichée en object-fit: cover sur une hauteur
     fixe ; en dessous d'une certaine largeur, l'image dépasse et se fait
     rogner horizontalement. Plutôt qu'un object-position fixe, on ajuste
     dynamiquement au resize : on rogne d'abord à droite de la boîte (zone
     sans intérêt), et seulement une fois cette marge épuisée, on commence
     à rogner à gauche — pour que la boîte reste toujours entièrement
     visible, quelle que soit la largeur de fenêtre.

     Les deux constantes ci-dessous sont la position (en fraction de la
     largeur de hero-desktop.webp, 2228px) du bord gauche et du bord droit
     de la boîte sur la photo, mesurée une fois pour toutes sur le fichier
     actuel. À refaire si la photo change.
     ---------------------------------------------------------------------- */
  var HERO_BOX_RIGHT_FRAC = 1926 / 2228;

  function initHeroDesktopCrop() {
    var img = document.querySelector('#hero img[src*="hero-desktop"]');
    if (!img) return;

    function update() {
      var rect = img.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      var containerAspect = rect.width / rect.height;
      var imageAspect = img.naturalWidth / img.naturalHeight;

      if (!imageAspect || containerAspect >= imageAspect) {
        img.style.objectPosition = '50% 50%';
        return;
      }

      var visibleFraction = containerAspect / imageAspect;
      var position;
      if (visibleFraction >= HERO_BOX_RIGHT_FRAC) {
        position = 0;
      } else {
        position = (HERO_BOX_RIGHT_FRAC - visibleFraction) / (1 - visibleFraction);
        position = Math.max(0, Math.min(1, position));
      }
      img.style.objectPosition = (position * 100) + '% 50%';
    }

    var resizeTimer = null;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(update, 100);
    }

    if (img.complete) {
      update();
    } else {
      img.addEventListener('load', update, { once: true });
    }
    window.addEventListener('resize', onResize);
  }

  /* ------------------------------------------------------------------------
     8bis. Galerie produit (page produit) — clic sur une vignette ou sur les
     flèches précédent/suivant pour changer la photo principale : l'ancienne
     et la nouvelle image se poussent horizontalement (comme un slide), dans
     le sens de la navigation. Défilement automatique en boucle tant que
     personne n'interagit ; la vignette active se remplit (overlay blanc)
     pour montrer le temps restant avant le passage à la suivante — remise à
     zéro à chaque interaction manuelle.
     ---------------------------------------------------------------------- */
  function initGalerieProduit() {
    var viewport = document.getElementById('galerie-image');
    var prevBtn = document.getElementById('galerie-prev');
    var nextBtn = document.getElementById('galerie-next');
    var playPauseBtn = document.getElementById('galerie-playpause');
    var thumbs = document.querySelectorAll('[data-galerie-thumb]');
    if (!viewport || !prevBtn || !nextBtn || !playPauseBtn || !thumbs.length) return;

    var image = viewport;
    var current = 0;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SLIDE = 400;
    var DURATION = 7000;
    var TICK = 50;
    var elapsed = 0;
    var intervalId = null;
    var playing = false;

    function resetFills() {
      thumbs.forEach(function (t) {
        var fill = t.querySelector('[data-galerie-fill]');
        if (fill) fill.style.width = '0%';
      });
    }

    function slideTo(src, direction) {
      if (reducedMotion) {
        image.src = src;
        return;
      }
      var container = image.parentElement;
      var oldImg = image;
      var newImg = document.createElement('img');
      newImg.src = src;
      newImg.alt = '';
      newImg.className = oldImg.className;
      newImg.style.transform = 'translateX(' + (direction > 0 ? '100%' : '-100%') + ')';
      container.insertBefore(newImg, oldImg.nextSibling);

      // Force le calcul du style avant d'animer, sinon le navigateur
      // fusionne l'état initial et l'état final en une seule frame.
      newImg.getBoundingClientRect();
      oldImg.style.transition = newImg.style.transition = 'transform ' + SLIDE + 'ms ease';
      oldImg.style.transform = 'translateX(' + (direction > 0 ? '-100%' : '100%') + ')';
      newImg.style.transform = 'translateX(0)';

      window.setTimeout(function () {
        oldImg.remove();
        newImg.id = 'galerie-image';
        image = newImg;
      }, SLIDE);
    }

    function setActive(index, direction) {
      var next = (index + thumbs.length) % thumbs.length;
      if (direction === undefined) direction = next >= current ? 1 : -1;
      current = next;
      elapsed = 0;
      resetFills();
      slideTo(thumbs[current].querySelector('img').src, direction);
      thumbs.forEach(function (t, i) {
        t.classList.toggle('border-primary', i === current);
        t.classList.toggle('border-transparent', i !== current);
      });
    }

    function tick() {
      elapsed += TICK;
      var fill = thumbs[current].querySelector('[data-galerie-fill]');
      if (fill) fill.style.width = (Math.min(1, elapsed / DURATION) * 100) + '%';
      if (elapsed >= DURATION) {
        setActive(current + 1, 1);
      }
    }

    function play() {
      playing = true;
      playPauseBtn.setAttribute('aria-label', 'Mettre en pause le défilement');
      playPauseBtn.querySelector('[data-icon="pause"]').classList.remove('hidden');
      playPauseBtn.querySelector('[data-icon="play"]').classList.add('hidden');
      if (intervalId) window.clearInterval(intervalId);
      intervalId = window.setInterval(tick, TICK);
    }

    function pause() {
      playing = false;
      playPauseBtn.setAttribute('aria-label', 'Reprendre le défilement');
      playPauseBtn.querySelector('[data-icon="pause"]').classList.add('hidden');
      playPauseBtn.querySelector('[data-icon="play"]').classList.remove('hidden');
      if (intervalId) window.clearInterval(intervalId);
    }

    // Reprend le compte à rebours à zéro après une navigation manuelle,
    // sans forcer la reprise si l'utilisateur avait mis en pause.
    function restart() {
      elapsed = 0;
      resetFills();
      if (playing) play();
    }

    thumbs.forEach(function (thumb, i) {
      thumb.addEventListener('click', function () {
        setActive(i);
        restart();
      });
    });
    prevBtn.addEventListener('click', function () {
      setActive(current - 1, -1);
      restart();
    });
    nextBtn.addEventListener('click', function () {
      setActive(current + 1, 1);
      restart();
    });
    playPauseBtn.addEventListener('click', function () {
      if (playing) { pause(); } else { play(); }
    });

    if (reducedMotion) {
      pause();
    } else {
      play();
    }
  }

  /* ---------------------------------------------------------------------- */
  function init() {
    remplirTextes();
    initSelecteur();
    initQuantite();
    initHeroDesktopCrop();
    initNotify();
    initRetraction();
    initGalerieProduit();
    initBuybar();
    initReveal();
    initAccordion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
