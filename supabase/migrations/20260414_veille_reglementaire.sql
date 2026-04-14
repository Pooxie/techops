-- Module Veille Réglementaire
CREATE TABLE IF NOT EXISTS veille_reglementaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  titre TEXT NOT NULL,
  resume TEXT NOT NULL,
  source_url TEXT,
  source_nom TEXT,
  date_publication DATE,
  date_entree_vigueur DATE,
  domaine TEXT, -- 'Sécurité' | 'Environnement' | 'Technique' | 'Général'
  impact TEXT,  -- 'Fort' | 'Moyen' | 'Faible'
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE veille_reglementaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_veille"
ON veille_reglementaire FOR ALL USING (true);
