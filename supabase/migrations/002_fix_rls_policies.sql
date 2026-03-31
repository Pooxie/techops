-- ============================================================
-- TechOps — Correction RLS (récursion infinie)
-- Problème : les policies interrogeaient la table users pour
--            obtenir le hotel_id, mais users a aussi une policy
--            → boucle infinie.
-- Solution : fonction SECURITY DEFINER qui bypass le RLS pour
--            lire le hotel_id de l'utilisateur courant.
-- ============================================================


-- 1. Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "hotel_isolation" ON hotels;
DROP POLICY IF EXISTS "hotel_isolation" ON users;
DROP POLICY IF EXISTS "hotel_isolation" ON set_categories;
DROP POLICY IF EXISTS "hotel_isolation" ON set_controles;
DROP POLICY IF EXISTS "hotel_isolation" ON rondes;
DROP POLICY IF EXISTS "hotel_isolation" ON interventions;
DROP POLICY IF EXISTS "hotel_isolation" ON stocks;
DROP POLICY IF EXISTS "hotel_isolation" ON intervention_pieces;
DROP POLICY IF EXISTS "hotel_isolation" ON non_conformites;
DROP POLICY IF EXISTS "hotel_isolation" ON notifications;


-- 2. Fonction SECURITY DEFINER : lit hotel_id sans déclencher le RLS
CREATE OR REPLACE FUNCTION auth_hotel_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT hotel_id FROM users WHERE id = auth.uid();
$$;


-- 3. Recréer toutes les policies en utilisant auth_hotel_id()

-- Hotels
CREATE POLICY "hotel_isolation" ON hotels
  USING (id = auth_hotel_id());

-- Users (on ne relit plus users dans la policy)
CREATE POLICY "hotel_isolation" ON users
  USING (hotel_id = auth_hotel_id());

-- SET Catégories
CREATE POLICY "hotel_isolation" ON set_categories
  USING (hotel_id = auth_hotel_id());

-- SET Contrôles
CREATE POLICY "hotel_isolation" ON set_controles
  USING (hotel_id = auth_hotel_id());

-- Rondes
CREATE POLICY "hotel_isolation" ON rondes
  USING (hotel_id = auth_hotel_id());

-- Interventions
CREATE POLICY "hotel_isolation" ON interventions
  USING (hotel_id = auth_hotel_id());

-- Stocks
CREATE POLICY "hotel_isolation" ON stocks
  USING (hotel_id = auth_hotel_id());

-- Non-conformités
CREATE POLICY "hotel_isolation" ON non_conformites
  USING (hotel_id = auth_hotel_id());

-- Notifications (filtre aussi par user_id)
CREATE POLICY "hotel_isolation" ON notifications
  USING (hotel_id = auth_hotel_id() AND user_id = auth.uid());

-- Intervention_pieces (accès via hotel de l'intervention)
CREATE POLICY "hotel_isolation" ON intervention_pieces
  USING (
    intervention_id IN (
      SELECT id FROM interventions WHERE hotel_id = auth_hotel_id()
    )
  );
