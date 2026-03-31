import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { SetCategorie } from "@/lib/supabase";

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  black:      "#1D1D1F",
  grey:       "#6E6E73",
  greyLight:  "#AEAEB2",
  greyBg:     "#F5F5F7",
  border:     "#E2E8F0",
  blue:       "#2563EB",
  blueBg:     "#EFF6FF",
  red:        "#FF3B30",
  redBg:      "#FFF1F0",
  orange:     "#FF9500",
  orangeBg:   "#FFF5E6",
  green:      "#34C759",
  greenBg:    "#F0FDF4",
  white:      "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.white,
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 36,
    fontSize: 8,
    color: C.black,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: C.blue,
  },
  headerLeft: { flexDirection: "column", gap: 2 },
  headerLogo: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.blue, marginBottom: 2 },
  headerTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black, letterSpacing: 1.5, textTransform: "uppercase" },
  headerHotel: { fontSize: 8, color: C.grey, marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 3 },
  headerMeta: { fontSize: 7.5, color: C.grey },

  // Résumé KPIs
  summary: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  summaryValue: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  summaryLabel: { fontSize: 7, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5 },

  // Catégorie
  catBlock: { marginBottom: 16 },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.greyBg,
    borderRadius: 4,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 4,
  },
  catTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black },
  catCount: { fontSize: 7.5, color: C.grey },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.black,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 6,
    paddingRight: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 6,
    paddingRight: 6,
    minHeight: 20,
    alignItems: "center",
  },
  tableRowOdd: { backgroundColor: C.greyBg },
  tableRowRetard: { backgroundColor: C.redBg },
  tableRowAlerte: { backgroundColor: C.orangeBg },

  thText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.white, textTransform: "uppercase", letterSpacing: 0.3 },
  tdText: { fontSize: 7.5, color: C.black },
  tdSmall: { fontSize: 7, color: C.grey },

  // Colonnes — largeurs fixes (total = 523pt = page A4 - marges)
  colNom:        { width: 145 },
  colType:       { width: 28 },
  colPeriode:    { width: 38 },
  colPresta:     { width: 90 },
  colDdv:        { width: 52 },
  colDp:         { width: 52 },
  colStatut:     { width: 46 },
  colNc:         { width: 24 },

  // Badge statut inline
  badge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  badgeText: { fontSize: 6.5, fontFamily: "Helvetica-Bold" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.greyLight },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function statutColor(s: string): { bg: string; text: string; label: string } {
  if (s === "retard") return { bg: C.redBg,    text: C.red,    label: "En retard" };
  if (s === "alerte") return { bg: C.orangeBg, text: C.orange, label: "Alerte" };
  return                     { bg: C.greenBg,  text: C.green,  label: "À jour" };
}

// ─── Composant principal ──────────────────────────────────────────────────────

type Props = {
  categories: SetCategorie[];
  generatedBy?: string;
};

export function RegistreSETPdf({ categories, generatedBy = "TechOps" }: Props) {
  const allControles = categories.flatMap((c) => c.controles);
  const total   = allControles.length;
  const retard  = allControles.filter((c) => c.statut === "retard").length;
  const alerte  = allControles.filter((c) => c.statut === "alerte").length;
  const ok      = allControles.filter((c) => c.statut === "ok").length;

  const dateGen = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dateGenShort = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const summaryCards = [
    { label: "Total",      value: total,  bg: C.blueBg,   color: C.blue },
    { label: "En retard",  value: retard, bg: C.redBg,    color: C.red },
    { label: "Alerte",     value: alerte, bg: C.orangeBg, color: C.orange },
    { label: "À jour",     value: ok,     bg: C.greenBg,  color: C.green },
  ];

  return (
    <Document
      title={`Registre SET Sofitel Ajaccio — ${dateGenShort}`}
      author="TechOps"
      subject="Registre réglementaire SET"
    >
      <Page size="A4" style={s.page}>

        {/* ── En-tête ── */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Text style={s.headerLogo}>TechOps</Text>
            <Text style={s.headerTitle}>Registre réglementaire</Text>
            <Text style={s.headerHotel}>Sofitel Golfe d'Ajaccio Thalasso Sea &amp; Spa</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerMeta}>Généré le {dateGen}</Text>
            <Text style={s.headerMeta}>Par : {generatedBy}</Text>
            <Text style={s.headerMeta}>H0587</Text>
          </View>
        </View>

        {/* ── Résumé KPIs ── */}
        <View style={s.summary}>
          {summaryCards.map(({ label, value, bg, color }) => (
            <View key={label} style={[s.summaryCard, { backgroundColor: bg }]}>
              <Text style={[s.summaryValue, { color }]}>{value}</Text>
              <Text style={s.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Catégories + contrôles ── */}
        {categories.map((cat) => {
          if (cat.controles.length === 0) return null;
          return (
            <View key={cat.id} style={s.catBlock} wrap={false}>
              {/* Titre catégorie */}
              <View style={s.catHeader}>
                <Text style={s.catTitle}>{cat.nom}</Text>
                <Text style={s.catCount}>{cat.controles.length} contrôle{cat.controles.length > 1 ? "s" : ""}</Text>
              </View>

              {/* En-têtes tableau */}
              <View style={s.tableHeader}>
                <Text style={[s.thText, s.colNom]}>Contrôle</Text>
                <Text style={[s.thText, s.colType]}>Type</Text>
                <Text style={[s.thText, s.colPeriode]}>Périodicité</Text>
                <Text style={[s.thText, s.colPresta]}>Prestataire</Text>
                <Text style={[s.thText, s.colDdv]}>Dernière visite</Text>
                <Text style={[s.thText, s.colDp]}>Prochaine éch.</Text>
                <Text style={[s.thText, s.colStatut]}>Statut</Text>
                <Text style={[s.thText, s.colNc]}>NC</Text>
              </View>

              {/* Lignes */}
              {cat.controles.map((c, i) => {
                const { bg, text, label } = statutColor(c.statut);
                const rowBg =
                  c.statut === "retard" ? C.redBg :
                  c.statut === "alerte" ? C.orangeBg :
                  i % 2 === 1 ? C.greyBg : C.white;

                return (
                  <View key={c.id} style={[s.tableRow, { backgroundColor: rowBg }]}>
                    <Text style={[s.tdText, s.colNom]} >{c.nom}</Text>
                    <Text style={[s.tdSmall, s.colType]}>{c.type_intervenant || "—"}</Text>
                    <Text style={[s.tdSmall, s.colPeriode]}>{c.periodicite_mois ? `${c.periodicite_mois} mois` : "—"}</Text>
                    <Text style={[s.tdSmall, s.colPresta]} >{c.prestataire || "—"}</Text>
                    <Text style={[s.tdSmall, s.colDdv]}>{formatDate(c.date_derniere_visite)}</Text>
                    <Text style={[s.tdSmall, s.colDp, { color: c.statut !== "ok" ? text : C.black }]}>
                      {formatDate(c.date_prochaine)}
                    </Text>
                    <View style={[s.badge, { backgroundColor: bg }, s.colStatut]}>
                      <Text style={[s.badgeText, { color: text }]}>{label}</Text>
                    </View>
                    <Text style={[s.tdSmall, s.colNc, { color: c.non_conformites_restantes > 0 ? C.red : C.greyLight, fontFamily: c.non_conformites_restantes > 0 ? "Helvetica-Bold" : "Helvetica" }]}>
                      {c.non_conformites_restantes > 0 ? String(c.non_conformites_restantes) : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* ── Pied de page ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Document généré par TechOps le {dateGen} · Confidentiel</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
