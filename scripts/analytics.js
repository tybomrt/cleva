/* ==========================================================================
   cleva. — consentement cookies + Google Analytics (GA4)

   GA4 (gtag.js) n'est chargé qu'après consentement explicite : tant que le
   visiteur n'a pas cliqué "Accepter", aucun script Google ne se charge et
   aucun cookie n'est déposé. Le choix (accepté/refusé) est mémorisé dans
   localStorage pour ne plus jamais réafficher la bannière.
   ========================================================================== */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-VTM0E3RVLT';
  var STORAGE_KEY = 'cleva-cookie-consent';

  function getConsent() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // Stockage indisponible (navigation privée, etc.) : le choix ne sera
      // pas mémorisé, la bannière pourra réapparaître — pas bloquant.
    }
  }

  function loadGA() {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID);
  }

  function init() {
    var banner = document.getElementById('cookie-banner');
    if (!banner) return;

    var consent = getConsent();
    if (consent === 'accepted') {
      loadGA();
      return;
    }
    if (consent === 'refused') {
      return;
    }

    banner.classList.remove('hidden');

    var acceptBtn = document.getElementById('cookie-accept');
    var refuseBtn = document.getElementById('cookie-refuse');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        setConsent('accepted');
        banner.classList.add('hidden');
        loadGA();
      });
    }
    if (refuseBtn) {
      refuseBtn.addEventListener('click', function () {
        setConsent('refused');
        banner.classList.add('hidden');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
