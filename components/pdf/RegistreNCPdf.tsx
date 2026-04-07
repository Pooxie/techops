import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { NCRecord, NCKPIs } from "@/lib/supabase";

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  black:     "#1D1D1F",
  grey:      "#6E6E73",
  greyLight: "#AEAEB2",
  greyBg:    "#F5F5F7",
  border:    "#E2E8F0",
  blue:      "#2563EB",
  blueBg:    "#EFF6FF",
  red:       "#FF3B30",
  redBg:     "#FFF1F0",
  orange:    "#FF9500",
  orangeBg:  "#FFF5E6",
  green:     "#34C759",
  greenBg:   "#F0FDF4",
  white:     "#FFFFFF",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: C.red,
  },
  headerLeft: { flexDirection: "column", gap: 2 },
  headerLogo: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.blue, marginBottom: 2 },
  headerTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black, letterSpacing: 1.5, textTransform: "uppercase" },
  headerHotel: { fontSize: 8, color: C.grey, marginTop: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 3 },
  headerMeta: { fontSize: 7.5, color: C.grey },

  // KPI summary
  summary: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 6, padding: 10, alignItems: "center" },
  summaryValue: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  summaryLabel: { fontSize: 7, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5 },

  // Group header
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.greyBg,
    borderRadius: 4,
    paddingTop: 6, paddingBottom: 6,
    paddingLeft: 10, paddingRight: 10,
    marginBottom: 4,
    marginTop: 12,
  },
  groupTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black },
  groupCount: { fontSize: 7.5, color: C.grey },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.black,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    paddingTop: 5, paddingBottom: 5,
    paddingLeft: 6, paddingRight: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5, borderBottomColor: C.border,
    paddingTop: 5, paddingBottom: 5,
    paddingLeft: 6, paddingRight: 6,
    minHeight: 20, alignItems: "flex-start",
  },
  thText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.white, textTransform: "uppercase", letterSpacing: 0.3 },
  tdText: { fontSize: 7.5, color: C.black },
  tdSmall: { fontSize: 7, color: C.grey },

  // Columns (total ≈ 523pt for A4 − margins)
  colObs:     { width: 28 },
  colDesc:    { width: 200 },
  colGravite: { width: 38 },
  colStatut:  { width: 40 },
  colDate:    { width: 52 },
  colOwner:   { width: 80 },
  colCout:    { width: 85 },

  badge: { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  badgeText: { fontSize: 6.5, fontFamily: "Helvetica-Bold" },

  footer: {
    position: "absolute",
    bottom: 20, left: 36, right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5, borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.greyLight },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtCost(v: number | null): string {
  if (!v || v === 0) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  ncs: NCRecord[];
  kpis: NCKPIs;
  filterLabel?: string;
  generatedBy?: string;
};

export function RegistreNCPdf({ ncs, kpis, filterLabel = "Toutes", generatedBy = "TechOps" }: Props) {
  const dateGen = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dateGenShort = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Group by contrôle, majeures ouvertes first
  const groupMap = new Map<string, NCRecord[]>();
  for (const nc of ncs) {
    const key = nc.controle_nom ?? "Sans contrôle associé";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(nc);
  }
  const groupes = Array.from(groupMap.entries()).sort(([, a], [, b]) => {
    const aMaj = a.filter(nc => nc.gravite === "majeure" && nc.statut === "ouverte").length;
    const bMaj = b.filter(nc => nc.gravite === "majeure" && nc.statut === "ouverte").length;
    return bMaj - aMaj;
  });

  const summaryCards = [
    { label: "Total",    value: ncs.length,           bg: C.blueBg,   color: C.blue },
    { label: "Ouvertes", value: kpis.ouvertesTotal,    bg: C.redBg,    color: C.red },
    { label: "Majeures", value: kpis.majeuresOuvertes, bg: C.orangeBg, color: C.orange },
    { label: "Levées",   value: kpis.leveeTotal,       bg: C.greenBg,  color: C.green },
  ];

  return (
    <Document
      title={`Registre NC Sofitel Ajaccio — ${dateGenShort}`}
      author="TechOps"
      subject="Registre Non-conformités"
    >
      <Page size="A4" style={s.page}>

        {/* ── En-tête ── */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Text style={s.headerLogo}>TechOps</Text>
            <Text style={s.headerTitle}>Registre Non-conformités</Text>
            <Text style={s.headerHotel}>Sofitel Golfe d'Ajaccio Thalasso Sea &amp; Spa</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerMeta}>Généré le {dateGen}</Text>
            <Text style={s.headerMeta}>Filtre : {filterLabel}</Text>
            <Text style={s.headerMeta}>Par : {generatedBy}</Text>
          </View>
        </View>

        {/* ── KPIs ── */}
        <View style={s.summary}>
          {summaryCards.map(({ label, value, bg, color }) => (
            <View key={label} style={[s.summaryCard, { backgroundColor: bg }]}>
              <Text style={[s.summaryValue, { color }]}>{value}</Text>
              <Text style={s.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Coûts ── */}
        {(kpis.coutExpl > 0 || kpis.coutIae > 0) && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            {kpis.coutExpl > 0 && (
              <View style={{ flex: 1, backgroundColor: C.greyBg, borderRadius: 6, padding: 10 }}>
                <Text style={{ fontSize: 7, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Coût Exploitation</Text>
                <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: C.black }}>{fmtCost(kpis.coutExpl)}</Text>
              </View>
            )}
            {kpis.coutIae > 0 && (
              <View style={{ flex: 1, backgroundColor: C.greyBg, borderRadius: 6, padding: 10 }}>
                <Text style={{ fontSize: 7, color: C.grey, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Coût IAE</Text>
                <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: C.black }}>{fmtCost(kpis.coutIae)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Groupes ── */}
        {groupes.map(([controleNom, groupNcs]) => (
          <View key={controleNom} style={s.groupHeader.marginTop ? undefined : undefined} wrap={false}>

            {/* Titre groupe */}
            <View style={s.groupHeader}>
              <Text style={s.groupTitle}>{controleNom}</Text>
              <Text style={s.groupCount}>{groupNcs.length} NC</Text>
            </View>

            {/* En-têtes tableau */}
            <View style={s.tableHeader}>
              <Text style={[s.thText, s.colObs]}>Obs.</Text>
              <Text style={[s.thText, s.colDesc]}>Description</Text>
              <Text style={[s.thText, s.colGravite]}>Gravité</Text>
              <Text style={[s.thText, s.colStatut]}>Statut</Text>
              <Text style={[s.thText, s.colDate]}>Date cible</Text>
              <Text style={[s.thText, s.colOwner]}>Responsable</Text>
              <Text style={[s.thText, s.colCout]}>Coûts</Text>
            </View>

            {/* Lignes */}
            {groupNcs.map((nc, i) => {
              const gravBg   = nc.gravite === "majeure" ? C.redBg    : C.orangeBg;
              const gravCol  = nc.gravite === "majeure" ? C.red      : C.orange;
              const gravLbl  = nc.gravite === "majeure" ? "Majeure"  : "Mineure";
              const statutBg = nc.statut  === "ouverte" ? C.redBg    : C.greenBg;
              const statutCol = nc.statut === "ouverte" ? C.red      : C.green;
              const statutLbl = nc.statut === "ouverte" ? "Ouverte"  : "Levée";
              const rowBg = nc.gravite === "majeure" && nc.statut === "ouverte"
                ? "#FFF8F8"
                : i % 2 === 1 ? C.greyBg : C.white;
              const cout = [
                nc.cost_expl ? `Expl. ${fmtCost(nc.cost_expl)}` : null,
                nc.cost_iae  ? `IAE ${fmtCost(nc.cost_iae)}`    : null,
              ].filter(Boolean).join("\n") || "—";

              return (
                <View key={nc.id} style={[s.tableRow, { backgroundColor: rowBg }]}>
                  <Text style={[s.tdSmall, s.colObs]}>{nc.source_obs_no ? `#${nc.source_obs_no}` : "—"}</Text>
                  <Text style={[s.tdText, s.colDesc]}>{nc.description}</Text>
                  <View style={[s.colGravite, { alignItems: "flex-start" }]}>
                    <View style={[s.badge, { backgroundColor: gravBg }]}>
                      <Text style={[s.badgeText, { color: gravCol }]}>{gravLbl}</Text>
                    </View>
                  </View>
                  <View style={[s.colStatut, { alignItems: "flex-start" }]}>
                    <View style={[s.badge, { backgroundColor: statutBg }]}>
                      <Text style={[s.badgeText, { color: statutCol }]}>{statutLbl}</Text>
                    </View>
                  </View>
                  <Text style={[s.tdSmall, s.colDate, { color: nc.statut === "ouverte" && nc.date_cible ? C.orange : C.grey }]}>
                    {fmtDate(nc.date_cible)}
                  </Text>
                  <Text style={[s.tdSmall, s.colOwner]}>{nc.action_owner_name || "—"}</Text>
                  <Text style={[s.tdSmall, s.colCout]}>{cout}</Text>
                </View>
              );
            })}
          </View>
        ))}

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
