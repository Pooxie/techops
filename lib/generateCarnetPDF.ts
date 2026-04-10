import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BASSIN_LABELS,
  NEW_BASSIN_LABELS,
  type BassinRecord,
  type IncidentSanitaire,
} from "@/lib/supabase";

// ── Couleurs ──────────────────────────────────────────────────────────────────

const BLUE: [number,number,number]   = [37, 99, 235];
const CYAN: [number,number,number]   = [8, 145, 178];
const INK: [number,number,number]    = [29, 29, 31];
const SOFT: [number,number,number]   = [110, 110, 115];
const WHITE: [number,number,number]  = [255, 255, 255];
const GRAY: [number,number,number]   = [245, 245, 247];
const RED_BG: [number,number,number] = [254, 242, 242];
const RED_FG: [number,number,number] = [220, 38, 38];
const GRN_FG: [number,number,number] = [21, 128, 61];
const AMB_FG: [number,number,number] = [180, 83, 9];
const AMB_BG: [number,number,number] = [255, 251, 235];

type LastTable = { lastAutoTable: { finalY: number } };
function lastY(doc: jsPDF) {
  return (doc as unknown as LastTable).lastAutoTable.finalY;
}

function secHeader(doc: jsPDF, y: number, text: string, color: [number,number,number] = BLUE): number {
  const w = doc.internal.pageSize.width;
  doc.setFillColor(...color);
  doc.rect(14, y, w - 28, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(text.toUpperCase(), 17, y + 5);
  return y + 9;
}

function addFooters(doc: jsPDF) {
  const pages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  const w = doc.internal.pageSize.width;
  const h = doc.internal.pageSize.height;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 225);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SOFT);
    doc.text("TechOps — Sofitel Golfe d'Ajaccio Thalasso Sea & Spa", 14, h - 9);
    doc.text(`Page ${i} / ${pages}`, w / 2, h - 9, { align: "center" });
    doc.text("Document à conserver 3 ans — Art. D.1332-10 CSP", w - 14, h - 9, { align: "right" });
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Export principal ──────────────────────────────────────────────────────────

type BassinPDFId = "piscine_hotel" | "piscine_institut" | "pataugeoire";

const BASSIN_PDF_COLORS: Record<BassinPDFId, [number,number,number]> = {
  piscine_hotel:    BLUE,
  piscine_institut: CYAN,
  pataugeoire:      [22, 163, 74],
};

const BASSIN_PDF_SUBTITLES: Record<BassinPDFId, string> = {
  piscine_hotel:    "Eau de mer · Chlore libre 0,4–1,4 mg/L · Chlore combiné < 0,6 mg/L · T° 24–30°C",
  piscine_institut: "Eau de mer · Chlore libre 0,4–1,4 mg/L · Chlore combiné < 0,6 mg/L · T° ≤ 32°C",
  pataugeoire:      "Eau de mer · Chlore libre 0,4–1,4 mg/L · Chlore combiné < 0,6 mg/L · T° 24–30°C",
};

function clLibreAlert(v: number | null) { return v !== null && (v < 0.4 || v > 1.4); }
function clCombineAlert(v: number | null) { return v !== null && v >= 0.6; }

function addSignatureLine(doc: jsPDF, y: number) {
  const w = doc.internal.pageSize.width;
  const sh = Math.min(y, doc.internal.pageSize.height - 35);
  doc.setDrawColor(...SOFT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SOFT);
  doc.line(14, sh, 80, sh);
  doc.text("Signature du technicien responsable", 14, sh + 5);
  doc.line(w - 80, sh, w - 14, sh);
  doc.text("Visa responsable technique", w - 80, sh + 5);
}

