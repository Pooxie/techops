/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  formatFieldValue,
  getFieldValue,
  getVisibleRondeSections,
  type DonneesRonde,
  type RondeType,
} from "@/lib/rondes";

const C = {
  black: "#1D1D1F",
  grey: "#6E6E73",
  greyLight: "#AEAEB2",
  greyBg: "#F8FAFC",
  border: "#E2E8F0",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  red: "#FF3B30",
  redBg: "#FFF1F0",
  green: "#34C759",
  greenBg: "#F0FDF4",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.white,
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 34,
    fontSize: 8,
    color: C.black,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: C.blue,
  },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.black },
  subtitle: { fontSize: 8, color: C.grey, marginTop: 4 },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  summary: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 7,
    color: C.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  section: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.greyBg,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: 8,
    color: C.grey,
  },
  rowValue: {
    width: 180,
    fontSize: 8,
    color: C.black,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  observations: {
    marginTop: 4,
    marginBottom: 16,
    padding: 12,
    backgroundColor: C.greyBg,
    borderRadius: 8,
  },
  observationsTitle: {
    fontSize: 8,
    color: C.grey,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  signatureWrap: {
    marginTop: 4,
    marginBottom: 16,
  },
  signatureImage: {
    width: 180,
    height: 72,
    objectFit: "contain",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 6,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: C.greyLight },
});

type Props = {
  type: RondeType;
  donnees: DonneesRonde;
  observations?: string | null;
  signature?: string | null;
  generatedAt?: string;
  technicien?: string | null;
  title?: string;
};

export function RondeRecapPdf({
  type,
  donnees,
  observations = null,
  signature = null,
  generatedAt,
  technicien = null,
  title,
}: Props) {
  const sections = getVisibleRondeSections(type);
  const generationLabel = generatedAt
    ? new Date(generatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const totalFields = sections.reduce((count, section) => count + section.fields.length, 0);
  const completedFields = sections.reduce(
    (count, section) => count + section.fields.filter((field) => {
      const value = getFieldValue(donnees, field.path);
      return value !== null && value !== undefined && value !== "";
    }).length,
    0,
  );

  return (
    <Document
      title={title ?? `Récap ronde ${type}`}
      author="TechOps"
      subject="Récapitulatif de ronde"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.title}>Récapitulatif ronde {type}</Text>
            <Text style={s.subtitle}>Document généré le {generationLabel}</Text>
            {technicien ? <Text style={s.subtitle}>Technicien : {technicien}</Text> : null}
          </View>
          <Text
            style={[
              s.badge,
              {
                color: completedFields === totalFields ? C.green : C.blue,
                backgroundColor: completedFields === totalFields ? C.greenBg : C.blueBg,
              },
            ]}
          >
            {completedFields}/{totalFields} champs
          </Text>
        </View>

        <View style={s.summary}>
          <View style={[s.summaryCard, { backgroundColor: C.blueBg }]}>
            <Text style={s.summaryLabel}>Type</Text>
            <Text style={[s.summaryValue, { color: C.blue }]}>{type}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: C.greenBg }]}>
            <Text style={s.summaryLabel}>Champs remplis</Text>
            <Text style={[s.summaryValue, { color: C.green }]}>{completedFields}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: C.redBg }]}>
            <Text style={s.summaryLabel}>Champs restants</Text>
            <Text style={[s.summaryValue, { color: C.red }]}>{totalFields - completedFields}</Text>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.id} style={s.section} wrap={false}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={{ fontSize: 7, color: C.grey }}>
                {section.fields.length} champ{section.fields.length > 1 ? "s" : ""}
              </Text>
            </View>
            {section.fields.map((field) => (
              <View key={field.id} style={s.row}>
                <Text style={s.rowLabel}>{field.label}</Text>
                <Text style={s.rowValue}>{formatFieldValue(field, getFieldValue(donnees, field.path))}</Text>
              </View>
            ))}
          </View>
        ))}

        {observations ? (
          <View style={s.observations}>
            <Text style={s.observationsTitle}>Observations générales</Text>
            <Text>{observations}</Text>
          </View>
        ) : null}

        {signature ? (
          <View style={s.signatureWrap}>
            <Text style={s.observationsTitle}>Signature</Text>
            <Image src={signature} style={s.signatureImage} />
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Document généré par TechOps</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
