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
  var LIVRAISON = 'automne 2026';

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

  var LIENS_STRIPE = {
    1: 'https://buy.stripe.com/eVqdR875qbkY91U3lK8k801',
    2: 'https://buy.stripe.com/14A8wOgG0exagum2hG8k802',
    3: 'https://buy.stripe.com/3cI9AScpK0Gkce65tS8k803',
    4: 'https://buy.stripe.com/bJedR875qcp25PI5tS8k804',
    5: 'https://buy.stripe.com/bJeeVccpK1Ko91U09y8k805',
    6: 'https://buy.stripe.com/28E00iblGagU2Dwg8w8k806',
    7: 'https://buy.stripe.com/3cI28q4XifBe1zs09y8k807',
    8: 'https://buy.stripe.com/9B64gy75q4WAba29K88k808',
    9: 'https://buy.stripe.com/8x2fZg2Paexa0vobSg8k809',
    10: 'https://buy.stripe.com/7sYfZggG074Igum2hG8k80a',
    11: 'https://buy.stripe.com/aFa8wO2Pa1Ko91Uf4s8k80b',
    12: 'https://buy.stripe.com/4gM5kC1L660Efqi7C08k80c',
    13: 'https://buy.stripe.com/eVq4gy75q2Os91U9K88k80d',
    14: 'https://buy.stripe.com/00w6oG2Pa3Sw3HA7C08k80e',
    15: 'https://buy.stripe.com/9B64gy1L6dt6gum7C08k80f'
  };

  function initQuantite() {
    var qte = document.getElementById('qte-tables');
    if (!qte) return;

    var titre = document.getElementById('qte-custom-titre');
    var prixAffiche = document.getElementById('qte-custom-price');
    var moins = document.getElementById('qte-moins');
    var plus = document.getElementById('qte-plus');
    var cta = document.getElementById('qte-cta');
    var navCta = document.getElementById('nav-menu');

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

      var lien = LIENS_STRIPE[n];
      if (lien) {
        if (cta) cta.href = lien;
        if (navCta) navCta.href = lien;
      }
    }

    function pas(delta) {
      var n = parseInt(qte.value, 10);
      if (isNaN(n)) n = 1;
      qte.value = Math.max(1, Math.min(QTE_MAX, n + delta));
      calculer();
    }

    qte.addEventListener('input', calculer);
    if (moins) moins.addEventListener('click', function () { pas(-1); });
    if (plus) plus.addEventListener('click', function () { pas(1); });

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
        var endHeight = summary.offsetHeight + content.offsetHeight + detailsPadding();
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

  /* ---------------------------------------------------------------------- */
  function init() {
    remplirTextes();
    initSelecteur();
    initQuantite();
    initNotify();
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
