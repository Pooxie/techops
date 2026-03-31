-- ============================================================
-- TechOps — Migration 003 : Table dédiée prestataires
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── ÉTAPE 1 : Créer la table ──────────────────────────────

CREATE TABLE IF NOT EXISTS prestataires (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID REFERENCES hotels(id),
  nom           TEXT NOT NULL,
  contact_nom   TEXT,
  contact_tel   TEXT,
  contact_email TEXT,
  domaines      TEXT[],
  notes         TEXT,
  actif         BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prestataires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_prestataires" ON prestataires
  FOR ALL USING (true);

-- ─── ÉTAPE 2 : Insérer les prestataires réels H0587 ────────

INSERT INTO prestataires (hotel_id, nom, domaines)
SELECT
  '00000000-0000-0000-0000-000000000587',
  nom,
  domaines
FROM (VALUES
  ('APAVE Ajaccio',          ARRAY['Électricité', 'Ascenseurs', 'Gaz']),
  ('Corse Sécurité Incendie', ARRAY['Incendie']),
  ('CEMIS',                  ARRAY['SSI']),
  ('OTIS Ajaccio',           ARRAY['Ascenseurs']),
  ('Schindler Ajaccio',      ARRAY['Portes automatiques']),
  ('EGC',                    ARRAY['Chaufferie']),
  ('TECHNI-CLIM',            ARRAY['Froid']),
  ('MERZEAU',                ARRAY['Cuisine']),
  ('QUALIT''AIR',            ARRAY['Hottes cuisine']),
  ('BIPSI',                  ARRAY['Formation sécurité'])
) AS p(nom, domaines);

-- ─── ÉTAPE 3 : Ajouter prestataire_id dans set_controles ───

ALTER TABLE set_controles
  ADD COLUMN IF NOT EXISTS prestataire_id UUID REFERENCES prestataires(id);
