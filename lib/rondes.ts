export type OkNok = "ok" | "nok" | null;
export type RondeType = "ouverture" | "fermeture";
export type Transparence = "TB" | "B" | "M" | null;

export type BassinMeasure = {
  heure: string | null;
  transparence: Transparence;
  temperature: number | null;
  chlore_libre: number | null;
  chlore_total: number | null;
  chlore_combine: number | null;
};

export type BassinKey =
  | "piscine_hotel_matin"
  | "piscine_hotel_soir"
  | "piscine_institut_matin"
  | "piscine_institut_soir"
  | "pataugeoire_matin"
  | "pataugeoire_soir";

export type DonneesRonde = {
  piscine_hotel: {
    analyse_piscine: number | null;
    debordement: OkNok;
    temperature: number | null;
    niveau_chlore: number | null;
    concentration_chlore: number | null;
    controle_swan: OkNok;
  };
  piscine_institut: {
    analyse_piscine: number | null;
    gallet_pediluve: OkNok;
    debordement: OkNok;
  };
  institut: {
    mise_en_route_sauna: OkNok;
    blocs_autonomes: OkNok;
  };
  compresseur_air: {
    mise_en_route: OkNok;
    controle_huile: OkNok;
    pression_spilotairs: number | null;
  };
  compteurs: {
    pompe1_edm: number | null;
    pompe2_edm: number | null;
    emu_debit: number | null;
  };
  coffrets: {
    emu_controle_voyant: OkNok;
    relevage_controle_voyant: OkNok;
    puisard_controle_voyant: OkNok;
  };
  bache_piscine: {
    controle_niveau: OkNok;
  };
  piscine_thalasso: {
    niveau_hypochlorite: number | null;
    concentration_chlore: number | null;
    compteur_debit: number | null;
    numero_pompe_filtration: number | null;
    nettoyage_filtres: OkNok;
    temp_echange: number | null;
    compteur_remplissage: number | null;
    controle_swan: OkNok;
  };
  echangeur: {
    temp_bache_emc: number | null;
  };
  surpresseur: {
    p5_eau_mer_froide: number | null;
    p7c_affusions: number | null;
    p7b_douches_jet: number | null;
  };
  baches: {
    emf_controle_niveau: OkNok;
    emc_controle_niveau: OkNok;
  };
  groupe_eau: {
    temp_retour: number | null;
    pression_prim: number | null;
    pression_sec: number | null;
  };
  filtration_emf: {
    controle_uv: OkNok;
    pression_avant_filtre: number | null;
    pression_apres_filtre: number | null;
    controle_swan: OkNok;
    compteur_remplissage: number | null;
  };
  pompe_relevage: {
    compteur_p1: number | null;
    compteur_p2: number | null;
  };
  reception: {
    controle_arm_incendie: OkNok;
    eclairage_secours: OkNok;
  };
  chaufferie: {
    pression_circ_geg: number | null;
  };
  chaufferie_matin: {
    pompe_bouclage: OkNok;
    pression_prim_chaud: number | null;
    temp_primaire_echangeur: number | null;
    temp_depart_ecs: number | null;
    temp_ballon: number | null;
    temp_recyclage_thalasso_s3: number | null;
    temp_recyclage_hotel_s4: number | null;
    temp_recyclage_general_s5: number | null;
  };
  chaufferie_apres_midi: {
    temp_primaire_echangeur: number | null;
    temp_depart_ecs: number | null;
    temp_ballon: number | null;
    temp_recyclage_thalasso_s3: number | null;
    temp_recyclage_hotel_s4: number | null;
    temp_recyclage_general_s5: number | null;
  };
  cave_economat: {
    separateur_graisse: OkNok;
    coffret_relevage: OkNok;
    pompe_puisard: OkNok;
  };
  geg_hotel: {
    pression: number | null;
    temperature: number | null;
  };
  dry_cooling: {
    pression_circuit: number | null;
  };
  niveau_fuel: {
    niveau_fuel: number | null;
  };
  piscine_hotel_matin: BassinMeasure;
  piscine_hotel_soir: BassinMeasure;
  piscine_institut_matin: BassinMeasure;
  piscine_institut_soir: BassinMeasure;
  pataugeoire_matin: BassinMeasure;
  pataugeoire_soir: BassinMeasure;
};

