-- Base des « dossiers » (mariages personnalisés des pages d'énigme /m/).
-- Hébergée sur Neon (projet cleva-dossiers). Aucune de ces données n'est dans le dépôt.

CREATE TABLE IF NOT EXISTS weddings (
  id              text PRIMARY KEY,          -- 22 caractères aléatoires (128 bits), jamais devinable
  wedding_date    date NOT NULL,             -- sert uniquement à la purge (date + 30 jours)
  marie1_prenom   text NOT NULL,
  marie1_nom      text NOT NULL,
  marie2_prenom   text NOT NULL,
  marie2_nom      text NOT NULL,
  temoin1_prenom  text NOT NULL,
  temoin2_prenom  text NOT NULL,
  cles            text[] NOT NULL,           -- [prénom1, nom1, prénom2, nom2] normalisés, pour la recherche
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weddings_cles_idx ON weddings USING gin (cles);

CREATE TABLE IF NOT EXISTS wedding_photos (
  wedding_id  text NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('marie1', 'marie2', 'temoin1', 'temoin2')),
  jpeg        bytea NOT NULL,                -- 144 × 144 px
  PRIMARY KEY (wedding_id, role)
);

-- Essais de l'écran de sélection, pour limiter le nombre de tentatives par adresse IP.
-- L'IP n'est jamais stockée en clair : seulement une empreinte (SHA-256 salée).
CREATE TABLE IF NOT EXISTS dossier_attempts (
  ip_hash  text NOT NULL,
  at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dossier_attempts_idx ON dossier_attempts (ip_hash, at);
