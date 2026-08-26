/* ==========================================================================
   cleva. — configuration Tailwind (build CLI)

   Les couleurs sont en hex (et non en var(--brick-700)) pour que les
   modificateurs d'opacité fonctionnent : bg-brick-700/50, border-lin-200/60...
   Tailwind ne sait pas calculer une alpha à partir d'une custom property.
   La source de vérité reste /styles/tokens.css — garder les deux alignés.
   ========================================================================== */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './produit.html', './legal/*.html', './version-2.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Marcellus', 'Georgia', 'serif'],
        // Marcellus SC pour les sur-titres / labels — à charger dans le <link>
        label: ['"Marcellus SC"', 'Georgia', 'serif'],
      },

      colors: {
        brick: {
          50:  '#FEF9F6',
          100: '#F6F0ED',
          200: '#F5E0D7',
          300: '#F4CDBD',
          400: '#F3B8A2',
          500: '#EEA188',
          600: '#D87D65',
          700: '#BA5944', // couleur de marque
          800: '#964434',
          900: '#79382D',
          950: '#421D17',
        },
        lin: {
          50:  '#FCF9F8',
          100: '#F6F0ED',
          200: '#EBE3E0',
          300: '#DFD4D0',
          400: '#D3C4BF',
          500: '#C3B3AE',
          600: '#A59591',
          700: '#857673',
          800: '#6A5D5A',
          900: '#564B49',
          950: '#2F2826',
        },

        // Alias sémantiques — utiliser ceux-ci de préférence aux crans bruts.
        // bg-surface plutôt que bg-lin-100 : si la valeur change, un seul endroit.
        background: '#FFFFFF',
        ink: '#2F2826',            // texte principal    14.46 · AAA sur blanc
        'ink-soft': '#6A5D5A',     // texte secondaire    6.31 · AA
        surface: '#F6F0ED',        // cartes, bandes neutres (lin-100)
        'surface-accent': '#F5E0D7', // bandes teintées (brick-200) — 1.27 vs blanc
        line: '#EBE3E0',           // bordures            (lin-200)
        'line-strong': '#DFD4D0',  // champs de formulaire (lin-300)
        primary: '#BA5944',        // boutons             4.56 · AA avec du blanc
        'primary-hover': '#964434',
        'accent-text': '#964434',  // accent en TEXTE     6.62 · AA sur blanc
                                   // (jamais primary en texte : 4.56 seulement)
      },

      // Marcellus est une display : jamais en dessous de 24px.
      // Les tailles ci-dessous sont fluides, elles remplacent text-4xl & co.
      fontSize: {
        'display-sm': ['clamp(1.5rem, 3vw, 1.875rem)', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(1.875rem, 5vw, 2.75rem)', { lineHeight: '1.08', letterSpacing: '-0.022em' }],
        'display-lg': ['clamp(2.25rem, 7vw, 4rem)',     { lineHeight: '1.02', letterSpacing: '-0.025em' }],
      },

      borderRadius: {
        DEFAULT: '0.5rem', // 8px — plus sobre que les 16px du site actuel
      },
    },
  },
  plugins: [],
};