export const DONNEES_DEFAULT: DonneesRonde = {
  piscine_hotel: {
    analyse_piscine: null,
    debordement: null,
    temperature: null,
    niveau_chlore: null,
    concentration_chlore: null,
    controle_swan: null,
  },
  piscine_institut: {
    analyse_piscine: null,
    gallet_pediluve: null,
    debordement: null,
  },
  institut: {
    mise_en_route_sauna: null,
    blocs_autonomes: null,
  },
  compresseur_air: {
    mise_en_route: null,
    controle_huile: null,
    pression_spilotairs: null,
  },
  compteurs: {
    pompe1_edm: null,
    pompe2_edm: null,
    emu_debit: null,
  },
  coffrets: {
    emu_controle_voyant: null,
    relevage_controle_voyant: null,
    puisard_controle_voyant: null,
  },
  bache_piscine: {
    controle_niveau: null,
  },
  piscine_thalasso: {
    niveau_hypochlorite: null,
    concentration_chlore: null,
    compteur_debit: null,
    numero_pompe_filtration: null,
    nettoyage_filtres: null,
    temp_echange: null,
    compteur_remplissage: null,
    controle_swan: null,
  },
  echangeur: {
    temp_bache_emc: null,
  },
  surpresseur: {
    p5_eau_mer_froide: null,
    p7c_affusions: null,
    p7b_douches_jet: null,
  },
  baches: {
    emf_controle_niveau: null,
    emc_controle_niveau: null,
  },
  groupe_eau: {
    temp_retour: null,
    pression_prim: null,
    pression_sec: null,
  },
  filtration_emf: {
    controle_uv: null,
    pression_avant_filtre: null,
    pression_apres_filtre: null,
    controle_swan: null,
    compteur_remplissage: null,
  },
  pompe_relevage: {
    compteur_p1: null,
    compteur_p2: null,
  },
  reception: {
    controle_arm_incendie: null,
    eclairage_secours: null,
  },
  chaufferie: {
    pression_circ_geg: null,
  },
  chaufferie_matin: {
    pompe_bouclage: null,
    pression_prim_chaud: null,
    temp_primaire_echangeur: null,
    temp_depart_ecs: null,
    temp_ballon: null,
    temp_recyclage_thalasso_s3: null,
    temp_recyclage_hotel_s4: null,
    temp_recyclage_general_s5: null,
  },
  chaufferie_apres_midi: {
    temp_primaire_echangeur: null,
    temp_depart_ecs: null,
    temp_ballon: null,
    temp_recyclage_thalasso_s3: null,
    temp_recyclage_hotel_s4: null,
    temp_recyclage_general_s5: null,
  },
  cave_economat: {
    separateur_graisse: null,
    coffret_relevage: null,
    pompe_puisard: null,
  },
  geg_hotel: {
    pression: null,
    temperature: null,
  },
  dry_cooling: {
    pression_circuit: null,
  },
  niveau_fuel: {
    niveau_fuel: null,
  },
  piscine_hotel_matin:    { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
  piscine_hotel_soir:     { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
  piscine_institut_matin: { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
  piscine_institut_soir:  { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
  pataugeoire_matin:      { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
  pataugeoire_soir:       { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
};

type ThresholdConfig =
  | { kind: "target"; value: number; tolerance?: number }
  | { kind: "max"; value: number }
  | { kind: "range"; min: number; max: number };

type RondeFieldBase = {
  id: string;
  label: string;
  path: readonly string[];
  showFor?: readonly RondeType[];
};

export type NumberFieldConfig = RondeFieldBase & {
  kind: "number";
  unit?: string;
  threshold?: ThresholdConfig;
  trend?: boolean;
};

export type BinaryFieldConfig = RondeFieldBase & {
  kind: "binary";
  labels?: {
    ok: string;
    nok: string;
  };
};

export type RondeFieldConfig = NumberFieldConfig | BinaryFieldConfig;

export type RondeSectionConfig = {
  id: string;
  title: string;
  showFor?: readonly RondeType[];
  fields: readonly RondeFieldConfig[];
};

type LegacyDonneesRonde = {
  piscine_thalasso?: {
    piscine_hotel?: {
      chlore_libre?: number | null;
      ph?: number | null;
      temperature?: number | null;
      nettoyage_filtres?: OkNok;
      niveau_hypochlorite?: number | null;
      compteur_debit?: number | null;
      controle_swan?: OkNok;
      debordement?: OkNok;
    };
    piscine_institut?: {
      chlore_libre?: number | null;
      ph?: number | null;
      temperature?: number | null;
      gallet_pediluves?: OkNok;
      debordement?: OkNok;
    };
    thalasso?: {
      temp_echange?: number | null;
      compteur_remplissage?: number | null;
      num_pompe_filtration?: number | null;
      nettoyage_filtres?: OkNok;
      controle_swan?: OkNok;
      compteur_remplissage_emf?: number | null;
    };
    surpresseur?: {
      p5_eau_mer?: number | null;
      p7c_affusions?: number | null;
      p7b_douches_jet?: number | null;
    };
    baches?: {
      piscine_niveau?: OkNok;
      emf_niveau?: OkNok;
      emc_niveau?: OkNok;
    };
    filtration_emf?: {
      controle_uv?: OkNok;
      pression_av_filtre?: number | null;
      pression_apres_filtre?: number | null;
      controle_swan?: OkNok;
    };
  };
  chaufferie_ecs?: {
    chaufferie?: {
      pompe_bouclage?: OkNok;
      pression_primaire?: number | null;
      temp_primaire_echangeur?: number | null;
      temp_depart_ecs?: number | null;
      temp_ballon?: number | null;
    };
    recyclage?: {
      temp_s3?: number | null;
      temp_s4?: number | null;
      temp_s5?: number | null;
    };
    geg_hotel?: {
      pression?: number | null;
      temperature?: number | null;
    };
    dry_cooling?: {
      pression_circuit?: OkNok;
      niveau_fuel?: number | null;
    };
    compteurs_pompes_edm?: {
      pompe1?: number | null;
      pompe2?: number | null;
    };
    compteur_emu?: {
      debit?: number | null;
      controle_voyants?: OkNok;
      controle_uv?: OkNok;
    };
  };
  technique_generale?: {
    reception?: {
      alarme_incendie?: OkNok;
      eclairage_secours?: OkNok;
      pression_geg?: OkNok;
    };
    cave_economat?: {
      separateur_graisse?: OkNok;
      coffret_relevage?: OkNok;
      pompe_puisard?: OkNok;
    };
    compresseur_air?: {
      mise_en_route?: OkNok;
      controle_huile?: OkNok;
      pression_spilotairs?: number | null;
    };
    coffret_relevage?: {
      controle_voyants?: OkNok;
    };
    coffret_puisard?: {
      controle_voyants?: OkNok;
    };
  };
};

export const RONDE_SECTIONS: readonly RondeSectionConfig[] = [
  {
    id: "section-1",
    title: "Section 1 - Piscine hotel",
    fields: [
      { id: "piscine-hotel-analyse", kind: "number", label: "Analyse piscine", path: ["piscine_hotel", "analyse_piscine"] },
      { id: "piscine-hotel-debordement", kind: "binary", label: "Debordement", path: ["piscine_hotel", "debordement"], labels: { ok: "Oui", nok: "Non" } },
    ],
  },
  {
    id: "section-2",
    title: "Section 2 - Piscine institut",
    fields: [
      { id: "piscine-institut-analyse", kind: "number", label: "Analyse piscine", path: ["piscine_institut", "analyse_piscine"] },
      { id: "piscine-institut-gallet", kind: "binary", label: "Gallet pediluve", path: ["piscine_institut", "gallet_pediluve"], labels: { ok: "Oui", nok: "Non" } },
      { id: "piscine-institut-debordement", kind: "binary", label: "Debordement", path: ["piscine_institut", "debordement"], labels: { ok: "Oui", nok: "Non" } },
    ],
  },
  {
    id: "section-3",
    title: "Section 3 - Institut",
    fields: [
      { id: "institut-sauna", kind: "binary", label: "Mise en route sauna", path: ["institut", "mise_en_route_sauna"], labels: { ok: "Oui", nok: "Non" } },
      { id: "institut-blocs", kind: "binary", label: "Blocs autonomes", path: ["institut", "blocs_autonomes"] },
    ],
  },
  {
    id: "section-4",
    title: "Section 4 - Compresseur air",
    fields: [
      { id: "compresseur-mise-route", kind: "binary", label: "Mise en route", path: ["compresseur_air", "mise_en_route"], labels: { ok: "Oui", nok: "Non" } },
      { id: "compresseur-controle-huile", kind: "binary", label: "Controle huile", path: ["compresseur_air", "controle_huile"] },
      { id: "compresseur-pression-spilotairs", kind: "number", label: "Pression circuit spilotairs", path: ["compresseur_air", "pression_spilotairs"], unit: "bar", threshold: { kind: "target", value: 1, tolerance: 0.05 }, trend: true },
    ],
  },
  {
    id: "section-5",
    title: "Section 5 - Compteurs",
    fields: [
      { id: "compteurs-pompe-1", kind: "number", label: "Compteur horaire Pompe 1 EdM", path: ["compteurs", "pompe1_edm"], unit: "h" },
      { id: "compteurs-pompe-2", kind: "number", label: "Compteur horaire Pompe 2 EdM", path: ["compteurs", "pompe2_edm"], unit: "h" },
      { id: "compteurs-emu-debit", kind: "number", label: "Compteur EMU debit", path: ["compteurs", "emu_debit"], unit: "m3/h" },
    ],
  },
  {
    id: "section-6",
    title: "Section 6 - Coffrets",
    fields: [
      { id: "coffrets-emu-voyant", kind: "binary", label: "Coffret EMU - Controle voyant", path: ["coffrets", "emu_controle_voyant"], labels: { ok: "Fait", nok: "Non fait" } },
    ],
  },
  {
    id: "section-7",
    title: "Section 7 - Bache piscine",
    fields: [
      { id: "bache-piscine-niveau", kind: "binary", label: "Controle niveau", path: ["bache_piscine", "controle_niveau"] },
    ],
  },
  {
    id: "section-8",
    title: "Section 8 - Piscine thalasso",
    fields: [
      { id: "thalasso-hypochlorite", kind: "number", label: "Niveau hypochlorite (L)", path: ["piscine_thalasso", "niveau_hypochlorite"], unit: "L" },
      { id: "thalasso-concentration-chlore", kind: "number", label: "Concentration chlore", path: ["piscine_thalasso", "concentration_chlore"], unit: "mg/L", threshold: { kind: "range", min: 0.4, max: 1.4 } },
      { id: "thalasso-debit", kind: "number", label: "Compteur debit", path: ["piscine_thalasso", "compteur_debit"], unit: "m3/h" },
      { id: "thalasso-pompe", kind: "number", label: "N° pompe filtration", path: ["piscine_thalasso", "numero_pompe_filtration"] },
      { id: "thalasso-nettoyage", kind: "binary", label: "Nettoyage filtres", path: ["piscine_thalasso", "nettoyage_filtres"], labels: { ok: "Fait", nok: "Non fait" } },
      { id: "thalasso-temp-echange", kind: "number", label: "T° echange piscine", path: ["piscine_thalasso", "temp_echange"], unit: "°C", threshold: { kind: "max", value: 32 }, trend: true },
      { id: "thalasso-remplissage", kind: "number", label: "Compteur remplissage", path: ["piscine_thalasso", "compteur_remplissage"] },
      { id: "thalasso-swan", kind: "binary", label: "Controle SWAN", path: ["piscine_thalasso", "controle_swan"] },
    ],
  },
  {
    id: "section-9",
    title: "Section 9 - Echangeur",
    fields: [
      { id: "echangeur-bache-emc", kind: "number", label: "T° bache EMC", path: ["echangeur", "temp_bache_emc"], unit: "°C", threshold: { kind: "target", value: 40, tolerance: 0.2 }, trend: true },
    ],
  },
  {
    id: "section-10",
    title: "Section 10 - Surpresseur",
    fields: [
      { id: "surpresseur-p5", kind: "number", label: "P5 Eau de Mer Froide", path: ["surpresseur", "p5_eau_mer_froide"], unit: "bar" },
      { id: "surpresseur-p7c", kind: "number", label: "P7c Affusions", path: ["surpresseur", "p7c_affusions"], unit: "bar" },
      { id: "surpresseur-p7b", kind: "number", label: "P7b Douches a jet", path: ["surpresseur", "p7b_douches_jet"], unit: "bar" },
    ],
  },
  {
    id: "section-11",
    title: "Section 11 - Baches",
    fields: [
      { id: "baches-emf", kind: "binary", label: "Bache EMF - Controle niveau", path: ["baches", "emf_controle_niveau"] },
      { id: "baches-emc", kind: "binary", label: "Bache EMC - Controle niveau", path: ["baches", "emc_controle_niveau"] },
    ],
  },
  {
    id: "section-12",
    title: "Section 12 - Groupe eau",
    fields: [
      { id: "groupe-eau-temp-retour", kind: "number", label: "Temp retour", path: ["groupe_eau", "temp_retour"], unit: "°C" },
      { id: "groupe-eau-pression-prim", kind: "number", label: "Pression Prim", path: ["groupe_eau", "pression_prim"], unit: "bar", threshold: { kind: "target", value: 1, tolerance: 0.05 }, trend: true },
      { id: "groupe-eau-pression-sec", kind: "number", label: "Pression Sec", path: ["groupe_eau", "pression_sec"], unit: "bar", threshold: { kind: "target", value: 2, tolerance: 0.05 }, trend: true },
    ],
  },
  {
    id: "section-13",
    title: "Section 13 - Filtration EMF",
    fields: [
      { id: "filtration-emf-uv", kind: "binary", label: "Controle UV EMF", path: ["filtration_emf", "controle_uv"] },
      { id: "filtration-emf-avant", kind: "number", label: "Pression avant filtre", path: ["filtration_emf", "pression_avant_filtre"], unit: "bar" },
      { id: "filtration-emf-apres", kind: "number", label: "Pression apres filtre", path: ["filtration_emf", "pression_apres_filtre"], unit: "bar" },
      { id: "filtration-emf-swan", kind: "binary", label: "Controle SWAN", path: ["filtration_emf", "controle_swan"] },
      { id: "filtration-emf-remplissage", kind: "number", label: "Compteur remplissage", path: ["filtration_emf", "compteur_remplissage"] },
    ],
  },
  {
    id: "section-14",
    title: "Section 14 - Piscine hotel (suite)",
    fields: [
      { id: "piscine-hotel-temperature", kind: "number", label: "Temperature", path: ["piscine_hotel", "temperature"], unit: "°C" },
      { id: "piscine-hotel-niveau-chlore", kind: "number", label: "Niveau chlore (L)", path: ["piscine_hotel", "niveau_chlore"], unit: "L" },
      { id: "piscine-hotel-concentration-chlore", kind: "number", label: "Concentration chlore", path: ["piscine_hotel", "concentration_chlore"], unit: "mg/L", threshold: { kind: "range", min: 0.4, max: 1.4 } },
      { id: "piscine-hotel-swan", kind: "binary", label: "Controle SWAN", path: ["piscine_hotel", "controle_swan"] },
    ],
  },
  {
    id: "section-15",
    title: "Section 15 - Pompe relevage",
    fields: [
      { id: "pompe-relevage-p1", kind: "number", label: "Compteur P1", path: ["pompe_relevage", "compteur_p1"], unit: "h" },
      { id: "pompe-relevage-p2", kind: "number", label: "Compteur P2", path: ["pompe_relevage", "compteur_p2"], unit: "h" },
    ],
  },
  {
    id: "section-16",
    title: "Section 16 - Reception",
    fields: [
      { id: "reception-arm-incendie", kind: "binary", label: "Controle ARM incendie", path: ["reception", "controle_arm_incendie"] },
      { id: "reception-eclairage", kind: "binary", label: "Eclairage de secours", path: ["reception", "eclairage_secours"] },
    ],
  },
  {
    id: "section-17",
    title: "Section 17 - Chaufferie",
    fields: [
      { id: "chaufferie-circ-geg", kind: "number", label: "Pression circ GEG", path: ["chaufferie", "pression_circ_geg"], unit: "bar", threshold: { kind: "target", value: 2, tolerance: 0.05 }, trend: true },
    ],
  },
  {
    id: "section-18",
    title: "Section 18 - Chaufferie matin",
    showFor: ["ouverture"],
    fields: [
      { id: "chaufferie-matin-pompe-bouclage", kind: "binary", label: "Pompe de bouclage", path: ["chaufferie_matin", "pompe_bouclage"] },
      { id: "chaufferie-matin-pression-prim", kind: "number", label: "Pression prim chaud", path: ["chaufferie_matin", "pression_prim_chaud"], unit: "bar", threshold: { kind: "target", value: 2, tolerance: 0.05 }, trend: true },
      { id: "chaufferie-matin-temp-primaire", kind: "number", label: "T° primaire echangeur", path: ["chaufferie_matin", "temp_primaire_echangeur"], unit: "°C" },
      { id: "chaufferie-matin-temp-ecs", kind: "number", label: "T° depart ECS", path: ["chaufferie_matin", "temp_depart_ecs"], unit: "°C", trend: true },
      { id: "chaufferie-matin-temp-ballon", kind: "number", label: "T° ballon", path: ["chaufferie_matin", "temp_ballon"], unit: "°C" },
      { id: "chaufferie-matin-s3", kind: "number", label: "Temp recyclage thalasso S3", path: ["chaufferie_matin", "temp_recyclage_thalasso_s3"], unit: "°C" },
      { id: "chaufferie-matin-s4", kind: "number", label: "Temp recyclage Hotel S4", path: ["chaufferie_matin", "temp_recyclage_hotel_s4"], unit: "°C" },
      { id: "chaufferie-matin-s5", kind: "number", label: "Temp recyclage General S5", path: ["chaufferie_matin", "temp_recyclage_general_s5"], unit: "°C" },
    ],
  },
  {
    id: "section-19",
    title: "Section 19 - Chaufferie apres-midi",
    showFor: ["fermeture"],
    fields: [
      { id: "chaufferie-apm-temp-primaire", kind: "number", label: "T° primaire echangeur", path: ["chaufferie_apres_midi", "temp_primaire_echangeur"], unit: "°C" },
      { id: "chaufferie-apm-temp-ecs", kind: "number", label: "T° depart ECS", path: ["chaufferie_apres_midi", "temp_depart_ecs"], unit: "°C", trend: true },
      { id: "chaufferie-apm-temp-ballon", kind: "number", label: "T° ballon", path: ["chaufferie_apres_midi", "temp_ballon"], unit: "°C" },
      { id: "chaufferie-apm-s3", kind: "number", label: "Temp recyclage thalasso S3", path: ["chaufferie_apres_midi", "temp_recyclage_thalasso_s3"], unit: "°C" },
      { id: "chaufferie-apm-s4", kind: "number", label: "Temp recyclage Hotel S4", path: ["chaufferie_apres_midi", "temp_recyclage_hotel_s4"], unit: "°C" },
      { id: "chaufferie-apm-s5", kind: "number", label: "Temp recyclage General S5", path: ["chaufferie_apres_midi", "temp_recyclage_general_s5"], unit: "°C" },
    ],
  },
  {
    id: "section-20",
    title: "Section 20 - Cave economat",
    fields: [
      { id: "cave-separateur", kind: "binary", label: "Separateur graisse", path: ["cave_economat", "separateur_graisse"] },
      { id: "cave-coffret", kind: "binary", label: "Coffret de relevage", path: ["cave_economat", "coffret_relevage"] },
      { id: "cave-pompe-puisard", kind: "binary", label: "Pompe puisard", path: ["cave_economat", "pompe_puisard"] },
    ],
  },
  {
    id: "section-21",
    title: "Section 21 - GEG hotel",
    fields: [
      { id: "geg-pression", kind: "number", label: "Pression GEG", path: ["geg_hotel", "pression"], unit: "bar", trend: true },
      { id: "geg-temperature", kind: "number", label: "Temperature GEG", path: ["geg_hotel", "temperature"], unit: "°C" },
    ],
  },
  {
    id: "section-22",
    title: "Section 22 - Dry cooling",
    fields: [
      { id: "dry-cooling-pression", kind: "number", label: "Pression circuit", path: ["dry_cooling", "pression_circuit"], unit: "bar", threshold: { kind: "target", value: 1.5, tolerance: 0.05 }, trend: true },
    ],
  },
  {
    id: "section-23",
    title: "Section 23 - Niveau fuel",
    fields: [
      { id: "fuel-niveau", kind: "number", label: "Niveau fuel", path: ["niveau_fuel", "niveau_fuel"], unit: "L", trend: true },
    ],
  },
] as const;

const LIST_SUMMARY_FIELD_IDS: Record<RondeType, readonly string[]> = {
  ouverture: [
    "piscine-hotel-analyse",
    "piscine-hotel-debordement",
    "thalasso-temp-echange",
    "chaufferie-matin-temp-ecs",
    "geg-pression",
    "fuel-niveau",
  ],
  fermeture: [
    "piscine-hotel-analyse",
    "piscine-hotel-debordement",
    "thalasso-temp-echange",
    "chaufferie-apm-temp-ecs",
    "geg-pression",
    "fuel-niveau",
  ],
};

const DETAIL_TREND_FIELD_IDS: Record<RondeType, readonly string[]> = {
  ouverture: [
    "compresseur-pression-spilotairs",
    "thalasso-temp-echange",
    "echangeur-bache-emc",
    "groupe-eau-pression-prim",
    "groupe-eau-pression-sec",
    "chaufferie-circ-geg",
    "chaufferie-matin-pression-prim",
    "chaufferie-matin-temp-ecs",
    "dry-cooling-pression",
    "fuel-niveau",
  ],
  fermeture: [
    "compresseur-pression-spilotairs",
    "thalasso-temp-echange",
    "echangeur-bache-emc",
    "groupe-eau-pression-prim",
    "groupe-eau-pression-sec",
    "chaufferie-circ-geg",
    "chaufferie-apm-temp-ecs",
    "dry-cooling-pression",
    "fuel-niveau",
  ],
};

const DASHBOARD_TREND_FIELD_IDS: Record<RondeType, readonly string[]> = {
  ouverture: [
    "thalasso-temp-echange",
    "chaufferie-matin-temp-ecs",
    "fuel-niveau",
  ],
  fermeture: [
    "thalasso-temp-echange",
    "chaufferie-apm-temp-ecs",
    "fuel-niveau",
  ],
};

const FIELD_BY_ID = new Map<string, RondeFieldConfig>(
  RONDE_SECTIONS.flatMap((section) => section.fields).map((field) => [field.id, field]),
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch as T) ?? base;
  }

  const output: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    const baseValue = (base as Record<string, unknown>)[key];
    const patchValue = patch[key];
    if (patchValue === undefined) {
      output[key] = baseValue;
      continue;
    }
    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      output[key] = deepMerge(baseValue, patchValue);
      continue;
    }
    output[key] = patchValue;
  }
  return output as T;
}

function isNewShape(raw: unknown): raw is Partial<DonneesRonde> {
  return isPlainObject(raw) && "piscine_hotel" in raw;
}

function targetMatches(value: number, target: number, tolerance = 0.001) {
  return Math.abs(value - target) <= tolerance;
}

function thresholdAlert(threshold: ThresholdConfig, value: number | null) {
  if (value === null) return false;
  if (threshold.kind === "max") return value > threshold.value;
  if (threshold.kind === "range") return value < threshold.min || value > threshold.max;
  return !targetMatches(value, threshold.value, threshold.tolerance);
}

export function cloneDefaultDonnees(): DonneesRonde {
  return JSON.parse(JSON.stringify(DONNEES_DEFAULT)) as DonneesRonde;
}

export function getVisibleRondeSections(type: RondeType): readonly RondeSectionConfig[] {
  return RONDE_SECTIONS.filter((section) => !section.showFor || section.showFor.includes(type));
}

export function getRondeFieldById(id: string): RondeFieldConfig | undefined {
  return FIELD_BY_ID.get(id);
}

export function getListSummaryFields(type: RondeType): RondeFieldConfig[] {
  return LIST_SUMMARY_FIELD_IDS[type]
    .map((id) => getRondeFieldById(id))
    .filter((field): field is RondeFieldConfig => Boolean(field));
}

export function getDetailTrendFields(type: RondeType): NumberFieldConfig[] {
  return DETAIL_TREND_FIELD_IDS[type]
    .map((id) => getRondeFieldById(id))
    .filter((field): field is NumberFieldConfig => field?.kind === "number");
}

export function getDashboardTrendFields(type: RondeType): NumberFieldConfig[] {
  return DASHBOARD_TREND_FIELD_IDS[type]
    .map((id) => getRondeFieldById(id))
    .filter((field): field is NumberFieldConfig => field?.kind === "number");
}

export function getFieldValue(data: DonneesRonde, path: readonly string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!isPlainObject(current)) return null;
    return current[key];
  }, data);
}

