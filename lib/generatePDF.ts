import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient, getCurrentUserProfile } from "@/lib/supabase";

// ── Types internes ────────────────────────────────────────────────────────────

type SetControleRow = {
  nom: string;
  categorie: string;
  prestataire: string;
  date_prochaine: string;
  statut: "retard" | "alerte" | "ok";
};

type NCRow = {
  description: string;
  controle_nom: string;
  gravite: "majeure" | "mineure";
  responsable: string;
  date_cible: string;
};

type InterventionRow = {
  date: string;
  titre: string;
  chambre: string;
  technicien: string;
  statut: string;
};

type RondeRow = {
  date: string;
  type: string;
  technicien: string;
  anomalies: string;
};

type RapportData = {
  mois: string;
  kpis: {
    scoreConformite: number;
    totalControles: number;
    controlesOk: number;
    interventionsMois: number;
    ncOuvertes: number;
    ncLeveesMois: number;
    rondesMois: number;
  };
  setControles: SetControleRow[];
  nonConformites: NCRow[];
  interventions: InterventionRow[];
  rondes: RondeRow[];
};

// ── Fetch data ────────────────────────────────────────────────────────────────

export async function fetchRapportMensuelData(): Promise<RapportData> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Non authentifié");
  const hotelId = profile.hotel_id;

  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const debutMoisISO = debutMois.toISOString();

  const [setRes, ncRes, intRes, rondeRes, ncLeveeRes] = await Promise.all([
    supabase
      .from("set_controles")
      .select("nom, prestataire, date_prochaine, statut, set_categories(nom)")
      .eq("hotel_id", hotelId)
      .order("statut"),
    supabase
      .from("non_conformites")
      .select("description, gravite, action_owner_name, date_cible, controle:set_controles(nom)")
      .eq("hotel_id", hotelId)
      .eq("statut", "ouverte")
      .order("gravite"),
    supabase
      .from("interventions")
      .select("created_at, titre, numero_chambre, statut, assigne:users!assigne_id(prenom)")
      .eq("hotel_id", hotelId)
      .gte("created_at", debutMoisISO)
      .order("created_at", { ascending: false }),
    supabase
      .from("rondes")
      .select("date_heure, type, hors_norme, users(prenom)")
      .eq("hotel_id", hotelId)
      .gte("date_heure", debutMoisISO)
      .order("date_heure", { ascending: false }),
    supabase
      .from("non_conformites")
      .select("id", { count: "exact", head: true })
      .eq("hotel_id", hotelId)
      .eq("statut", "levee")
      .gte("levee_le", debutMoisISO),
  ]);

  const setControles: SetControleRow[] = (setRes.data ?? []).map((r) => ({
    nom: r.nom ?? "",
    categorie: (r.set_categories as unknown as { nom: string } | null)?.nom ?? "",
    prestataire: r.prestataire ?? "—",
    date_prochaine: r.date_prochaine
      ? new Date(r.date_prochaine).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    statut: (r.statut as "retard" | "alerte" | "ok") ?? "ok",
  }));

  const nonConformites: NCRow[] = (ncRes.data ?? []).map((r) => ({
    description: r.description ?? "",
    controle_nom: (r.controle as unknown as { nom: string } | null)?.nom ?? "—",
    gravite: (r.gravite as "majeure" | "mineure") ?? "mineure",
    responsable: r.action_owner_name ?? "—",
    date_cible: r.date_cible
      ? new Date(r.date_cible).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
      : "—",
  }));

  const interventions: InterventionRow[] = (intRes.data ?? []).map((r) => ({
    date: new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    titre: r.titre ?? "",
    chambre: r.numero_chambre ?? "—",
    technicien: (r.assigne as unknown as { prenom: string } | null)?.prenom ?? "—",
    statut: r.statut === "a_traiter" ? "À traiter" : r.statut === "en_cours" ? "En cours" : "Clôturée",
  }));

  const rondes: RondeRow[] = (rondeRes.data ?? []).map((r) => ({
    date: new Date(r.date_heure).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    type: r.type === "ouverture" ? "Ouverture" : "Fermeture",
    technicien: (r.users as unknown as { prenom: string } | null)?.prenom ?? "—",
    anomalies: r.hors_norme ? "Oui" : "Non",
  }));

  const totalControles = setControles.length;
  const controlesOk = setControles.filter((c) => c.statut === "ok").length;
  const scoreConformite = totalControles > 0 ? Math.round((controlesOk / totalControles) * 100) : 0;

  const moisLabel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return {
    mois: moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1),
    kpis: {
      scoreConformite,
      totalControles,
      controlesOk,
      interventionsMois: interventions.length,
      ncOuvertes: nonConformites.length,
      ncLeveesMois: ncLeveeRes.count ?? 0,
      rondesMois: rondes.length,
    },
    setControles,
    nonConformites,
    interventions,
    rondes,
  };
}

