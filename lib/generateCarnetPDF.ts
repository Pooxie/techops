import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BASSIN_LABELS,
  SEUIL_TEMP_THALASSO,
  isTempThalassoOk,
  type RondePoolRecord,
  type IncidentSanitaire,
  type BassinId,
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

export async function generateCarnetPDF(
  records: RondePoolRecord[],
  incidents: IncidentSanitaire[]
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.width;
  let y = 0;

  const mois = records.length > 0
    ? new Date(records[0].date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
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
  doc.text("Bassins eau de mer — Piscine Hôtel (chlore) · Piscine Thalasso (UV + hypochlorite)", 14, 34);
  doc.text(`Période : ${moisLabel}  ·  Généré le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TechOps", w - 14, 21, { align: "right" });

  y = 54;

  // ── Rappel seuils ────────────────────────────────────────────────────────────
  y = secHeader(doc, y, "Seuils réglementaires applicables — Arrêté du 26 mai 2021");

  autoTable(doc, {
    startY: y,
    head: [["Paramètre", "Seuil", "Unité", "Bassin concerné", "Référence"]],
    body: [
      ["Température", `≤ ${SEUIL_TEMP_THALASSO}°C`, "°C", "Piscine Thalasso", "Art. D.1332-3 CSP"],
      ["Transparence", "Bonne obligatoire", "—", "Tous bassins", "Art. D.1332-3 CSP"],
      ["pH (contrôle ARS)", "6,9 — 7,7", "—", "Prélèvements ARS mensuels", "Art. D.1332-3 CSP"],
      ["Bactériologie", "Normes ARS", "UFC/100mL", "Prélèvements ARS mensuels", "Art. D.1332-3 CSP"],
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

  const bassins: BassinId[] = ["piscine_hotel", "piscine_thalasso"];
  const summaryRows = bassins.map((b) => {
    const alertes = b === "piscine_hotel"
      ? records.filter((r) => r.hotel_alerte).length
      : records.filter((r) => r.thalasso_alerte).length;
    return [BASSIN_LABELS[b], String(records.length), String(records.length - alertes), String(alertes)];
  });

  autoTable(doc, {
    startY: y,
    head: [["Bassin", "Rondes enregistrées", "Sans alerte", "Alertes"]],
    body: summaryRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3, textColor: INK, font: "helvetica" },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    theme: "plain",
  });

  // ── PAGE 2 — PISCINE HÔTEL ──────────────────────────────────────────────────
  doc.addPage();
  y = 14;

  y = secHeader(doc, y, "Piscine Hôtel — Eau de mer · Traitement chlore");

  const hotelSorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const hotelRows = hotelSorted.map((r) => {
    const cc = r.hotel_concentration_chlore;
    return [
      fmtDate(r.date),
      r.heure === "matin" ? "Matin" : "Après-midi",
      r.hotel_temperature !== null ? `${r.hotel_temperature}°C` : "—",
      r.hotel_chlore !== null ? `${r.hotel_chlore} L` : "—",
      cc !== null ? `${cc} mg/L` : "—",
      r.hotel_swan ?? "—",
      r.technicien,
      r.hotel_alerte ? "⚠ Alerte" : "✓ OK",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Date", "Moment", "Température", "Chlore (L)", "Chlore (mg/L)", "SWAN", "Technicien", "Statut"]],
    body: hotelRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: INK, font: "helvetica" },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 2: { cellWidth: 26 }, 3: { cellWidth: 22 }, 4: { cellWidth: 26 }, 5: { cellWidth: 18 }, 6: { cellWidth: 32 } },
    theme: "plain",
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const r = hotelSorted[data.row.index];
      if (!r) return;
      if (r.hotel_alerte) {
        data.cell.styles.fillColor = RED_BG;
      } else {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? WHITE : GRAY;
      }
      // Concentration chlore hors seuil en rouge
      if (data.column.index === 4) {
        const cc = r.hotel_concentration_chlore;
        if (cc !== null && (cc < 0.4 || cc > 1.4)) {
          data.cell.styles.textColor = RED_FG;
          data.cell.styles.fontStyle = "bold";
        }
      }
      if (data.column.index === 7) {
        data.cell.styles.textColor = r.hotel_alerte ? RED_FG : GRN_FG;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = lastY(doc) + 14;

  // Zone signature
  doc.setDrawColor(...SOFT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SOFT);
  const sh = Math.min(y, doc.internal.pageSize.height - 35);
  doc.line(14, sh, 80, sh);
  doc.text("Signature du technicien responsable", 14, sh + 5);
  doc.line(w - 80, sh, w - 14, sh);
  doc.text("Visa responsable technique", w - 80, sh + 5);

  // ── PAGE 3 — PISCINE THALASSO ───────────────────────────────────────────────
  doc.addPage();
  y = 14;

  y = secHeader(doc, y, "Piscine Thalasso — Eau de mer · Traitement UV + hypochlorite · Temp max 32°C", CYAN);

  const thalassoSorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const thalassoRows = thalassoSorted.map((r) => {
    const cc = r.thalasso_concentration_chlore;
    return [
      fmtDate(r.date),
      r.heure === "matin" ? "Matin" : "Après-midi",
      r.thalasso_temperature !== null ? `${r.thalasso_temperature}°C` : "—",
      r.thalasso_hypochlorite !== null ? `${r.thalasso_hypochlorite} L` : "—",
      cc !== null ? `${cc} mg/L` : "—",
      r.thalasso_compteur !== null ? `${r.thalasso_compteur} m³` : "—",
      r.thalasso_nettoyage ?? "—",
      r.thalasso_swan ?? "—",
      r.technicien,
      r.thalasso_alerte ? "⚠ Alerte" : "✓ OK",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Date", "Moment", "Température", "Hypochlorite (L)", "Chlore (mg/L)", "Compteur", "Filtres", "SWAN", "Technicien", "Statut"]],
    body: thalassoRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: INK, font: "helvetica" },
    headStyles: { fillColor: CYAN, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 18 }, 2: { cellWidth: 24 }, 3: { cellWidth: 24 }, 4: { cellWidth: 24 }, 5: { cellWidth: 20 }, 6: { cellWidth: 14 }, 7: { cellWidth: 14 } },
    theme: "plain",
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const r = thalassoSorted[data.row.index];
      if (!r) return;
      if (r.thalasso_alerte) {
        data.cell.styles.fillColor = RED_BG;
      } else {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? WHITE : GRAY;
      }
      // Température hors seuil en rouge
      if (data.column.index === 2 && !isTempThalassoOk(r.thalasso_temperature)) {
        data.cell.styles.textColor = RED_FG;
        data.cell.styles.fontStyle = "bold";
      }
      // Concentration chlore hors seuil en rouge
      if (data.column.index === 4) {
        const cc = r.thalasso_concentration_chlore;
        if (cc !== null && (cc < 0.4 || cc > 1.4)) {
          data.cell.styles.textColor = RED_FG;
          data.cell.styles.fontStyle = "bold";
        }
      }
      if (data.column.index === 9) {
        data.cell.styles.textColor = r.thalasso_alerte ? RED_FG : GRN_FG;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = lastY(doc) + 14;

  const sh2 = Math.min(y, doc.internal.pageSize.height - 35);
  doc.setDrawColor(...SOFT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SOFT);
  doc.line(14, sh2, 80, sh2);
  doc.text("Signature du technicien responsable", 14, sh2 + 5);
  doc.line(w - 80, sh2, w - 14, sh2);
  doc.text("Visa responsable technique", w - 80, sh2 + 5);

  // ── PAGE 4 — INCIDENTS (si nécessaire) ─────────────────────────────────────
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