export function setFieldValue(data: DonneesRonde, path: readonly string[], value: number | OkNok | null): DonneesRonde {
  const next = cloneDefaultDonnees();
  const merged = deepMerge(next, data);
  const cloned = JSON.parse(JSON.stringify(merged)) as DonneesRonde;

  let cursor: Record<string, unknown> = cloned as unknown as Record<string, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[path[path.length - 1]] = value;
  return cloned;
}

export function formatThresholdHint(field: NumberFieldConfig): string | null {
  if (!field.threshold) return null;
  if (field.threshold.kind === "max") {
    return `Max ${field.threshold.value}${field.unit ? ` ${field.unit}` : ""}`;
  }
  if (field.threshold.kind === "range") {
    return `${field.threshold.min}-${field.threshold.max}${field.unit ? ` ${field.unit}` : ""}`;
  }
  return `Cible ${field.threshold.value}${field.unit ? ` ${field.unit}` : ""}`;
}

export function fieldHasAlert(field: RondeFieldConfig, data: DonneesRonde): boolean {
  const rawValue = getFieldValue(data, field.path);
  if (field.kind === "binary") return rawValue === "nok";
  return thresholdAlert(field.threshold ?? { kind: "range", min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY }, rawValue as number | null);
}

export function sectionHasAlert(section: RondeSectionConfig, data: DonneesRonde): boolean {
  return section.fields.some((field) => fieldHasAlert(field, data));
}