// ── Génération PDF ────────────────────────────────────────────────────────────

const BLUE: [number, number, number] = [37, 99, 235];
const INK: [number, number, number] = [29, 29, 31];
const SOFT: [number, number, number] = [110, 110, 115];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [245, 245, 247];

// statut colors [bg, text]
const COLOR_RETARD: [[number, number, number], [number, number, number]] = [[255, 241, 240], [180, 35, 24]];
const COLOR_ALERTE: [[number, number, number], [number, number, number]] = [[255, 245, 230], [176, 83, 9]];
const COLOR_OK: [[number, number, number], [number, number, number]] = [[240, 253, 244], [27, 127, 58]];
const COLOR_MAJEURE: [[number, number, number], [number, number, number]] = [[255, 241, 240], [180, 35, 24]];
const COLOR_MINEURE: [[number, number, number], [number, number, number]] = [[255, 245, 230], [176, 83, 9]];

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFillColor(...BLUE);
  doc.rect(14, y, doc.internal.pageSize.width - 28, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(text.toUpperCase(), 17, y + 4.8);
  return y + 7;
}

function addFooters(doc: jsPDF) {
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  const w = doc.internal.pageSize.width;
  const h = doc.internal.pageSize.height;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 225);
    doc.line(14, h - 12, w - 14, h - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SOFT);
    doc.text("TechOps — Sofitel Golfe d'Ajaccio", 14, h - 7);
    doc.text(`Page ${i} / ${pageCount}`, w / 2, h - 7, { align: "center" });
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, w - 14, h - 7, { align: "right" });
  }
}

