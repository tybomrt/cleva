-- Base des « dossiers » (mariages personnalisés des pages d'énigme /m/).
-- Hébergée sur Neon (projet cleva-dossiers). Aucune de ces données n'est dans le dépôt.
-- Ce fichier peut être relancé sans risque sur une base existante (tout est « IF NOT EXISTS »).
--
-- Cycle de vie d'un mariage (règles dans api/_lib/admin-core.mjs) :
--   actif   : archived_at vide et échéance (expires_at) pas passée → reconnu par les pages d'énigme ;
--   archivé : à l'échéance (tâche quotidienne) ou à la main → plus reconnu, photos plus servies ;
--   supprimé définitivement 1 an après archived_at (tâche quotidienne), ou à la main depuis les archives.

CREATE TABLE IF NOT EXISTS weddings (
  id              text PRIMARY KEY,          -- 22 caractères aléatoires (128 bits), jamais devinable
  wedding_date    date NOT NULL,
  expires_at      date NOT NULL,             -- échéance : reconnu jusqu'au soir de ce jour (par défaut mariage + 30 j)
  archived_at     timestamptz,               -- vide = actif
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

-- Migration (novembre 2026) d'une base créée avant l'échéance et l'archivage : sans perte.
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS expires_at date;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS archived_at timestamptz;
UPDATE weddings SET expires_at = wedding_date + 30 WHERE expires_at IS NULL;
ALTER TABLE weddings ALTER COLUMN expires_at SET NOT NULL;

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

-- Sessions de la page d'administration. Seule l'empreinte du jeton est gardée (pas le jeton lui-même).
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  text PRIMARY KEY,
  expires_at  timestamptz NOT NULL
);