export function formatFieldValue(field: RondeFieldConfig, rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined || rawValue === "") return "—";
  if (field.kind === "binary") {
    const labels = field.labels ?? { ok: "OK", nok: "NOK" };
    return rawValue === "ok" ? labels.ok : labels.nok;
  }
  return `${rawValue}${field.unit ? ` ${field.unit}` : ""}`;
}

export function getFieldStatus(field: RondeFieldConfig, data: DonneesRonde): "empty" | "ok" | "alert" {
  const rawValue = getFieldValue(data, field.path);
  if (rawValue === null || rawValue === undefined || rawValue === "") return "empty";
  return fieldHasAlert(field, data) ? "alert" : "ok";
}

export function detectHorsNorme(donnees: DonneesRonde): boolean {
  return getVisibleRondeSections("ouverture").some((section) => sectionHasAlert(section, donnees))
    || getVisibleRondeSections("fermeture").some((section) => sectionHasAlert(section, donnees));
}

function mapLegacyToNew(raw: LegacyDonneesRonde): DonneesRonde {
  return {
    piscine_hotel: {
      analyse_piscine: raw.piscine_thalasso?.piscine_hotel?.ph ?? null,
      debordement: raw.piscine_thalasso?.piscine_hotel?.debordement ?? null,
      temperature: raw.piscine_thalasso?.piscine_hotel?.temperature ?? null,
      niveau_chlore: raw.piscine_thalasso?.piscine_hotel?.chlore_libre ?? null,
      concentration_chlore: null,
      controle_swan: raw.piscine_thalasso?.piscine_hotel?.controle_swan ?? null,
    },
    piscine_institut: {
      analyse_piscine: raw.piscine_thalasso?.piscine_institut?.ph ?? null,
      gallet_pediluve: raw.piscine_thalasso?.piscine_institut?.gallet_pediluves ?? null,
      debordement: raw.piscine_thalasso?.piscine_institut?.debordement ?? null,
    },
    institut: {
      mise_en_route_sauna: null,
      blocs_autonomes: null,
    },
    compresseur_air: {
      mise_en_route: raw.technique_generale?.compresseur_air?.mise_en_route ?? null,
      controle_huile: raw.technique_generale?.compresseur_air?.controle_huile ?? null,
      pression_spilotairs: raw.technique_generale?.compresseur_air?.pression_spilotairs ?? null,
    },
    compteurs: {
      pompe1_edm: raw.chaufferie_ecs?.compteurs_pompes_edm?.pompe1 ?? null,
      pompe2_edm: raw.chaufferie_ecs?.compteurs_pompes_edm?.pompe2 ?? null,
      emu_debit: raw.chaufferie_ecs?.compteur_emu?.debit ?? null,
    },
    coffrets: {
      emu_controle_voyant: raw.chaufferie_ecs?.compteur_emu?.controle_voyants ?? null,
      relevage_controle_voyant: raw.technique_generale?.coffret_relevage?.controle_voyants ?? null,
      puisard_controle_voyant: raw.technique_generale?.coffret_puisard?.controle_voyants ?? null,
    },
    bache_piscine: {
      controle_niveau: raw.piscine_thalasso?.baches?.piscine_niveau ?? null,
    },
    piscine_thalasso: {
      niveau_hypochlorite: null,
      concentration_chlore: null,
      compteur_debit: null,
      numero_pompe_filtration: raw.piscine_thalasso?.thalasso?.num_pompe_filtration ?? null,
      nettoyage_filtres: raw.piscine_thalasso?.thalasso?.nettoyage_filtres ?? null,
      temp_echange: raw.piscine_thalasso?.thalasso?.temp_echange ?? null,
      compteur_remplissage: raw.piscine_thalasso?.thalasso?.compteur_remplissage ?? null,
      controle_swan: raw.piscine_thalasso?.thalasso?.controle_swan ?? null,
    },
    echangeur: {
      temp_bache_emc: null,
    },
    surpresseur: {
      p5_eau_mer_froide: raw.piscine_thalasso?.surpresseur?.p5_eau_mer ?? null,
      p7c_affusions: raw.piscine_thalasso?.surpresseur?.p7c_affusions ?? null,
      p7b_douches_jet: raw.piscine_thalasso?.surpresseur?.p7b_douches_jet ?? null,
    },
    baches: {
      emf_controle_niveau: raw.piscine_thalasso?.baches?.emf_niveau ?? null,
      emc_controle_niveau: raw.piscine_thalasso?.baches?.emc_niveau ?? null,
    },
    groupe_eau: {
      temp_retour: null,
      pression_prim: null,
      pression_sec: null,
    },
    filtration_emf: {
      controle_uv: raw.piscine_thalasso?.filtration_emf?.controle_uv ?? null,
      pression_avant_filtre: raw.piscine_thalasso?.filtration_emf?.pression_av_filtre ?? null,
      pression_apres_filtre: raw.piscine_thalasso?.filtration_emf?.pression_apres_filtre ?? null,
      controle_swan: raw.piscine_thalasso?.filtration_emf?.controle_swan ?? null,
      compteur_remplissage: raw.piscine_thalasso?.thalasso?.compteur_remplissage_emf ?? null,
    },
    pompe_relevage: {
      compteur_p1: null,
      compteur_p2: null,
    },
    reception: {
      controle_arm_incendie: raw.technique_generale?.reception?.alarme_incendie ?? null,
      eclairage_secours: raw.technique_generale?.reception?.eclairage_secours ?? null,
    },
    chaufferie: {
      pression_circ_geg: null,
    },
    chaufferie_matin: {
      pompe_bouclage: raw.chaufferie_ecs?.chaufferie?.pompe_bouclage ?? null,
      pression_prim_chaud: raw.chaufferie_ecs?.chaufferie?.pression_primaire ?? null,
      temp_primaire_echangeur: raw.chaufferie_ecs?.chaufferie?.temp_primaire_echangeur ?? null,
      temp_depart_ecs: raw.chaufferie_ecs?.chaufferie?.temp_depart_ecs ?? null,
      temp_ballon: raw.chaufferie_ecs?.chaufferie?.temp_ballon ?? null,
      temp_recyclage_thalasso_s3: raw.chaufferie_ecs?.recyclage?.temp_s3 ?? null,
      temp_recyclage_hotel_s4: raw.chaufferie_ecs?.recyclage?.temp_s4 ?? null,
      temp_recyclage_general_s5: raw.chaufferie_ecs?.recyclage?.temp_s5 ?? null,
    },
    chaufferie_apres_midi: {
      temp_primaire_echangeur: raw.chaufferie_ecs?.chaufferie?.temp_primaire_echangeur ?? null,
      temp_depart_ecs: raw.chaufferie_ecs?.chaufferie?.temp_depart_ecs ?? null,
      temp_ballon: raw.chaufferie_ecs?.chaufferie?.temp_ballon ?? null,
      temp_recyclage_thalasso_s3: raw.chaufferie_ecs?.recyclage?.temp_s3 ?? null,
      temp_recyclage_hotel_s4: raw.chaufferie_ecs?.recyclage?.temp_s4 ?? null,
      temp_recyclage_general_s5: raw.chaufferie_ecs?.recyclage?.temp_s5 ?? null,
    },
    cave_economat: {
      separateur_graisse: raw.technique_generale?.cave_economat?.separateur_graisse ?? null,
      coffret_relevage: raw.technique_generale?.cave_economat?.coffret_relevage ?? null,
      pompe_puisard: raw.technique_generale?.cave_economat?.pompe_puisard ?? null,
    },
    geg_hotel: {
      pression: raw.chaufferie_ecs?.geg_hotel?.pression ?? null,
      temperature: raw.chaufferie_ecs?.geg_hotel?.temperature ?? null,
    },
    dry_cooling: {
      pression_circuit: null,
    },
    niveau_fuel: {
      niveau_fuel: raw.chaufferie_ecs?.dry_cooling?.niveau_fuel ?? null,
    },
    piscine_hotel_matin:    { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
    piscine_hotel_soir:     { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
    piscine_institut_matin: { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
    piscine_institut_soir:  { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
    pataugeoire_matin:      { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
    pataugeoire_soir:       { heure: null, transparence: null, temperature: null, chlore_libre: null, chlore_total: null, chlore_combine: null },
  };
}

export function normalizeDonneesRonde(raw: unknown): DonneesRonde {
  if (isNewShape(raw)) {
    return deepMerge(cloneDefaultDonnees(), raw);
  }
  if (isPlainObject(raw)) {
    return deepMerge(cloneDefaultDonnees(), mapLegacyToNew(raw as LegacyDonneesRonde));
  }
  return cloneDefaultDonnees();
}

// ── Configuration des 3 bassins sanitaires ────────────────────────────────────

export type BassinConfig = {
  id: string;
  label: string;
  matinKey: BassinKey;
  soirKey: BassinKey;
  tempRange?: { min: number; max: number };
  tempMax?: number;
};

export const BASSINS_CONFIG: BassinConfig[] = [
  { id: "piscine_hotel",    label: "Piscine Hôtel",          matinKey: "piscine_hotel_matin",    soirKey: "piscine_hotel_soir",    tempRange: { min: 24, max: 30 } },
  { id: "piscine_institut", label: "Piscine Institut / SPA",  matinKey: "piscine_institut_matin", soirKey: "piscine_institut_soir", tempMax: 32 },
  { id: "pataugeoire",      label: "Pataugeoire",             matinKey: "pataugeoire_matin",      soirKey: "pataugeoire_soir",      tempRange: { min: 24, max: 30 } },
];

export function isTempBassinOk(config: BassinConfig, v: number | null): boolean {
  if (v === null) return true;
  if (config.tempMax !== undefined) return v <= config.tempMax;
  if (config.tempRange !== undefined) return v >= config.tempRange.min && v <= config.tempRange.max;
  return true;
}

export function isCloreLibreOk(v: number | null): boolean {
  return v === null || (v >= 0.4 && v <= 1.4);
}

export function isChloreComibineOk(v: number | null): boolean {
  return v === null || v < 0.6;
}

export function bassinMeasureHasAlert(config: BassinConfig, m: BassinMeasure): boolean {
  return !isTempBassinOk(config, m.temperature) || !isCloreLibreOk(m.chlore_libre) || !isChloreComibineOk(m.chlore_combine);
}
