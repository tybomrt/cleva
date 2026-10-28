/* ==========================================================================
   Contenu de la messagerie (énigme QR code).
   C'est le seul fichier à modifier pour changer les messages.

   Types de messages :
     { from, time, text: '...' }                       → bulle texte
     { from, time, emoji: '👌' }                       → gros emoji sans bulle
     { from, time, audio, duration, transcript }       → message vocal
       - audio      : chemin du fichier (m4a/mp3, mono, ~24-32 kbps)
       - duration   : durée en secondes, affichée avant le chargement du son
       - transcript : texte révélé par le bouton « Transcrire »

   Conversations (dans l'ordre de la liste) :
     - title   : nom affiché
     - icon    : emoji (conversation de groupe)   OU   with: 'id_personne' (1 à 1, prend sa photo)
     - unread  : nombre de messages non lus → pastille bleue dans la liste
   Ligne « N messages non lus » : { unreadMarker: true } (la pastille de la liste est calculée d'après elle).
   Séparateur de date dans un fil : { day: 'Hier' } (ou 'Lundi', '14 oct.', "Aujourd'hui").
   La liste affiche l'heure si le dernier message est d'aujourd'hui, sinon ce libellé.
   Groupes : members: [...] → avatar composé de 2 membres + leurs prénoms sous le titre.
   Personnes : avatar (photo) OU initials + color (pastille colorée) ; online: true → point vert.
   Photos des contacts : Unsplash (licence Unsplash, usage libre), recadrées en 144 px.
     maman 1566616213894-2d4e1baee5d8 · sarah 1580489944761-15a19d654956 · lea 1548382131-e0ebb1f0cdea
     thomas 1568602471122-7832951cc4c5 · kevin 1583264277168-58ceba4b84e7 · yanis 1522529599102-193c0d76b5b6
     hugo 1592234789031-94bf65f630ed · papi 1635594798220-ee1ac90d41c1 · tonton 1758691030490-fe1cb6c972ce
   ========================================================================== */

