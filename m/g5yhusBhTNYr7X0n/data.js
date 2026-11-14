/* ==========================================================================
   Contenu de la boîte mail (énigme n° 2).
   C'est le seul fichier à modifier pour changer les e-mails.

   Boîte mail de Raphaël, wedding planner. Même mariage que la messagerie
   (énigme 1) : Lucas est le premier marié, Sacha (prénom par défaut) le deuxième.
   Les textes de Sacha restent neutres en genre.
   Prénoms personnalisés (écran « Retrouver le dossier », m/dossier/dossier.js) :
     {marie1} {marie2} {temoin1} {temoin2} dans un texte → prénom du vrai mariage,
     ou Lucas / Sacha / Clara / Julien sans dossier. Ne jamais écrire ces prénoms en dur.
     roles : quelle personne reçoit le prénom ET la photo de quel rôle.
   Le prestataire à rembourser n'est jamais nommé, et le montant du trop-perçu
   n'apparaît nulle part dans la boîte (il se trouve ailleurs dans le jeu).

   people : tous les expéditeurs/destinataires.
     { name, email, avatar }            → photo
     { name, email, initials, color }   → pastille colorée (initiales calculées si absentes)
     short : nom court dans la liste (« Sacha, moi ») ; sinon le premier mot du nom.
     'me' = le propriétaire de la boîte (Raphaël).
   Photos : Unsplash (licence Unsplash, usage libre), recadrées en 96 px.
     maman 1508214751196-bcfd4ca60f91 · mamie 1581579438747-1dc8d17bbce4 · lea 1517841905240-472988babdf9
     raphael : même photo que la messagerie (m/yPIJmt0brVePOdo8/img/me.jpg)

   threads : une conversation = un ou plusieurs e-mails sur le même objet.
     subject   : objet
     unread    : true → en gras dans la liste (repasse en « lu » une fois ouvert, mémorisé sur le téléphone)
     keepUnread: true → reste en gras même après ouverture
     starred   : true → étoile jaune
     promo     : true → petite étiquette « Promo » (réalisme, aucun effet)
     expanded  : true → tous les e-mails dépliés à l'ouverture (sinon : le dernier seulement)
     messages  : du plus ancien au plus récent
       from    : id dans people
       to      : liste d'ids (par défaut ['me'])
       date    : 'J-N HH:MM' (N jours avant le jour d'ouverture ; 'J HH:MM' = aujourd'hui)
       body    : texte ; une ligne vide = nouveau paragraphe
       attachments : [{ name, src, size }] ; une image (jpg/png/webp/svg) s'affiche en aperçu
                     [{ name, youtube: 'id', size }] → vidéo YouTube lue dans la page (muette, plein écran)

   La liste est triée automatiquement du plus récent au plus ancien.
   Les deux e-mails de l'énigme sont volontairement anciens : on les retrouve en
   cherchant (« Sacha », « origami »…), pas en faisant défiler.

   Ajouter ?reset à l'adresse pour remettre tous les e-mails en « non lu » (tests).
   ========================================================================== */

