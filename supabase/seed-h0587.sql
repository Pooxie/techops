-- ============================================================
-- TechOps H0587 — Seed données SET Sofitel Golfe d'Ajaccio
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================
-- Idempotent : supprime et réinsère les contrôles à chaque run.
-- Hotel ID fixe : 00000000-0000-0000-0000-000000000587
-- ============================================================

DO $$
DECLARE
  h UUID := '00000000-0000-0000-0000-000000000587';
BEGIN

  -- Supprime les contrôles existants (idempotent)
  DELETE FROM set_controles WHERE hotel_id = h;

  -- Insère les contrôles en résolvant les catégories par nom
  INSERT INTO set_controles (
    hotel_id,
    categorie_id,
    nom,
    type_intervenant,
    periodicite_mois,
    prestataire,
    date_derniere_visite,
    date_prochaine,
    statut,
    non_conformites,
    non_conformites_restantes
  )
  SELECT
    h,
    sc.id,
    v.nom,
    v.type_intervenant,
    v.periodicite_mois::integer,
    v.prestataire,
    v.ddv::date,
    (v.ddv::date + (v.periodicite_mois::integer || ' months')::interval)::date,
    CASE
      WHEN (v.ddv::date + (v.periodicite_mois::integer || ' months')::interval)::date < CURRENT_DATE
        THEN 'retard'
      WHEN (v.ddv::date + (v.periodicite_mois::integer || ' months')::interval)::date < CURRENT_DATE + INTERVAL '30 days'
        THEN 'alerte'
      ELSE 'ok'
    END,
    v.nc::integer,
    v.ncr::integer
  FROM (VALUES

    -- ── COMMISSION DE SÉCURITÉ ────────────────────────────────────────────────
    ('Commission de Sécurité',
      'Commission de sécurité',                                    'BC',  '60', 'Préfecture Corse du Sud',             '2022-04-08',  '0',  '0'),

    -- ── INSTALLATIONS ÉLECTRIQUES ─────────────────────────────────────────────
    ('Installations électriques',
      'Contrôle installation électrique ERP Hôtel',               'BC',  '12', 'APAVE Ajaccio',                      '2024-12-17',  '0',  '0'),
    ('Installations électriques',
      'Contrôle installation électrique CDT Hôtel',               'BC',  '12', 'APAVE Ajaccio',                      '2024-12-17', '11',  '7'),
    ('Installations électriques',
      'Contrôle installation électrique Q18 Hôtel',               'BC',  '12', 'APAVE Ajaccio',                      '2024-12-17',  '0',  '0'),
    ('Installations électriques',
      'Contrôle installation électrique ERP Institut',            'BC',  '12', 'APAVE Ajaccio',                      '2024-12-17',  '0',  '0'),
    ('Installations électriques',
      'Contrôle installation électrique CDT Institut',            'BC',  '12', 'APAVE Ajaccio',                      '2024-12-17',  '3',  '3'),
    ('Installations électriques',
      'Contrôle installation électrique Q18 Institut',            'BC',  '12', 'APAVE Ajaccio',                      '2024-12-17',  '0',  '0'),

    -- ── INCENDIE ──────────────────────────────────────────────────────────────
    ('Incendie',
      'Contrôle extincteurs portatifs',                           'SA',  '12', 'Corse Sécurité Incendie',            '2025-02-18',  '0',  '0'),
    ('Incendie',
      'Contrôle poteaux incendie privé',                          'SA',  '12', 'Corse Sécurité Incendie',            '2025-02-18',  '0',  '0'),
    ('Incendie',
      'Contrôle désenfumage naturel',                             'INT', '12', 'Intern-BURESI Cyrille',              '2025-02-10',  '0',  '0'),
    ('Incendie',
      'Vérification clapets coupe-feu',                           'INT', '12', 'Intern-BURESI Cyrille',              '2024-07-15',  '0',  '0'),
    ('Incendie',
      'Contrôle SSI + désenfumage mécanique MS73/DF10',           'BC',  '36', 'APAVE Ajaccio',                      '2023-09-14',  '0',  '0'),
    ('Incendie',
      'Maintenance SSI',                                          'SA',  '12', 'CEMIS',                              '2024-12-11',  '0',  '0'),

    -- ── FORMATION ────────────────────────────────────────────────────────────
    ('Formation',
      'Formation utilisation SSI collaborateurs',                 'INT', '12', 'Intern-BURESI Cyrille',              '2022-11-18',  '0',  '0'),
    ('Formation',
      'Formation maniement extincteurs',                          'SA',  '12', 'BIPSI',                              '2022-03-21',  '0',  '0'),
    ('Formation',
      'Exercice évacuation externe GN8',                          'SA',  '12', 'BIPSI',                              '2024-06-21',  '0',  '0'),
    ('Formation',
      'Exercice évacuation interne GN8',                          'INT', '12', 'Direction Générale',                 '2024-06-21',  '0',  '0'),

    -- ── AÉRATION / CTA ───────────────────────────────────────────────────────
    ('Aération / CTA',
      'Maintenance centrales traitement air',                     'INT',  '6', 'Intern-BURESI Cyrille',              '2025-01-21',  '0',  '0'),

    -- ── INSTALLATIONS THERMIQUES ──────────────────────────────────────────────
    ('Installations Thermiques',
      'Contrôle étanchéité groupe froid CH58',                    'SA',  '12', 'TECHNI-CLIM',                        '2024-03-20',  '0',  '0'),

    -- ── CHAUFFERIE ────────────────────────────────────────────────────────────
    ('Chaufferie',
      'Entretien + contrôle combustion chaudières >400KW',        'SA',   '3', 'EGC',                                '2024-11-12',  '0',  '0'),
    ('Chaufferie',
      'Ramonage conduits fioul',                                  'SA',   '6', 'EGC',                                '2024-11-12',  '0',  '0'),
    ('Chaufferie',
      'Ramonage conduits hors fioul',                             'SA',  '12', 'EGC',                                '2024-02-12',  '0',  '0'),

    -- ── APPAREILS DE LEVAGE ───────────────────────────────────────────────────
    ('Appareils de Levage',
      'Maintenance portes automatiques et tambours rotatifs',     'SA',   '6', 'Schindler Ajaccio',                  '2025-02-12',  '0',  '0'),
    ('Appareils de Levage',
      'Maintenance portail automatique et barrière',              'SA',   '6', 'APAVE Ajaccio',                      '2024-09-19',  '0',  '0'),
    ('Appareils de Levage',
      'Contrôle technique quinquennal ascenseurs Hôtel',          'BC',  '60', 'APAVE Ajaccio',                      '2022-06-23',  '0',  '0'),
    ('Appareils de Levage',
      'Contrôle technique quinquennal ascenseurs Institut',       'BC',  '60', 'APAVE Ajaccio',                      '2022-06-23',  '0',  '0'),
    ('Appareils de Levage',
      'RVRE ascenseurs ERP',                                      'BC',  '60', 'APAVE Ajaccio',                      '2022-06-23',  '0',  '0'),
    ('Appareils de Levage',
      'Maintenance ascenseurs + parachute',                       'SA',   '6', 'OTIS Ajaccio',                       '2023-07-24',  '0',  '0'),
    ('Appareils de Levage',
      'Visite périodique annuelle ascenseurs (VPA)',              'BC',  '12', 'APAVE Ajaccio',                      '2024-07-04',  '0',  '0'),

    -- ── APPAREILS DE CUISSON ──────────────────────────────────────────────────
    ('Appareils de Cuisson',
      'Maintenance appareils de cuisson tous types',              'SA',  '12', 'MERZEAU',                            '2024-03-20',  '0',  '0'),
    ('Appareils de Cuisson',
      'Nettoyage hottes cuisine et cafétéria',                    'SA',   '6', 'QUALIT''AIR',                        '2025-02-03',  '0',  '0'),

    -- ── INSTALLATIONS DE GAZ ──────────────────────────────────────────────────
    ('Installations de Gaz',
      'Contrôle réseau gaz',                                      'BC',  '12', 'APAVE Ajaccio',                      '2024-10-25',  '0',  '0')

  ) AS v(cat_nom, nom, type_intervenant, periodicite_mois, prestataire, ddv, nc, ncr)
  JOIN set_categories sc ON sc.hotel_id = h AND sc.nom = v.cat_nom;

  RAISE NOTICE 'Import H0587 terminé — % contrôles insérés',
    (SELECT COUNT(*) FROM set_controles WHERE hotel_id = h);
END $$;


-- ── Vérification rapide ────────────────────────────────────────────────────────
SELECT
  sc.nom                AS categorie,
  COUNT(*)              AS nb_controles,
  COUNT(*) FILTER (WHERE c.statut = 'ok')     AS ok,
  COUNT(*) FILTER (WHERE c.statut = 'alerte') AS alerte,
  COUNT(*) FILTER (WHERE c.statut = 'retard') AS retard
FROM set_controles c
JOIN set_categories sc ON sc.id = c.categorie_id
WHERE c.hotel_id = '00000000-0000-0000-0000-000000000587'
GROUP BY sc.nom, sc.ordre
ORDER BY sc.ordre;
