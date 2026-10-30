/* ==========================================================================
   Contenu de la boîte mail (énigme n° 2).
   C'est le seul fichier à modifier pour changer les e-mails.

   ⚠️ Autre couple que l'énigme n° 1 (messagerie) : aucun personnage, photo ou
   anecdote en commun. Ne pas reprendre Lucas, Clara, Brigitte, Gérard, etc.

   people : tous les expéditeurs/destinataires.
     { name, email, avatar }            → photo
     { name, email, initials, color }   → pastille colorée (initiales calculées si absentes)
     'me' = la propriétaire de la boîte (la mariée).
   Photos : Unsplash (licence Unsplash, usage libre), recadrées en 96 px.
     pauline 1494790108377-be9c29b29330 · chloe 1438761681033-6461ffad8d80
     ines 1544005313-94ddf0286df2 · maman 1508214751196-bcfd4ca60f91 · mamie 1581579438747-1dc8d17bbce4
     patrick 1472099645785-5658abf4ff4e · manon 1517841905240-472988babdf9 · yasmine 1544725176-7c40e5a71c5e
     olivier 1559548331-f9cb98001426 · mehdi 1566492031773-4f4e44671857 · baptiste 1539571696357-5a69c17a67c6

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
   cherchant (« Chloé », « origami »…), pas en faisant défiler.

   Ajouter ?reset à l'adresse pour remettre tous les e-mails en « non lu » (tests).
   ========================================================================== */