export async function generateRapportPDF(): Promise<void> {
  const data = await fetchRapportMensuelData();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.width;
  let y = 0;

  // ── En-tête page 1 ──────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, w, 38, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text("Rapport Mensuel", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.mois, 14, 24);

  doc.setFontSize(8);
  doc.text("Sofitel Golfe d'Ajaccio", 14, 31);

  // TechOps badge top-right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TechOps", w - 14, 20, { align: "right" });

  y = 48;

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpiW = (w - 28 - 9) / 4;
  const kpis = [
    { label: "Conformité SET", value: `${data.kpis.scoreConformite}%`, sub: `${data.kpis.controlesOk}/${data.kpis.totalControles} contrôles` },
    { label: "Interventions", value: String(data.kpis.interventionsMois), sub: "ce mois" },
    { label: "NC levées", value: `${data.kpis.ncLeveesMois}/${data.kpis.ncOuvertes}`, sub: "levées / ouvertes" },
    { label: "Rondes", value: String(data.kpis.rondesMois), sub: "ce mois" },
  ];

  kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiW + 3);
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(x, y, kpiW, 22, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SOFT);
    doc.text(kpi.label.toUpperCase(), x + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text(kpi.value, x + 4, y + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SOFT);
    doc.text(kpi.sub, x + 4, y + 20);
  });

  y += 32;

  // ── SET Contrôles ────────────────────────────────────────────────────────────
  y = sectionTitle(doc, y, `Contrôles SET (${data.setControles.length})`);
  y += 2;

  const retard = data.setControles.filter((c) => c.statut === "retard");
  const alerte = data.setControles.filter((c) => c.statut === "alerte");
  const ok = data.setControles.filter((c) => c.statut === "ok");

  const buildSetRows = (rows: SetControleRow[]) =>
    rows.map((r) => [r.nom, r.categorie, r.prestataire, r.date_prochaine]);

  const setHead = [["Contrôle", "Catégorie", "Prestataire", "Échéance"]];
  const setColStyles = {
    0: { cellWidth: 60 },
    1: { cellWidth: 40 },
    2: { cellWidth: 40 },
    3: { cellWidth: 30 },
  };

  if (retard.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_RETARD[1]);
    doc.text(`En retard (${retard.length})`, 14, y + 4);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: setHead,
      body: buildSetRows(retard),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: INK, font: "helvetica" },
      headStyles: { fillColor: COLOR_RETARD[0], textColor: COLOR_RETARD[1], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fillColor: COLOR_RETARD[0] },
      columnStyles: setColStyles,
      theme: "plain",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  if (alerte.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_ALERTE[1]);
    doc.text(`Alerte (${alerte.length})`, 14, y + 4);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: setHead,
      body: buildSetRows(alerte),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: INK, font: "helvetica" },
      headStyles: { fillColor: COLOR_ALERTE[0], textColor: COLOR_ALERTE[1], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fillColor: COLOR_ALERTE[0] },
      columnStyles: setColStyles,
      theme: "plain",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  if (ok.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_OK[1]);
    doc.text(`À jour (${ok.length})`, 14, y + 4);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: setHead,
      body: buildSetRows(ok),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: INK, font: "helvetica" },
      headStyles: { fillColor: COLOR_OK[0], textColor: COLOR_OK[1], fontStyle: "bold", fontSize: 7.5 },
      bodyStyles: { fillColor: COLOR_OK[0] },
      columnStyles: setColStyles,
      theme: "plain",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // ── Page 2 — NC + Interventions ──────────────────────────────────────────────
  doc.addPage();
  y = 14;

  // NC ouvertes
  y = sectionTitle(doc, y, `Non-conformités ouvertes (${data.nonConformites.length})`);
  y += 2;

  if (data.nonConformites.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text("Aucune non-conformité ouverte", 14, y + 5);
    y += 12;
  } else {
    const majeures = data.nonConformites.filter((n) => n.gravite === "majeure");
    const mineures = data.nonConformites.filter((n) => n.gravite === "mineure");
    const ncHead = [["Description", "Contrôle SET", "Gravité", "Responsable", "Date cible"]];
    const ncColStyles = { 0: { cellWidth: 55 }, 1: { cellWidth: 45 }, 2: { cellWidth: 20 }, 3: { cellWidth: 35 }, 4: { cellWidth: 25 } };

    const ncGroups: Array<{ rows: NCRow[]; bg: [number,number,number]; fg: [number,number,number]; label: string }> = [
      { rows: majeures, bg: COLOR_MAJEURE[0], fg: COLOR_MAJEURE[1], label: `Majeures (${majeures.length})` },
      { rows: mineures, bg: COLOR_MINEURE[0], fg: COLOR_MINEURE[1], label: `Mineures (${mineures.length})` },
    ];

    for (const g of ncGroups) {
      if (g.rows.length === 0) continue;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...g.fg);
      doc.text(g.label, 14, y + 4);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: ncHead,
        body: g.rows.map((n) => [n.description, n.controle_nom, n.gravite === "majeure" ? "Majeure" : "Mineure", n.responsable, n.date_cible]),
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: INK, font: "helvetica", overflow: "linebreak" },
        headStyles: { fillColor: g.bg, textColor: g.fg, fontStyle: "bold", fontSize: 7.5 },
        bodyStyles: { fillColor: g.bg },
        columnStyles: ncColStyles,
        theme: "plain",
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    }
  }

  y += 4;

  // Interventions du mois
  y = sectionTitle(doc, y, `Interventions du mois (${data.interventions.length})`);
  y += 2;

  if (data.interventions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text("Aucune intervention ce mois", 14, y + 5);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Titre", "Chambre", "Technicien", "Statut"]],
      body: data.interventions.map((i) => [i.date, i.titre, i.chambre, i.technicien, i.statut]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: INK, font: "helvetica", overflow: "linebreak" },
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 65 }, 2: { cellWidth: 20 }, 3: { cellWidth: 30 }, 4: { cellWidth: 22 } },
      theme: "plain",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  // ── Page 3 — Rondes ──────────────────────────────────────────────────────────
  doc.addPage();
  y = 14;

  y = sectionTitle(doc, y, `Rondes du mois (${data.rondes.length})`);
  y += 2;

  if (data.rondes.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text("Aucune ronde ce mois", 14, y + 5);
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Type", "Technicien", "Anomalies"]],
      body: data.rondes.map((r) => [r.date, r.type, r.technicien, r.anomalies]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: INK, font: "helvetica" },
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 30 }, 2: { cellWidth: 50 }, 3: { cellWidth: 25 } },
      theme: "plain",
      didParseCell: (hookData) => {
        if (hookData.column.index === 3 && hookData.section === "body") {
          if (hookData.cell.raw === "Oui") {
            hookData.cell.styles.textColor = COLOR_RETARD[1];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  }

  // ── Footers sur toutes les pages ─────────────────────────────────────────────
  addFooters(doc);

  // ── Téléchargement ───────────────────────────────────────────────────────────
  const filename = `TechOps_Rapport_${data.mois.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
