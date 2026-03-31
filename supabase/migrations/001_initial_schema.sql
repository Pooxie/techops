-- ============================================================
-- TechOps — Migration initiale
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

-- Hotels
CREATE TABLE IF NOT EXISTS hotels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT NOT NULL,
  adresse     TEXT,
  etoiles     INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users (étend auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  role        TEXT CHECK (role IN ('technicien', 'dt')) NOT NULL,
  actif       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SET Catégories
CREATE TABLE IF NOT EXISTS set_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  ordre       INTEGER DEFAULT 0
);

-- SET Contrôles
CREATE TABLE IF NOT EXISTS set_controles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                  UUID REFERENCES hotels(id) ON DELETE CASCADE,
  categorie_id              UUID REFERENCES set_categories(id) ON DELETE SET NULL,
  nom                       TEXT NOT NULL,
  type_intervenant          TEXT CHECK (type_intervenant IN ('BC', 'SA', 'INT')),
  periodicite_mois          INTEGER NOT NULL,
  prestataire               TEXT,
  date_derniere_visite      DATE,
  date_prochaine            DATE,
  statut                    TEXT CHECK (statut IN ('ok', 'alerte', 'retard')) DEFAULT 'ok',
  non_conformites           INTEGER DEFAULT 0,
  non_conformites_restantes INTEGER DEFAULT 0,
  document_url              TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Rondes
CREATE TABLE IF NOT EXISTS rondes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID REFERENCES hotels(id) ON DELETE CASCADE,
  technicien_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  type            TEXT CHECK (type IN ('ouverture', 'fermeture')) NOT NULL,
  date_heure      TIMESTAMPTZ DEFAULT NOW(),
  donnees         JSONB NOT NULL DEFAULT '{}',
  observations    TEXT,
  photo_url       TEXT,
  signature       TEXT,
  hors_norme      BOOLEAN DEFAULT FALSE,
  validee         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Interventions
CREATE TABLE IF NOT EXISTS interventions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id              UUID REFERENCES hotels(id) ON DELETE CASCADE,
  createur_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  assigne_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  titre                 TEXT NOT NULL,
  description           TEXT,
  zone                  TEXT,
  equipement            TEXT,
  priorite              TEXT CHECK (priorite IN ('normale', 'urgente')) DEFAULT 'normale',
  statut                TEXT CHECK (statut IN ('a_traiter', 'en_cours', 'cloturee')) DEFAULT 'a_traiter',
  origine               TEXT CHECK (origine IN ('terrain', 'reception', 'preventif', 'dt')),
  description_cloture   TEXT,
  signature_cloture     TEXT,
  cloturee_le           TIMESTAMPTZ,
  cloturee_par          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Stocks
CREATE TABLE IF NOT EXISTS stocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  categorie   TEXT,
  quantite    INTEGER DEFAULT 0,
  seuil_mini  INTEGER DEFAULT 0,
  fournisseur TEXT,
  reference   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Pièces utilisées par intervention
CREATE TABLE IF NOT EXISTS intervention_pieces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
  stock_id        UUID REFERENCES stocks(id) ON DELETE SET NULL,
  quantite        INTEGER NOT NULL
);

-- Non-conformités
CREATE TABLE IF NOT EXISTS non_conformites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID REFERENCES hotels(id) ON DELETE CASCADE,
  set_controle_id UUID REFERENCES set_controles(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  gravite         TEXT CHECK (gravite IN ('mineure', 'majeure')) DEFAULT 'mineure',
  statut          TEXT CHECK (statut IN ('ouverte', 'en_cours', 'levee')) DEFAULT 'ouverte',
  assignee_a      UUID REFERENCES users(id) ON DELETE SET NULL,
  date_cible      DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  lue         BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE hotels              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_controles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- Politique d'isolation par hôtel
-- Chaque utilisateur connecté ne voit que les données de son hôtel

CREATE POLICY "hotel_isolation" ON set_categories
  USING (hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid()));

CREATE POLICY "hotel_isolation" ON set_controles
  USING (hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid()));

CREATE POLICY "hotel_isolation" ON rondes
  USING (hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid()));

CREATE POLICY "hotel_isolation" ON interventions
  USING (hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid()));

CREATE POLICY "hotel_isolation" ON stocks
  USING (hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid()));

CREATE POLICY "hotel_isolation" ON non_conformites
  USING (hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid()));

CREATE POLICY "hotel_isolation" ON notifications
  USING (hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid())
         AND user_id = auth.uid());

-- Users : chaque utilisateur voit les membres de son hôtel
CREATE POLICY "hotel_isolation" ON users
  USING (hotel_id = (SELECT hotel_id FROM users u WHERE u.id = auth.uid()));

-- Hotels : un utilisateur voit son hôtel uniquement
CREATE POLICY "hotel_isolation" ON hotels
  USING (id = (SELECT hotel_id FROM users WHERE id = auth.uid()));

-- Intervention_pieces : accessible via l'intervention (même hôtel)
CREATE POLICY "hotel_isolation" ON intervention_pieces
  USING (
    intervention_id IN (
      SELECT id FROM interventions
      WHERE hotel_id = (SELECT hotel_id FROM users WHERE id = auth.uid())
    )
  );


-- ============================================================
-- 3. SEED — DONNÉES INITIALES SOFITEL H0587
-- ============================================================

-- Hôtel
INSERT INTO hotels (id, nom, adresse, etoiles)
VALUES (
  '00000000-0000-0000-0000-000000000587',
  'Sofitel Golfe d''Ajaccio Thalasso Sea & Spa',
  'Route des Sanguinaires, 20000 Ajaccio',
  5
)
ON CONFLICT (id) DO NOTHING;

-- 12 catégories SET
INSERT INTO set_categories (hotel_id, nom, ordre) VALUES
  ('00000000-0000-0000-0000-000000000587', 'Commission de Sécurité',    1),
  ('00000000-0000-0000-0000-000000000587', 'Installations électriques', 2),
  ('00000000-0000-0000-0000-000000000587', 'Incendie',                  3),
  ('00000000-0000-0000-0000-000000000587', 'Formation',                 4),
  ('00000000-0000-0000-0000-000000000587', 'Aération / CTA',            5),
  ('00000000-0000-0000-0000-000000000587', 'Installations Thermiques',  6),
  ('00000000-0000-0000-0000-000000000587', 'Chaufferie',                7),
  ('00000000-0000-0000-0000-000000000587', 'Appareils de Levage',       8),
  ('00000000-0000-0000-0000-000000000587', 'Appareils de Cuisson',      9),
  ('00000000-0000-0000-0000-000000000587', 'Installations de Gaz',     10),
  ('00000000-0000-0000-0000-000000000587', 'Piscine / Thalasso / Spa', 11),
  ('00000000-0000-0000-0000-000000000587', 'Accessibilité PMR',        12)
ON CONFLICT DO NOTHING;