window.MESSAGES_DATA = {
  people: {
    me:       { name: 'Moi',   avatar: '/m/r8w3k2/img/me.jpg' },
    man:      { name: 'Lucas', avatar: '/m/r8w3k2/img/man.jpg' },
    woman:    { name: 'Clara', avatar: '/m/r8w3k2/img/woman.jpg' },
    maman:    { name: 'Maman',   avatar: '/m/r8w3k2/img/maman.jpg' },
    sarah:    { name: 'Sarah',   avatar: '/m/r8w3k2/img/sarah.jpg', online: true },
    tata:     { name: 'Tata Brigitte', initials: 'B', color: '#B9D7B0' },
    tonton:   { name: 'Tonton Gérard', avatar: '/m/r8w3k2/img/tonton.jpg' },
    hugo:     { name: 'Hugo',    avatar: '/m/r8w3k2/img/hugo.jpg' },
    thomas:   { name: 'Thomas',  avatar: '/m/r8w3k2/img/thomas.jpg' },
    kevin:    { name: 'Kevin',   avatar: '/m/r8w3k2/img/kevin.jpg' },
    yanis:    { name: 'Yanis',   avatar: '/m/r8w3k2/img/yanis.jpg' },
    alex:     { name: 'Alex',    initials: 'A',  color: '#D7C4A8' },
    lea:      { name: 'Léa',     avatar: '/m/r8w3k2/img/lea.jpg', online: true },
    papi:     { name: 'Papi',    avatar: '/m/r8w3k2/img/papi.jpg' },
    dentiste: { name: 'Cabinet Dr Morel', initials: 'DM', color: '#BFD3DE' },
    antoine:  { name: 'Antoine', initials: 'A',  color: '#C8D9A6' },
  },

  conversations: [
    {
      id: 'le-grand-jour',
      title: 'Le grand jour',
      icon: '💍',
      // La pastille de non-lus est calculée à partir de la ligne { unreadMarker: true }.
      messages: [
        // ---- Historique déjà lu : du contexte, AUCUN indice sur les prestataires ----
        { day: 'Jeudi' },
        { from: 'woman', time: '12:15', text: 'J-2 !!! 😱' },
        { from: 'man',   time: '12:17', text: 'On est prêts. Enfin je crois.' },
        { from: 'me',    time: '12:30', text: 'Merci les témoins ❤️ Vous êtes les meilleurs' },
        { from: 'woman', time: '12:31', text: 'On sait 😌' },
        { from: 'woman', time: '21:40', text: "Petite question : les alliances, c'est toi qui les gardes jusqu'à la cérémonie ?" },
        { from: 'me',    time: '21:52', text: "Non, c'est Lucas. Je suis capable de les oublier quelque part 😅" },
        { from: 'man',   time: '21:53', text: "Mission acceptée. Je dors avec s'il le faut 💍" },
        { day: 'Hier' },
        { from: 'woman', time: '10:14', text: 'Météo pour demain : 24 °C et grand soleil ☀️' },
        { from: 'me',    time: '10:16', text: "J'ose pas y croire" },
        { from: 'man',   time: '10:20', text: "J'ai vérifié sur 3 applis, c'est confirmé 🤞" },
        { from: 'woman', time: '19:30', text: 'Discours des témoins : terminé. Il y aura des larmes. Et peut-être quelques dossiers 😇' },
        { from: 'me',    time: '19:42', text: "J'ai peur" },
        { from: 'man',   time: '19:43', text: 'Tu peux' },
        { from: 'woman', time: '21:04', text: "Demain c'est le grand jour !! 🥂" },
        { from: 'man',   time: '21:05', text: "J'en dors déjà plus" },
        { from: 'me',    time: '21:12', text: 'Merci de gérer les prestataires demain, je vais avoir la tête ailleurs 😅' },
        { from: 'woman', time: '21:13', text: "T'inquiète, on s'occupe de tout" },
        { from: 'man',   time: '21:13', text: 'On te tient au courant ici' },
        { day: "Aujourd'hui" },
        { from: 'me',    time: '8:02',  text: "C'est le grand jour 🥹 Merci pour tout les amis" },
        { from: 'man',   time: '8:03',  text: 'Profite ❤️' },

        // ---- Ligne « messages non lus » : les joueurs lisent à partir d'ici ----
        // Règle : AUCUN message de 'me' en dessous.
        { unreadMarker: true },
        { from: 'man',   time: '9:26',  text: "Les gars, le coiffeur vient d'arriver. Vous descendez ?" },
        { from: 'woman', time: '9:27',  text: "Déjà ? Je croyais que c'était le photographe en premier" },
        { from: 'man',   time: '9:27',  text: "Non, c'est juste inversé sur le planning 🙈" },
        { from: 'woman', time: '9:32',  text: 'Ahah, pas grave !' },
        { from: 'woman', time: '9:33',  text: "Et la fleuriste, on l'attend à quelle heure déjà ?" },
        {
          from: 'man',
          time: '9:39',
          audio: '/m/r8w3k2/audio/lucas-00.m4a',
          duration: 9,
          transcript: "La fleuriste est déjà venue hier, elle a déjà tout installé. Tu peux aller voir la salle, c'est vraiment super beau ! J'ai juste oublié de la rayer du programme.",
        },
        { from: 'man',   time: '15:12', text: 'Tout se passe bien de ton côté ?' },
        { from: 'woman', time: '15:23', text: "Oui, tous les prestataires sont arrivés à l'heure" },
        { from: 'woman', time: '15:23', text: 'Sauf la babysitter' },
        { from: 'woman', time: '15:24', text: 'Elle est coincée dans les bouchons' },
        { from: 'woman', time: '15:24', text: 'Elle devrait être là avant le début de la cérémonie' },
        { from: 'man',   time: '15:25', emoji: '👌' },
        // Vocaux de Lucas (enregistrements réels), transcrits automatiquement puis relus.
        {
          from: 'man',
          time: '15:32',
          audio: '/m/r8w3k2/audio/lucas-01.m4a',
          duration: 9,
          transcript: "Les gars, j'ai une mauvaise nouvelle. Je viens d'avoir le DJ au téléphone : il va pas pouvoir venir, il est cloué au lit avec 39 de fièvre.",
        },
        {
          from: 'man',
          time: '15:33',
          audio: '/m/r8w3k2/audio/lucas-02.m4a',
          duration: 19,
          transcript: "Mais vous inquiétez pas, je suis l'homme de la situation ! Je viens de parler avec le chanteur et il n'a rien de prévu ce soir, donc il peut rester toute la soirée pour faire l'animation. Il a déjà tout le matériel dans son camion, donc en fait il y a absolument rien à aller chercher, rien à louer en plus. Tout est OK !",
        },
        { from: 'woman', time: '15:46', text: 'Tu gères !' },
      ],
    },

    // --- Le reste du téléphone : conversations du quotidien, pour le réalisme ---
    {
      id: 'maman',
      title: 'Maman',
      with: 'maman',
      messages: [
        { day: 'Mardi' },
        { from: 'maman', time: '19:12', text: 'Coucou mon cœur, tu passes dimanche ?' },
        { from: 'maman', time: '19:12', text: 'Ton père fait son gigot' },
        { from: 'me',    time: '20:47', text: "Je pourrai pas dimanche, je t'avais dit 😅" },
        { from: 'maman', time: '20:49', text: "Ah oui c'est vrai. Bon ben le dimanche d'après alors" },
        { from: 'maman', time: '20:49', text: 'Je congèle le gigot' },
        { from: 'me',    time: '20:50', text: 'On congèle pas un gigot cuit maman' },
        { from: 'maman', time: '20:58', text: 'Ton père dit que si.' },
        { day: 'Hier' },
        { from: 'maman', time: '8:03',  text: 'Le chat a encore ramené un lézard dans la salle de bain' },
        { from: 'maman', time: '8:03',  text: 'Vivant.' },
        { from: 'me',    time: '8:31',  text: '😂😂😂' },
        { from: 'maman', time: '21:15', text: 'Tu as bien préparé tes affaires pour demain ?' },
        { from: 'me',    time: '21:40', text: 'Oui maman 🙄' },
        { day: "Aujourd'hui" },
        { from: 'maman', time: '14:02', text: "N'oublie pas de manger un truc avant la cérémonie, je te connais 😘" },
      ],
    },
    {
      id: 'sarah',
      title: 'Sarah',
      with: 'sarah',
      messages: [
        { day: 'Mercredi' },
        { from: 'sarah', time: '22:10', text: "T'as fini la saison 2 ???" },
        { from: 'me',    time: '22:11', text: 'Non pas encore, me spoile pas' },
        { from: 'sarah', time: '22:11', text: 'Je dis rien' },
        { from: 'sarah', time: '22:12', text: "Mais l'épisode 6 😶" },
        { from: 'me',    time: '22:12', text: 'SARAH' },
        { day: 'Jeudi' },
        { from: 'sarah', time: '12:30', text: "J'ai trouvé une recette de tarte tatin de ouf, on la fait la semaine pro ?" },
        { from: 'me',    time: '13:05', text: "Oui !! Mais c'est toi qui fais la pâte" },
        { from: 'sarah', time: '13:06', text: 'Marché conclu 🤝' },
        { day: "Aujourd'hui" },
        { from: 'sarah', time: '11:20', text: 'Je vais être en retard de 10 min, ma voiture fait un bruit bizarre' },
        { from: 'sarah', time: '11:21', text: 'Genre un bruit de dragon' },
        { from: 'me',    time: '11:24', text: 'Classique. Envoie une photo du dragon' },
      ],
    },
    {
      id: 'famille',
      title: 'La famille',
      icon: '🏡',
      members: ['tata', 'tonton', 'hugo'],
      messages: [
        { day: 'Lundi' },
        { from: 'tata',  time: '9:14',  text: 'Bonjour à tous ! Je vous souhaite une excellente semaine ☀️' },
        { from: 'tata',  time: '9:14',  text: '🌻🌻🌻' },
        { from: 'tonton', time: '12:30', text: "Il va pleuvoir toute la semaine d'après la météo" },
        { from: 'hugo',  time: '12:41', text: 'Merci tonton pour cette bonne nouvelle' },
        { day: 'Mercredi' },
        { from: 'tata',  time: '18:02', text: 'Pour Noël, on fait ça le 24 ou le 25 ? Répondez avant dimanche svp 🎄' },
        { from: 'me',    time: '18:30', text: 'Le 24 pour moi ✅' },
        { from: 'hugo',  time: '23:47', text: 'Je demande à Camille et je te dis' },
        { day: 'Hier' },
        { from: 'tonton', time: '19:05', text: 'Quelqu’un sait comment on enlève le mode avion ?' },
        { from: 'tata',  time: '19:40', text: 'Gérard, tu es en train d’écrire sur le groupe. Donc ça marche.' },
        { from: 'tonton', time: '19:41', text: 'Ah oui.' },
        { from: 'me',    time: '19:45', text: '😂' },
        { from: 'hugo',  time: '19:46', text: 'Légendaire' },
      ],
    },
    {
      id: 'thomas',
      title: 'Thomas Boulot',
      with: 'thomas',
      messages: [
        { day: 'Mardi' },
        { from: 'thomas', time: '10:02', text: "T'es en télétravail aujourd'hui ?" },
        { from: 'me',     time: '10:05', text: 'Oui, pourquoi ?' },
        { from: 'thomas', time: '10:06', text: 'La machine à café est en panne, je voulais juste partager ma douleur' },
        { from: 'me',     time: '10:06', text: 'Courage 🫡' },
        { day: 'Hier' },
        { from: 'thomas', time: '16:40', text: "T'as vu le mail de Nadia pour la réunion de lundi ?" },
        { from: 'me',     time: '16:52', text: 'Oui, elle veut qu’on présente les chiffres du trimestre' },
        { from: 'thomas', time: '16:53', text: 'On se fait un point vite fait lundi à 9h ?' },
        { from: 'me',     time: '17:10', text: 'Ok pour 9h' },
        { from: 'thomas', time: '17:52', text: 'Top. Et profite bien de ton week-end !' },
      ],
    },
    {
      id: 'five',
      title: 'Five du jeudi',
      icon: '⚽',
      members: ['kevin', 'yanis', 'alex'],
      messages: [
        { day: 'Mardi' },
        { from: 'kevin', time: '12:00', text: 'Five jeudi 20h, qui est chaud ?' },
        { from: 'yanis', time: '12:03', text: 'Présent' },
        { from: 'alex',  time: '12:15', text: 'Moi aussi' },
        { from: 'me',    time: '12:40', text: 'Go' },
        { from: 'kevin', time: '18:22', text: 'On est 9, il manque 1 joueur' },
        { from: 'kevin', time: '18:22', text: "Quelqu'un a un pote ?" },
        { from: 'yanis', time: '18:30', text: 'Mon cousin peut venir mais il joue en Crocs' },
        { from: 'kevin', time: '18:31', text: 'On prend' },
        { day: 'Jeudi' },
        { from: 'alex',  time: '22:14', text: 'Belle victoire les gars 💪' },
        { from: 'kevin', time: '22:15', text: '8-6, la remontada' },
        { from: 'yanis', time: '22:16', text: 'Le cousin en Crocs homme du match' },
      ],
    },
    {
      id: 'lea',
      title: 'Léa',
      with: 'lea',
      messages: [
        { day: '16 oct.' },
        { from: 'lea', time: '20:11', text: "Pour l'anniv de maman on lui offre quoi ?" },
        { from: 'me',  time: '20:30', text: 'Un week-end ? Elle parle que de la Bretagne' },
        { from: 'lea', time: '20:31', text: 'Bonne idée. On partage à deux ?' },
        { from: 'me',  time: '20:31', text: 'Ok 👍' },
        { day: 'Mercredi' },
        { from: 'lea', time: '13:45', text: "J'ai trouvé une petite maison à Saint-Malo, vue sur la mer, c'est parfait non ?" },
        { from: 'me',  time: '14:10', text: 'Trop bien ! Réserve, je te fais un virement ce soir' },
        { from: 'lea', time: '14:11', text: 'Tu dis ça à chaque fois 🙃' },
        { from: 'me',  time: '21:02', text: 'Virement fait 😇' },
        { from: 'lea', time: '21:05', text: 'Miracle' },
      ],
    },
    {
      id: 'papi',
      title: 'Papi',
      with: 'papi',
      messages: [
        { day: '18 oct.' },
        { from: 'papi', time: '16:20', text: "Bonjour c'est papi. J'ai un nouveau téléphone." },
        { from: 'papi', time: '16:21', text: 'Mamie dit que je dois t’envoyer un message pour essayer' },
        { from: 'me',   time: '16:45', text: 'Coucou papi ! Ça marche très bien 😊' },
        { from: 'papi', time: '16:52', text: 'Comment on fait les petits bonhommes jaunes' },
        { from: 'me',   time: '16:53', text: 'Les émojis ? Tu appuies sur le petit visage en bas du clavier' },
        { from: 'papi', time: '17:30', text: '😀😃😄😁😆😅🤣😂🙂🙃' },
        { from: 'papi', time: '17:31', text: 'Ça marche.' },
        { day: 'Lundi' },
        { from: 'papi', time: '10:05', text: 'Je mets la cravate rouge ou la bleue ?' },
        { from: 'me',   time: '10:31', text: 'La bleue papi, comme on a dit 😄' },
        { from: 'papi', time: '10:32', text: 'Je mettrai la rouge alors.' },
      ],
    },
    {
      id: 'dentiste',
      title: 'Cabinet Dr Morel',
      with: 'dentiste',
      messages: [
        { day: '21 oct.' },
        { from: 'dentiste', time: '9:00', text: 'Cabinet du Dr Morel : rappel de votre rendez-vous le 4 novembre à 9h15. En cas d’empêchement, merci de prévenir 48h à l’avance au 01 23 45 67 89.' },
      ],
    },
    {
      id: 'antoine',
      title: 'Antoine (vélo)',
      with: 'antoine',
      messages: [
        { day: '12 oct.' },
        { from: 'antoine', time: '18:20', text: 'Bonjour, le vélo est toujours disponible ?' },
        { from: 'me',      time: '18:45', text: 'Bonjour, oui toujours !' },
        { from: 'antoine', time: '18:46', text: '150 € c’est négociable ?' },
        { from: 'me',      time: '18:50', text: 'Je peux descendre à 140' },
        { from: 'antoine', time: '18:52', text: 'Ok pour 140. Je peux passer samedi vers 10h ?' },
        { from: 'me',      time: '18:53', text: "Parfait, je vous envoie l'adresse" },
        { day: '14 oct.' },
        { from: 'antoine', time: '10:48', text: 'Merci encore, il roule super bien 🚲' },
        { from: 'me',      time: '11:02', text: 'Avec plaisir, bonne route !' },
      ],
    },
  ],

  // Journal d'appels (onglet Appels), du plus récent au plus ancien.
  // type : 'missed' (manqué), 'in' (entrant), 'out' (sortant) ; count : appels groupés ; length : durée.
  calls: [
    { who: 'sarah',  type: 'missed', day: "Aujourd'hui", time: '11:05' },
    { who: 'tonton', type: 'in',     day: 'Hier',      time: '19:02', length: '1 min' },
    { who: 'maman',  type: 'out',    day: 'Hier',      time: '18:42', length: '12 min' },
    { who: 'lea',    type: 'in',     day: 'Mercredi',  time: '20:15', length: '24 min' },
    { who: 'thomas', type: 'out',    day: 'Mardi',     time: '9:58',  length: '4 min' },
    { who: 'papi',   type: 'missed', day: 'Lundi',     time: '10:20', count: 2 },
    { who: 'papi',   type: 'out',    day: 'Lundi',     time: '10:34', length: '18 min' },
    { who: 'dentiste', type: 'in',   day: 'Lundi',     time: '9:12',  length: '2 min' },
  ],
};