window.MAIL_DATA = {
  // Les dates sont RELATIVES au jour où l'on ouvre la page (= le jour du mariage) :
  //   'J 08:12' = aujourd'hui à 8h12 · 'J-1 22:15' = hier · 'J-2 21:47' = avant-hier…
  // Les e-mails du jour affichent l'heure, les autres la date (ex. « 29 oct. »).
  // Pour tester un autre jour : ajouter ?jour=2026-06-20 à l'adresse.
  folder: 'Boîte de réception',

  // Personnes remplacées par le vrai mariage (prénom + photo) : voir l'en-tête.
  roles: { sacha: 'marie2' },

  people: {
    me:       { name: 'Raphaël Verdier', short: 'Raphaël', email: 'contact@verdier-mariages.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/raphael.jpg' },
    sacha:    { name: '{marie2}', email: 'sacha.mariage@mail.fr', initials: 'S', color: '#C9D3EC' },
    emma:     { name: 'Emma Lefèvre', email: 'emma.lefevre@mail.fr', initials: 'EL', color: '#F3D1C4' },
    maman:    { name: 'Maman', email: 'maman.poule@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/maman.jpg' },
    mamie:    { name: 'Mamie', email: 'mamie.odette@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/mamie.jpg' },
    lea:      { name: 'Léa', short: 'Léa', email: 'petite.soeur@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/lea.jpg' },
    traiteur: { name: 'La Table de Margaux', email: 'contact@latabledemargaux.fr', initials: 'TM', color: '#EAD7B7' },
    colis:    { name: 'Colis Express', email: 'ne-pas-repondre@colis-express.fr', initials: 'CE', color: '#F5D99A' },
    banque:   { name: 'Banque du Lac', email: 'info@banquedulac.fr', initials: 'BL', color: '#B8CFE0' },
    annonces: { name: 'Petites Annonces', email: 'messages@petites-annonces.fr', initials: 'PA', color: '#E6E0A8' },
    garage:   { name: 'Garage du Centre', email: 'atelier@garageducentre.fr', initials: 'GC', color: '#BFD3DE' },
    concours: { name: 'Super Cadeau', email: 'gagnant@super-cadeau-win.biz', initials: '!', color: '#F0B8B8' },
  },

  threads: [
    /* =====================================================================
       ÉNIGME 1/2 — Sacha (deuxième marié) se plaint à Raphaël : le prestataire
       n'a toujours pas remboursé le trop-perçu. Raphaël le renvoie vers l'origami.
       Règles : ne JAMAIS nommer le prestataire ni écrire le montant.
       Non lu en permanence : on le voit en arrivant.
       ===================================================================== */
    {
      id: 'sacha-remboursement',
      subject: 'Toujours aucun remboursement 😤',
      unread: true,
      keepUnread: true, // reste en gras même après ouverture : c'est l'e-mail à lire en premier
      expanded: true,   // tous les e-mails dépliés à l'ouverture (la plainte du début compte)
      messages: [
        {
          from: 'sacha', to: ['me'], date: 'J-2 21:47',
          body: `Salut Raphaël,

Je ne comprends pas. Il y a un mois, le prestataire m'a promis un remboursement « dans la semaine » pour le trop-perçu. Rien depuis. Je l'ai appelé 4 fois, et je tombe à chaque fois sur sa secrétaire, jamais sur lui.

{marie1} me dit de laisser tomber, mais je n'y arrive pas. Tu peux faire quelque chose ?

{marie2}`,
        },
        {
          from: 'me', to: ['sacha'], date: 'J-1 22:15',
          body: `{marie2}, respire.

Ne lâche rien : essaye d'appeler à nouveau. Et note bien le montant exact qu'il doit te rendre, je ne l'ai même pas en tête.

Et pour ce soir, occupe-toi les mains. Moi, quand je n'arrive pas à me vider la tête, je fais de l'origami : on plie, on déplie, on se concentre, et tout le reste s'efface.

D'ailleurs, as-tu fait la figure que je t'ai envoyée dans un autre mail, il y a une dizaine de jours ?

Raphaël`,
        },
      ],
    },

    /* =====================================================================
       ÉNIGME 2/2 — Raphaël envoie un origami à Sacha.
       La pièce jointe est une vidéo YouTube (id après « watch?v= ») :
       lue dans la page, sans son, en plein écran dès qu'on la lance.
       ===================================================================== */
    {
      id: 'sacha-origami',
      subject: 'Un petit cadeau (à plier)',
      messages: [
        {
          from: 'me', to: ['sacha'], date: 'J-11 19:02',
          body: `Salut {marie2},

Comme promis, un petit cadeau pour les moments de stress : un origami tout simple. Tout est dans la vidéo, suis les étapes dans l'ordre. N'importe quel papier fera l'affaire, même un vieux brouillon.

Tu verras, ça fait un bien fou.

Raphaël`,
          attachments: [
            { name: 'origami.mp4', youtube: '58J5_xp_R44', size: '18 Mo' },
          ],
        },
        {
          from: 'sacha', to: ['me'], date: 'J-11 22:37',
          body: `Merci Raphaël ! Je te préviens quand même : je n'arrive même pas à plier une serviette correctement. Je regarde la vidéo, mais ne t'attends pas à un chef-d'œuvre 😅`,
        },
        {
          from: 'me', to: ['sacha'], date: 'J-11 22:40',
          body: `N'hésite pas à mettre pause entre chaque étape 😉`,
        },
      ],
    },

    /* ---------- Le reste de la boîte : le quotidien d'un wedding planner ---------- */
    {
      id: 'colis-jour-j',
      subject: 'Votre colis est en cours de livraison',
      messages: [{
        from: 'colis', date: 'J 08:12',
        body: `Bonjour,

Bonne nouvelle : votre colis n° CE 4471 0923 FR est en cours de livraison aujourd'hui.

Contenu déclaré : « 150 bulles de savon - mariage ».

Si vous êtes absent, il sera déposé chez votre voisin, ou devant la porte, ou là où le livreur le sentira.

L'équipe Colis Express`,
      }],
    },
    {
      id: 'maman-jour-j',
      subject: 'Fwd: TR: Fwd: trop drôle',
      messages: [{
        from: 'maman', date: 'J 07:31',
        body: `Coucou mon grand, Tante Sylvie m'a envoyé ça, ça m'a fait penser à toi.

Et pour le mariage d'aujourd'hui, tu as bien pensé aux alliances ??? Vérifie encore.

Bisous, Maman

---------- Message transféré ----------
De : Sylvie
Objet : TR: Fwd: trop drôle

Le mariage, c'est comme un restaurant : on commande ce qu'on veut, et on regarde ce que l'autre a dans son assiette.

😂😂😂`,
      }],
    },
    {
      id: 'emma-rdv',
      subject: 'Premier rendez-vous ?',
      messages: [
        {
          from: 'emma', date: 'J-3 09:12',
          body: `Bonjour Raphaël,

Nous avons découvert votre agence sur votre site. Nous nous marions l'été prochain et cherchons un wedding planner. Seriez-vous disponible pour un premier rendez-vous ?

Bien cordialement,
Emma Lefèvre`,
        },
        {
          from: 'me', to: ['emma'], date: 'J-3 11:30',
          body: `Bonjour Emma,

Merci pour votre message, avec grand plaisir ! Pouvez-vous me laisser votre numéro de téléphone ? Je vous appelle dès que possible.

Raphaël Verdier
Verdier Mariages & Événements`,
        },
      ],
    },
    {
      id: 'traiteur-couverts',
      subject: 'Confirmation du nombre de couverts',
      messages: [
        {
          from: 'traiteur', date: 'J-8 09:15',
          body: `Bonjour Raphaël,

Nous avons besoin de la confirmation définitive du nombre de couverts pour le mariage Martin. Pouvez-vous nous l'envoyer d'ici vendredi ?

Cordialement,
Margaux`,
        },
        {
          from: 'me', to: ['traiteur'], date: 'J-8 13:02',
          body: `Bonjour Margaux,

C'est confirmé : 96 couverts, dont 6 menus enfants. Les Martin viennent encore de changer d'avis sur un dessert, je vous tiens au courant 😅

Raphaël`,
        },
        {
          from: 'traiteur', date: 'J-8 15:48',
          body: `Parfait, merci ! Nous attendons votre retour pour le dessert.`,
        },
      ],
    },
    {
      id: 'lea-train',
      subject: 'Fwd: Vos billets de train',
      messages: [{
        from: 'lea', date: 'J-1 21:06',
        body: `Je t'ai pris les billets pour Saint-Malo, pour l'anniv de maman, comme ça c'est fait. Tu me dois un resto (un vrai).

---------- Message transféré ----------
Votre réservation est confirmée : 2 voyageurs, voiture 14, places 51 et 52.
Pensez à présenter vos billets à bord.`,
      }],
    },
    {
      id: 'annonces-canape',
      subject: 'Votre annonce a été vue 48 fois',
      messages: [{
        from: 'annonces', date: 'J-13 18:20',
        body: `Votre annonce « Canapé 3 places, couleur moutarde » a été vue 48 fois cette semaine.

Aucun message pour l'instant. Astuce : une photo prise de jour, ça aide.`,
      }],
    },
    {
      id: 'banque-releve',
      subject: 'Votre relevé de compte est disponible',
      messages: [{
        from: 'banque', date: 'J-18 06:30',
        body: `Bonjour,

Votre relevé de compte du mois dernier est disponible dans votre espace client.

Conseil : quand on organise des mariages, prévoyez une ligne « imprévus » dans votre budget. Et doublez-la.

Banque du Lac`,
      }],
    },
    {
      id: 'mamie-photos',
      subject: 'RE: RE: RE: photos',
      messages: [{
        from: 'mamie', to: ['me', 'maman', 'lea'], date: 'J-19 19:41',
        body: `Je n'ai pas reçu les photos.

Si, je les ai reçues, elles étaient dans le petit trombone.

Vous êtes très beaux. Raphaël, coiffe-toi un peu pour tes mariages, tu vas faire peur aux invités.

Mamie`,
      }],
    },
    {
      id: 'garage-ct',
      subject: 'Votre contrôle technique',
      messages: [{
        from: 'garage', date: 'J-20 09:00',
        body: `Bonjour,

Votre véhicule a passé son contrôle technique avec succès. Il est prêt à être récupéré.

Petite remarque : un essuie-glace arrière fait un bruit de canard. Ce n'est pas grave, mais c'est surprenant.

Le Garage du Centre`,
      }],
    },
    {
      id: 'concours',
      subject: 'FÉLICITATIONS !!! Vous avez gagné un robot cuiseur',
      promo: true,
      messages: [{
        from: 'concours', date: 'J-22 03:12',
        body: `Cher gagnant,

Vous avez été sélectionné parmi 1 000 000 de participants à un jeu auquel vous n'avez pas participé.

Cliquez vite pour réclamer votre cadeau (vous ne le ferez pas, et vous avez raison).`,
      }],
    },
  ],
};