window.MAIL_DATA = {
  // Les dates sont RELATIVES au jour où l'on ouvre la page (= le jour du mariage) :
  //   'J 08:12' = aujourd'hui à 8h12 · 'J-1 22:15' = hier · 'J-2 21:47' = avant-hier…
  // Les e-mails du jour affichent l'heure, les autres la date (ex. « 29 oct. »).
  // Pour tester un autre jour : ajouter ?jour=2026-06-20 à l'adresse.
  folder: 'Boîte de réception',

  people: {
    me:       { name: 'Pauline Laurent', email: 'pauline.laurent@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/pauline.jpg' },
    chloe:    { name: 'Chloé Petit', email: 'chloe.petit@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/chloe.jpg' },
    ines:     { name: 'Inès Moreau', email: 'ines.moreau@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/ines.jpg' },
    maman:    { name: 'Maman', email: 'catherine.laurent@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/maman.jpg' },
    mamie:    { name: 'Mamie', email: 'odette.laurent@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/mamie.jpg' },
    patrick:  { name: 'Patrick Laurent', email: 'pat.laurent@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/patrick.jpg' },
    manon:    { name: 'Manon Laurent', email: 'manon.laurent@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/manon.jpg' },
    yasmine:  { name: 'Yasmine Haddad', email: 'yasmine.haddad@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/yasmine.jpg' },
    olivier:  { name: 'Olivier Garcia', email: 'o.garcia@agence-nord.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/olivier.jpg' },
    mehdi:    { name: 'Mehdi Benali', email: 'm.benali@agence-nord.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/mehdi.jpg' },
    baptiste: { name: 'Baptiste', email: 'baptiste.grimpe@mail.fr', avatar: '/m/g5yhusBhTNYr7X0n/img/baptiste.jpg' },
    traiteur: { name: 'La Table de Margaux', email: 'contact@latabledemargaux.fr', initials: 'TM', color: '#EAD7B7' },
    domaine:  { name: 'Domaine des Tilleuls', email: 'reservation@domainedestilleuls.fr', initials: 'DT', color: '#C6DCC3' },
    photo:    { name: 'Hélène Photographie', email: 'bonjour@helene-photo.fr', initials: 'HP', color: '#E3D3C5' },
    robe:     { name: 'Atelier Rose', email: 'atelier@rose-robes.fr', initials: 'AR', color: '#CBD2DC' },
    liste:    { name: 'Notre Liste', email: 'notifications@notreliste.fr', initials: 'NL', color: '#F1CFD9' },
    mairie:   { name: 'Mairie de Saint-Aubin', email: 'etat-civil@saint-aubin.fr', initials: 'M', color: '#C9CFE0' },
    colis:    { name: 'Colis Express', email: 'ne-pas-repondre@colis-express.fr', initials: 'CE', color: '#F5D99A' },
    banque:   { name: 'Banque du Lac', email: 'info@banquedulac.fr', initials: 'BL', color: '#B8CFE0' },
    brico:    { name: 'Brico & Co', email: 'newsletter@bricoandco.fr', initials: 'B', color: '#F3C3A6' },
    sonora:   { name: 'Sonora', email: 'hello@sonora.fm', initials: 'S', color: '#C2E0D4' },
    annonces: { name: 'Petites Annonces', email: 'messages@petites-annonces.fr', initials: 'PA', color: '#E6E0A8' },
    garage:   { name: 'Garage du Centre', email: 'atelier@garageducentre.fr', initials: 'GC', color: '#BFD3DE' },
    concours: { name: 'Super Cadeau', email: 'gagnant@super-cadeau-win.biz', initials: '!', color: '#F0B8B8' },
  },

  threads: [
    /* =====================================================================
       ÉNIGME 1/2 — La mariée se plaint à sa témoin (Chloé) : le prestataire ne lui a
       toujours pas remboursé le trop-perçu. La témoin la renvoie vers l'origami.
       Règle : ne JAMAIS nommer le prestataire. Non lu : on le voit en arrivant.
       ===================================================================== */
    {
      id: 'temoin-remboursement',
      subject: 'Toujours pas remboursée 😤',
      unread: true,
      keepUnread: true, // reste en gras même après ouverture : c'est l'e-mail à lire en premier
      expanded: true,   // tous les e-mails dépliés à l'ouverture (la plainte du début compte)
      messages: [
        {
          from: 'me', to: ['chloe'], date: 'J-2 21:47',
          body: `Salut Chloé,

Il faut que je vide mon sac, et tu es ma témoin, donc techniquement ça fait partie de ton job.

Je n'ai TOUJOURS pas été remboursée du trop-perçu. Tu sais, la somme qu'on a payée en trop au prestataire et qu'il devait nous rendre « dans la semaine ». C'était il y a un mois.

Je l'ai appelé quatre fois. Quatre. Et à chaque fois, je tombe sur sa secrétaire, jamais sur le patron. Elle est adorable, elle note tout, elle me promet qu'il va me rappeler… et il ne m'a jamais rappelé.

À deux jours du mariage, j'ai autre chose à faire que de courir après mon propre argent.

Pauline`,
        },
        {
          from: 'chloe', date: 'J-1 22:15',
          body: `Calme-toi, respire. Détends-toi.

C'est pas grave, il va te répondre. En pleine saison des mariages, ils sont tous débordés, ce n'est pas contre toi.

Essaie de le rappeler. Peut-être que tu tomberas enfin sur lui, avec un petit peu de chance.

En attendant, tu te maries demain : on déstresse. N'oublie pas, je t'ai déjà parlé de comment moi je me déstresse : je fais de l'origami. Plier, déplier, et la tête se vide toute seule.

D'ailleurs, est-ce que tu as fait la figure que je t'ai envoyée ?

Chloé`,
        },
      ],
    },

    /* =====================================================================
       ÉNIGME 2/2 — La témoin envoie un origami à la mariée.
       TEXTE PROVISOIRE. La pièce jointe est une vidéo YouTube (id après « watch?v= ») :
       lue dans la page, sans son, en plein écran dès qu'on la lance.
       ===================================================================== */
    {
      id: 'temoin-origami',
      subject: 'Un petit cadeau (à plier)',
      messages: [
        {
          from: 'chloe', date: 'J-11 19:02',
          body: `Hello,

Comme tu m'as dit que tu stressais, je te livre mon secret : moi, quand je suis à bout, je fais de l'origami. Ça occupe les mains et ça vide la tête.

Je t'ai trouvé une figure pour commencer.

Tout est dans la vidéo en pièce jointe. Une feuille, un peu de patience, et surtout tu suis les étapes dans l'ordre.

Chloé`,
          attachments: [
            { name: 'origami.mp4', youtube: '58J5_xp_R44', size: '18 Mo' },
          ],
        },
        {
          from: 'me', to: ['chloe'], date: 'J-11 22:37',
          body: `Chloé, je n'arrive pas à plier une serviette correctement.

Mais merci, c'est adorable. Je tente ce soir.`,
        },
        {
          from: 'chloe', date: 'J-11 22:40',
          body: `Courage. Et n'hésite pas à mettre pause entre chaque étape 😉`,
        },
      ],
    },

    /* ---------- Le reste de la boîte : du quotidien, pour le réalisme ---------- */
    {
      id: 'colis-jour-j',
      subject: 'Votre colis est en cours de livraison',
      messages: [{
        from: 'colis', date: 'J 08:12',
        body: `Bonjour Pauline,

Bonne nouvelle : votre colis n° CE 4471 0923 FR est en cours de livraison aujourd'hui.

Contenu déclaré : « 200 bulles de savon - mariage ».

Si vous êtes absente, il sera déposé chez votre voisin, ou devant la porte, ou là où le livreur le sentira.

L'équipe Colis Express`,
      }],
    },
    {
      id: 'maman-jour-j',
      subject: 'Fwd: TR: Fwd: trop drôle',
      unread: true,
      messages: [{
        from: 'maman', date: 'J 07:31',
        body: `Coucou ma grande, Tante Sylvie m'a envoyé ça, ça m'a fait penser à toi.

Et tu as bien vérifié que Chloé a les alliances ??? Vérifie encore.

Bisous, Maman

---------- Message transféré ----------
De : Sylvie
Objet : TR: Fwd: trop drôle

Le mariage, c'est comme un restaurant : on commande ce qu'on veut, et on regarde ce que l'autre a dans son assiette.

😂😂😂`,
      }],
    },
    {
      id: 'liste-sylvie',
      subject: 'Tante Sylvie a participé à votre liste 🎁',
      unread: true,
      messages: [{
        from: 'liste', date: 'J-1 20:47',
        body: `Bonne nouvelle !

Sylvie a participé à votre liste de mariage, pour le cadeau « Machine à pâtes ».

Son petit mot : « Pour que vous mangiez enfin des pâtes fraîches. Et pour que vous m'invitiez à les goûter. »

À bientôt sur Notre Liste`,
      }],
    },
    {
      id: 'domaine-cles',
      subject: 'Remise des clés la veille du mariage',
      messages: [
        {
          from: 'domaine', date: 'J-3 10:05',
          body: `Bonjour Madame Laurent,

Nous vous confirmons la remise des clés du Domaine des Tilleuls la veille de votre mariage, à partir de 16h.

Merci de prévoir une pièce d'identité. L'état des lieux de sortie aura lieu le lendemain du mariage, à 11h.

Bien cordialement,
Isabelle, Domaine des Tilleuls`,
        },
        {
          from: 'me', to: ['domaine'], date: 'J-3 12:40',
          body: `Bonjour Isabelle,

C'est noté, merci beaucoup. À très vite !

Pauline Laurent`,
        },
      ],
    },
    {
      id: 'olivier-conges',
      subject: 'Congés validés 🎉',
      messages: [{
        from: 'olivier', date: 'J-1 16:31',
        body: `Bonjour Pauline,

Tes trois semaines de congés sont validées. Interdiction formelle de lire tes mails pendant le voyage de noces.

Toute l'équipe te souhaite un très beau mariage !

Olivier`,
      }],
    },
    {
      id: 'mehdi-plante',
      subject: 'Re: Qui garde ta plante ?',
      messages: [
        {
          from: 'mehdi', date: 'J-4 10:02',
          body: `Je veux bien garder ta plante pendant ton voyage de noces. Mais je te préviens, la dernière que j'ai gardée a démissionné.`,
        },
        {
          from: 'me', to: ['mehdi'], date: 'J-4 10:06',
          body: `Elle s'appelle Josiane. Un verre d'eau le lundi, des compliments tous les jours.`,
        },
        {
          from: 'mehdi', date: 'J-4 10:07',
          body: `Les compliments, ça va être compliqué. Elle est quand même un peu moche.`,
        },
      ],
    },
    {
      id: 'robe-retouches',
      subject: 'Vos retouches sont prêtes',
      messages: [{
        from: 'robe', date: 'J-5 14:22',
        body: `Bonjour Madame Laurent,

Votre robe est prête : ourlet repris et bretelles raccourcies de 1,5 cm.

Vous pouvez passer la récupérer du mardi au samedi, de 10h à 19h.

L'Atelier Rose`,
      }],
    },
    {
      id: 'traiteur-couverts',
      subject: 'Confirmation du nombre de couverts',
      messages: [
        {
          from: 'traiteur', date: 'J-8 09:15',
          body: `Bonjour Pauline,

Pouvez-vous nous confirmer le nombre définitif de couverts, ainsi que les régimes particuliers ?

Belle journée,
Margaux`,
        },
        {
          from: 'me', to: ['traiteur'], date: 'J-8 13:02',
          body: `Bonjour Margaux,

Nous serons 96 adultes et 7 enfants. Deux végétariens, une allergie aux fruits à coque, et mon oncle Patrick qui veut « de la viande, de la vraie ».

Merci !
Pauline`,
        },
        {
          from: 'traiteur', date: 'J-8 15:48',
          body: `Parfait, c'est noté. Votre oncle aura sa viande, promis.

Margaux`,
        },
      ],
    },
    {
      id: 'ines-playlist',
      subject: 'Chansons INTERDITES à la soirée',
      messages: [
        {
          from: 'ines', to: ['me', 'chloe'], date: 'J-9 18:20',
          body: `Bon, il faut qu'on fasse la liste des chansons interdites. Je commence :

1. La chenille
2. Toute chanson qui implique de se mettre à genoux sur le parquet

À vous.`,
        },
        {
          from: 'me', to: ['ines', 'chloe'], date: 'J-9 18:41',
          body: `3. Tout ce que Tonton Patrick va demander au micro.`,
        },
      ],
    },
    {
      id: 'patrick-discours',
      subject: 'Mon petit discours',
      messages: [
        {
          from: 'patrick', date: 'J-10 21:06',
          body: `Pauline,

J'ai préparé un petit discours pour le repas. Rien de long, une vingtaine de minutes. Avec quelques anecdotes de quand tu étais petite.

Tu préfères avant ou après le fromage ?

Tonton Patrick`,
        },
        {
          from: 'me', to: ['patrick'], date: 'J-10 21:30',
          body: `Tonton, on avait dit 3 minutes. Et pas l'anecdote du camping.`,
        },
        {
          from: 'patrick', date: 'J-10 21:31',
          body: `Je ne promets rien pour le camping.`,
        },
      ],
    },
    {
      id: 'yasmine-cocktail',
      subject: 'La recette du cocktail',
      messages: [{
        from: 'yasmine', date: 'J-9 12:30',
        body: `Comme promis, la recette du cocktail « spécial mariés » :

Jus de pamplemousse, sirop de romarin, eau pétillante, beaucoup de glace.

Et une rondelle de citron vert pour faire croire que c'est compliqué.`,
      }],
    },
    {
      id: 'manon-train',
      subject: 'Fwd: Vos billets de train',
      messages: [{
        from: 'manon', date: 'J-12 21:06',
        body: `Je t'ai pris les billets pour le retour du voyage de noces, comme ça c'est fait. Tu me dois un resto (un vrai).

---------- Message transféré ----------
Votre réservation est confirmée : 2 voyageurs, voiture 14, places 51 et 52.
Pensez à présenter vos billets à bord.`,
      }],
    },
    {
      id: 'photo-galerie',
      subject: 'Votre galerie de la séance couple est en ligne 📸',
      messages: [{
        from: 'photo', date: 'J-12 17:40',
        body: `Bonjour Pauline,

Les photos de votre séance couple sont prêtes ! Vous trouverez 64 photos retouchées dans votre galerie privée.

Spoiler : la photo où vous éternuez est ma préférée.

À très vite,
Hélène`,
      }],
    },
    {
      id: 'sonora-recap',
      subject: 'Ton récap du mois : 47 h d’écoute 🎧',
      promo: true,
      messages: [{
        from: 'sonora', date: 'J-13 11:00',
        body: `47 heures d'écoute ce mois-ci.

Ton artiste le plus écouté : « Chansons d'amour pour mariage (vol. 3) ».

On ne juge pas.`,
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
      id: 'baptiste-escalade',
      subject: 'Escalade mardi : je réserve ?',
      messages: [{
        from: 'baptiste', to: ['me'], date: 'J-14 09:12',
        body: `Dernière séance avant ton mariage. Promis, on ne fait pas de voie difficile : on ne voudrait pas que tu arrives à la mairie avec un bras dans le plâtre.

Je réserve pour 19h ?`,
      }],
    },
    {
      id: 'mairie-dossier',
      subject: 'Dossier de mariage complet',
      messages: [{
        from: 'mairie', date: 'J-15 14:03',
        body: `Madame, Monsieur,

Nous vous informons que l'ensemble des pièces de votre dossier de mariage a bien été reçu et validé par le service de l'état civil.

Nous vous prions de vous présenter avec vos témoins et une pièce d'identité en cours de validité.

Le service de l'état civil`,
      }],
    },
    {
      id: 'brico-promo',
      subject: '-20 % sur toutes les perceuses 🔩',
      promo: true,
      messages: [{
        from: 'brico', date: 'J-15 08:00',
        body: `Ce week-end seulement : -20 % sur toutes les perceuses.

Parce qu'un mariage, c'est aussi monter des meubles ensemble.`,
      }],
    },
    {
      id: 'banque-releve',
      subject: 'Votre relevé de compte est disponible',
      messages: [{
        from: 'banque', date: 'J-18 06:30',
        body: `Bonjour,

Votre relevé de compte du mois dernier est disponible dans votre espace client.

Conseil de saison : prévoir une ligne « imprévus mariage » dans votre budget. Et la doubler.

Banque du Lac`,
      }],
    },
    {
      id: 'mamie-photos',
      subject: 'RE: RE: RE: photos',
      messages: [{
        from: 'mamie', to: ['me', 'maman', 'manon'], date: 'J-19 19:41',
        body: `Je n'ai pas reçu les photos.

Si, je les ai reçues, elles étaient dans le petit trombone.

Vous êtes très beaux. Pauline, coiffe-toi pour le mariage.

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