export async function generateCarnetPDF(
  records: BassinRecord[],
  incidents: IncidentSanitaire[]
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.width;
  let y = 0;

  const allDates = records.map((r) => r.date).sort();
  const mois = allDates.length > 0
    ? new Date(allDates[0]).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisLabel = mois.charAt(0).toUpperCase() + mois.slice(1);

  // ── EN-TÊTE PAGE 1 ───────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, w, 46, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text("CARNET SANITAIRE — SURVEILLANCE DES EAUX DE PISCINE", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Sofitel Golfe d'Ajaccio Thalasso Sea & Spa", 14, 21);

  doc.setFontSize(8);
  doc.text("Conforme à l'arrêté du 26 mai 2021 — Art. D.1332-10 Code de la Santé Publique", 14, 28);
  doc.text("3 bassins : Piscine Hôtel · Piscine Institut/SPA · Pataugeoire — Relevés MATIN & SOIR", 14, 34);
  doc.text(`Période : ${moisLabel}  ·  Généré le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TechOps", w - 14, 21, { align: "right" });

  y = 54;

  // ── Rappel seuils ────────────────────────────────────────────────────────────
  y = secHeader(doc, y, "Seuils réglementaires — Arrêté du 26 mai 2021 (Art. D.1332-10 CSP)");

  autoTable(doc, {
    startY: y,
    head: [["Paramètre", "Seuil", "Unité", "Bassin concerné", "Référence"]],
    body: [
      ["Chlore libre", "0,4 — 1,4", "mg/L", "Tous bassins", "Art. D.1332-3 CSP"],
      ["Chlore combiné", "< 0,6", "mg/L", "Tous bassins", "Art. D.1332-3 CSP"],
      ["Température", "24–30°C (Hôtel/Pata.) / ≤ 32°C (Institut)", "°C", "Tous bassins", "Art. D.1332-3 CSP"],
      ["Transparence", "Bonne (TB) obligatoire", "—", "Tous bassins", "Art. D.1332-3 CSP"],
      ["pH (contrôle ARS)", "6,9 — 7,7", "—", "Prélèvements ARS", "Art. D.1332-3 CSP"],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3, textColor: INK, font: "helvetica" },
    headStyles: { fillColor: GRAY, textColor: SOFT, fontStyle: "bold", fontSize: 8 },
    columnStyles: { 0: { fontStyle: "bold" } },
    theme: "plain",
  });

  y = lastY(doc) + 10;

  // ── Résumé ───────────────────────────────────────────────────────────────────
  y = secHeader(doc, y, "Résumé de la période");

  const bassins: BassinPDFId[] = ["piscine_hotel", "piscine_institut", "pataugeoire"];
  const summaryRows = bassins.map((b) => {
    const bRecs = records.filter((r) => r.bassin === b);
    const alertes = bRecs.filter((r) => r.alerte).length;
    return [NEW_BASSIN_LABELS[b], String(bRecs.length), String(bRecs.length - alertes), String(alertes)];
  });

  autoTable(doc, {
    startY: y,
    head: [["Bassin", "Mesures enregistrées", "Sans alerte", "Alertes"]],
    body: summaryRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3, textColor: INK, font: "helvetica" },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    theme: "plain",
  });

  // ── PAGES 2-4 — UN TABLEAU PAR BASSIN ───────────────────────────────────────
  const HEAD = [
    "Date",
    "Heure M", "Cl libre M", "Cl total M", "Cl combiné M", "Temp M",
    "Heure S", "Cl libre S", "Cl total S", "Cl combiné S", "Temp S",
    "Transparence", "Conforme",
  ];

  const COL_W = {
    0: { cellWidth: 22 },   // Date
    1: { cellWidth: 15 },   // Heure M
    2: { cellWidth: 18 },   // Cl libre M
    3: { cellWidth: 18 },   // Cl total M
    4: { cellWidth: 18 },   // Cl combiné M
    5: { cellWidth: 16 },   // Temp M
    6: { cellWidth: 15 },   // Heure S
    7: { cellWidth: 18 },   // Cl libre S
    8: { cellWidth: 18 },   // Cl total S
    9: { cellWidth: 18 },   // Cl combiné S
    10: { cellWidth: 16 },  // Temp S
    11: { cellWidth: 20 },  // Transparence
    // 12: Conforme auto
  };

  for (const bassin of bassins) {
    doc.addPage();
    y = 14;

    const color = BASSIN_PDF_COLORS[bassin];
    y = secHeader(doc, y, `${NEW_BASSIN_LABELS[bassin].toUpperCase()} — ${BASSIN_PDF_SUBTITLES[bassin]}`, color);

    const sorted = records.filter((r) => r.bassin === bassin).sort((a, b) => a.date.localeCompare(b.date));

    const rows = sorted.map((r) => [
      fmtDate(r.date),
      r.matin_heure ?? "—",
      r.matin_chlore_libre  !== null ? `${r.matin_chlore_libre} mg/L`  : "—",
      r.matin_chlore_total  !== null ? `${r.matin_chlore_total} mg/L`  : "—",
      r.matin_chlore_combine !== null ? `${r.matin_chlore_combine} mg/L` : "—",
      r.matin_temperature !== null ? `${r.matin_temperature}°C` : "—",
      r.soir_heure ?? "—",
      r.soir_chlore_libre   !== null ? `${r.soir_chlore_libre} mg/L`   : "—",
      r.soir_chlore_total   !== null ? `${r.soir_chlore_total} mg/L`   : "—",
      r.soir_chlore_combine  !== null ? `${r.soir_chlore_combine} mg/L`  : "—",
      r.soir_temperature  !== null ? `${r.soir_temperature}°C`  : "—",
      r.soir_transparence ?? r.matin_transparence ?? "—",
      r.alerte ? "⚠ Alerte" : "✓ OK",
    ]);

    autoTable(doc, {
      startY: y,
      head: [HEAD],
      body: rows,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, textColor: INK, font: "helvetica" },
      headStyles: { fillColor: color, textColor: WHITE, fontStyle: "bold", fontSize: 7 },
      columnStyles: COL_W,
      theme: "plain",
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const r = sorted[data.row.index];
        if (!r) return;
        data.cell.styles.fillColor = r.alerte ? RED_BG : (data.row.index % 2 === 0 ? WHITE : GRAY);
        // Chlore libre M (col 2)
        if (data.column.index === 2 && clLibreAlert(r.matin_chlore_libre)) { data.cell.styles.textColor = RED_FG; data.cell.styles.fontStyle = "bold"; }
        // Chlore combiné M (col 4)
        if (data.column.index === 4 && clCombineAlert(r.matin_chlore_combine)) { data.cell.styles.textColor = RED_FG; data.cell.styles.fontStyle = "bold"; }
        // Chlore libre S (col 7)
        if (data.column.index === 7 && clLibreAlert(r.soir_chlore_libre)) { data.cell.styles.textColor = RED_FG; data.cell.styles.fontStyle = "bold"; }
        // Chlore combiné S (col 9)
        if (data.column.index === 9 && clCombineAlert(r.soir_chlore_combine)) { data.cell.styles.textColor = RED_FG; data.cell.styles.fontStyle = "bold"; }
        // Statut (col 12)
        if (data.column.index === 12) { data.cell.styles.textColor = r.alerte ? RED_FG : GRN_FG; data.cell.styles.fontStyle = "bold"; }
      },
    });

    addSignatureLine(doc, lastY(doc) + 14);
  }

  // ── PAGE INCIDENTS ────────────────────────────────────────────────────────────
  if (incidents.length > 0) {
    doc.addPage();
    y = 14;

    y = secHeader(doc, y, `Incidents consignés (${incidents.length})`, [180, 83, 9]);

    autoTable(doc, {
      startY: y,
      head: [["Date", "Bassin", "Description de l'incident", "Action corrective", "Technicien"]],
      body: incidents.map((inc) => [
        fmtDate(inc.date),
        BASSIN_LABELS[inc.bassin],
        inc.incident,
        inc.action_corrective ?? "—",
        inc.technicien_nom ?? "—",
      ]),
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3, textColor: INK, font: "helvetica", overflow: "linebreak" },
      headStyles: { fillColor: AMB_BG, textColor: AMB_FG, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fillColor: [255, 251, 235] as [number, number, number] },
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 30 }, 2: { cellWidth: 90 }, 3: { cellWidth: 90 }, 4: { cellWidth: 30 } },
      theme: "plain",
    });
  }

  // ── Footers ──────────────────────────────────────────────────────────────────
  addFooters(doc);

  const moisSlug = moisLabel.replace(/\s+/g, "_");
  doc.save(`Carnet_Sanitaire_${moisSlug}_Sofitel_Ajaccio.pdf`);
}
