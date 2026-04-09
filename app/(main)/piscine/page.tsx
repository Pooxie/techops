"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, FileDown, Loader2, Droplets, AlertTriangle, CheckCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import Header from "@/components/layout/Header";
import {
  fetchRondesPoolData,
  fetchIncidentsSanitaires,
  createIncidentSanitaire,
  fetchCurrentUserSummary,
  isTempThalassoOk,
  SEUIL_TEMP_THALASSO,
  BASSIN_LABELS,
  type RondePoolRecord,
  type IncidentSanitaire,
  type BassinId,
} from "@/lib/supabase";

type FiltrePeriode = 7 | 30 | 90;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ── Badge ─────────────────────────────────────────────────────────────────────

function AlerteBadge({ alerte }: { alerte: boolean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
      color: alerte ? "#DC2626" : "#15803D",
      backgroundColor: alerte ? "#FEF2F2" : "#F0FDF4",
    }}>
      {alerte ? "Alerte" : "OK"}
    </span>
  );
}

function OkNokBadge({ val }: { val: "ok" | "nok" | null }) {
  if (val === null) return <span style={{ color: "#C7C7CC" }}>—</span>;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      color: val === "ok" ? "#15803D" : "#DC2626",
      backgroundColor: val === "ok" ? "#F0FDF4" : "#FEF2F2",
    }}>
      {val === "ok" ? "OK" : "NOK"}
    </span>
  );
}

function NumCell({ v, warn = false, unit = "" }: { v: number | null; warn?: boolean; unit?: string }) {
  if (v === null) return <span style={{ color: "#C7C7CC" }}>—</span>;
  return (
    <span style={{ color: warn ? "#DC2626" : "#1D1D1F", fontWeight: warn ? 700 : 400 }}>
      {v}{unit}
    </span>
  );
}

// ── Formulaire incident ───────────────────────────────────────────────────────

function IncidentSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [bassin, setBassin] = useState<BassinId>("piscine_hotel");
  const [incident, setIncident] = useState("");
  const [action, setAction] = useState("");
  const [technicien, setTechnicien] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUserSummary().then((u) => {
      if (u) setTechnicien(`${u.prenom} ${u.nom}`.trim());
    });
  }, []);

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.10)", fontSize: 14, backgroundColor: "#F5F5F7",
    outline: "none", boxSizing: "border-box", color: "#1D1D1F",
    fontFamily: "var(--font-inter, system-ui, sans-serif)",
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#8E8E93",
    letterSpacing: "0.4px", display: "block", marginBottom: 5, textTransform: "uppercase" as const,
  };

  async function handleSubmit() {
    if (!incident.trim()) { setError("La description est requise."); return; }
    setSaving(true); setError(null);
    try {
      await createIncidentSanitaire({ date, bassin, incident: incident.trim(), action_corrective: action, technicien_nom: technicien });
      onCreated(); onClose();
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Erreur.");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.14)" }}>
        <div style={{ width: 36, height: 4, backgroundColor: "#C7C7CC", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Ajouter un incident</p>
            <p style={{ fontSize: 11, color: "#8E8E93", margin: "2px 0 0" }}>Consignation exceptionnelle — Art. D.1332-10 CSP</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={20} color="#8E8E93" /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Bassin</label>
              <select value={bassin} onChange={(e) => setBassin(e.target.value as BassinId)} style={{ ...inp, appearance: "none" }}>
                <option value="piscine_hotel">Piscine Hôtel</option>
                <option value="piscine_thalasso">Piscine Thalasso</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Technicien</label>
            <input value={technicien} onChange={(e) => setTechnicien(e.target.value)} placeholder="Nom" style={inp} />
          </div>
          <div>
            <label style={lbl}>Description de l&apos;incident *</label>
            <textarea value={incident} onChange={(e) => setIncident(e.target.value)} rows={3} placeholder="Ex: turbidité anormale, panne SWAN, odeur de chlore…" style={{ ...inp, resize: "vertical" }} />
          </div>
          <div>
            <label style={lbl}>Action corrective</label>
            <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={2} placeholder="Ex: vidange partielle, recalibration, fermeture temporaire…" style={{ ...inp, resize: "vertical" }} />
          </div>
          {error && <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>}
          <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", backgroundColor: "#DC2626", color: "#FFFFFF", fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, marginTop: 4 }}>
            {saving ? "Enregistrement…" : "Consigner l'incident"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tableau par bassin ────────────────────────────────────────────────────────

function HotelTable({ records }: { records: RondePoolRecord[] }) {
  if (records.length === 0) return (
    <div style={{ padding: "32px 20px", textAlign: "center", color: "#AEAEB2", fontSize: 13 }}>
      Aucune ronde validée sur la période
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ backgroundColor: "#F9F9FB" }}>
            {["Date", "Heure", "Temp (°C)", "Chlore (L)", "Chlore (mg/L)", "SWAN", "Technicien", "Statut"].map((c) => (
              <th key={c} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#8E8E93", letterSpacing: "0.4px", textTransform: "uppercase", borderBottom: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const cc = r.hotel_concentration_chlore;
            const ccOk = cc === null || (cc >= 0.4 && cc <= 1.4);
            return (
            <tr key={r.ronde_id} style={{ backgroundColor: r.hotel_alerte ? "#FEF2F2" : (i % 2 === 0 ? "#FFFFFF" : "#FAFAFA"), borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <td style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDateFull(r.date)}</td>
              <td style={{ padding: "9px 12px", color: "#6E6E73" }}>{r.heure === "matin" ? "Matin" : "Après-midi"}</td>
              <td style={{ padding: "9px 12px" }}><NumCell v={r.hotel_temperature} unit="°C" /></td>
              <td style={{ padding: "9px 12px" }}><NumCell v={r.hotel_chlore} unit=" L" /></td>
              <td style={{ padding: "9px 12px" }}><NumCell v={cc} warn={!ccOk} unit=" mg/L" /></td>
              <td style={{ padding: "9px 12px" }}><OkNokBadge val={r.hotel_swan} /></td>
              <td style={{ padding: "9px 12px", color: "#6E6E73", whiteSpace: "nowrap" }}>{r.technicien}</td>
              <td style={{ padding: "9px 12px" }}><AlerteBadge alerte={r.hotel_alerte} /></td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ThalassoTable({ records }: { records: RondePoolRecord[] }) {
  if (records.length === 0) return (
    <div style={{ padding: "32px 20px", textAlign: "center", color: "#AEAEB2", fontSize: 13 }}>
      Aucune ronde validée sur la période
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ backgroundColor: "#F9F9FB" }}>
            {["Date", "Heure", "Temp (°C)", "Hypochlorite (L)", "Chlore (mg/L)", "Compteur m³", "Filtres", "SWAN", "Technicien", "Statut"].map((c) => (
              <th key={c} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#8E8E93", letterSpacing: "0.4px", textTransform: "uppercase", borderBottom: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const cc = r.thalasso_concentration_chlore;
            const ccOk = cc === null || (cc >= 0.4 && cc <= 1.4);
            return (
            <tr key={r.ronde_id} style={{ backgroundColor: r.thalasso_alerte ? "#FEF2F2" : (i % 2 === 0 ? "#FFFFFF" : "#FAFAFA"), borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <td style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDateFull(r.date)}</td>
              <td style={{ padding: "9px 12px", color: "#6E6E73" }}>{r.heure === "matin" ? "Matin" : "Après-midi"}</td>
              <td style={{ padding: "9px 12px" }}><NumCell v={r.thalasso_temperature} warn={!isTempThalassoOk(r.thalasso_temperature)} unit="°C" /></td>
              <td style={{ padding: "9px 12px" }}><NumCell v={r.thalasso_hypochlorite} unit=" L" /></td>
              <td style={{ padding: "9px 12px" }}><NumCell v={cc} warn={!ccOk} unit=" mg/L" /></td>
              <td style={{ padding: "9px 12px" }}><NumCell v={r.thalasso_compteur} unit=" m³" /></td>
              <td style={{ padding: "9px 12px" }}><OkNokBadge val={r.thalasso_nettoyage} /></td>
              <td style={{ padding: "9px 12px" }}><OkNokBadge val={r.thalasso_swan} /></td>
              <td style={{ padding: "9px 12px", color: "#6E6E73", whiteSpace: "nowrap" }}>{r.technicien}</td>
              <td style={{ padding: "9px 12px" }}><AlerteBadge alerte={r.thalasso_alerte} /></td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Graphiques ────────────────────────────────────────────────────────────────

function PoolChart({
  title,
  chartData,
  line1Key,
  line1Label,
  line1Color,
  line2Key,
  line2Label,
  line2Color,
  refLine,
}: {
  title: string;
  chartData: Record<string, unknown>[];
  line1Key: string; line1Label: string; line1Color: string;
  line2Key: string; line2Label: string; line2Color: string;
  refLine?: { value: number; label: string };
}) {
  if (chartData.length === 0) return (
    <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontSize: 12, color: "#AEAEB2" }}>Aucune donnée</p>
    </div>
  );
  return (
    <div>
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#1D1D1F" }}>{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#AEAEB2" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#AEAEB2" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)" }} />
          {refLine && (
            <ReferenceLine y={refLine.value} stroke="#DC2626" strokeDasharray="4 2" strokeWidth={1} label={{ value: refLine.label, position: "right", fontSize: 9, fill: "#DC2626" }} />
          )}
          <Line type="monotone" dataKey={line1Key} name={line1Label} stroke={line1Color} strokeWidth={2} dot={{ r: 2, fill: line1Color }} connectNulls />
          <Line type="monotone" dataKey={line2Key} name={line2Label} stroke={line2Color} strokeWidth={2} dot={{ r: 2, fill: line2Color }} connectNulls />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function PiscinePage() {
  const [records, setRecords] = useState<RondePoolRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentSanitaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncident, setShowIncident] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>(30);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, i] = await Promise.all([
      fetchRondesPoolData(filtrePeriode),
      fetchIncidentsSanitaires(filtrePeriode),
    ]);
    setRecords(r);
    setIncidents(i);
    setLoading(false);
  }, [filtrePeriode]);

  useEffect(() => { load(); }, [load]);

  // KPIs
  const alertesHotel    = records.filter((r) => r.hotel_alerte).length;
  const alertesThalasso = records.filter((r) => r.thalasso_alerte).length;
  const totalAlertes    = alertesHotel + alertesThalasso;
  const totalRondes     = records.length;
  const tauxOk = totalRondes > 0 ? Math.round(((totalRondes * 2 - totalAlertes) / (totalRondes * 2)) * 100) : 100;
  const derniere = records[0];

  // Données graphiques
  const hotelChartData = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: fmtDate(r.date), temp: r.hotel_temperature, chlore: r.hotel_chlore }));

  const thalassoChartData = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: fmtDate(r.date), temp: r.thalasso_temperature, hypo: r.thalasso_hypochlorite }));

  async function handleExportPDF() {
    if (generatingPDF) return;
    setGeneratingPDF(true);
    try {
      const { generateCarnetPDF } = await import("@/lib/generateCarnetPDF");
      await generateCarnetPDF(records, incidents);
    } catch (e) { console.error("PDF error:", e); }
    finally { setGeneratingPDF(false); }
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: "16px 20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)",
    flex: "1 1 140px",
  };
  const sectionCard: React.CSSProperties = {
    backgroundColor: "#FFFFFF", borderRadius: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)",
    overflow: "hidden", marginBottom: 20,
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7" }}>
      <Header title="Registre Sanitaire" />

      <main style={{ padding: "24px" }} className="max-md:px-4">

        {/* Titre */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1D1D1F" }}>Registre Sanitaire Piscines</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8E8E93" }}>
              Bassins eau de mer — Sofitel Golfe d&apos;Ajaccio · Arrêté du 26 mai 2021
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleExportPDF} disabled={generatingPDF} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)", backgroundColor: "#FFFFFF", color: "#1D1D1F",
              fontSize: 13, fontWeight: 600, cursor: generatingPDF ? "not-allowed" : "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", opacity: generatingPDF ? 0.7 : 1,
            }}>
              {generatingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} color="#2563EB" />}
              Exporter PDF
            </button>
            <button onClick={() => setShowIncident(true)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10,
              border: "none", backgroundColor: "#DC2626", color: "#FFFFFF",
              fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
            }}>
              <Plus size={14} />
              Ajouter un incident
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rondes enregistrées</p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: "#1D1D1F" }}>{totalRondes}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#AEAEB2" }}>{filtrePeriode} derniers jours</p>
          </div>
          <div style={{ ...cardStyle, borderColor: totalAlertes > 0 ? "rgba(220,38,38,0.2)" : undefined }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>Alertes</p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: totalAlertes > 0 ? "#DC2626" : "#1D1D1F" }}>{totalAlertes}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#AEAEB2" }}>{alertesHotel} hôtel · {alertesThalasso} thalasso</p>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>Taux de conformité</p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: tauxOk >= 95 ? "#15803D" : "#DC2626" }}>{tauxOk}%</p>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>Incidents consignés</p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: incidents.length > 0 ? "#D97706" : "#1D1D1F" }}>{incidents.length}</p>
          </div>
          {derniere && (
            <div style={cardStyle}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>Dernière ronde</p>
              <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "#1D1D1F" }}>{fmtDateFull(derniere.date)}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8E8E93" }}>{derniere.heure === "matin" ? "Matin" : "Après-midi"} · {derniere.technicien}</p>
            </div>
          )}
        </div>

        {/* Filtre période */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {([7, 30, 90] as FiltrePeriode[]).map((j) => {
            const active = filtrePeriode === j;
            return (
              <button key={j} type="button" onClick={() => setFiltrePeriode(j)} style={{
                padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 12,
                fontWeight: active ? 700 : 500, cursor: "pointer",
                backgroundColor: active ? "#1D1D1F" : "#FFFFFF", color: active ? "#FFFFFF" : "#6E6E73",
                boxShadow: active ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
              }}>
                {j === 7 ? "7 jours" : j === 30 ? "30 jours" : "3 mois"}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#AEAEB2" }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 10px", display: "block" }} />
            <p style={{ margin: 0, fontSize: 13 }}>Chargement des rondes…</p>
          </div>
        ) : (
          <>
            {/* Piscine Hôtel */}
            <div style={sectionCard}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                <Droplets size={15} color="#2563EB" />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>Piscine Hôtel</p>
                <span style={{ fontSize: 11, color: "#8E8E93" }}>Eau de mer · Traitement chlore</span>
                {alertesHotel > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#DC2626", backgroundColor: "#FEF2F2", padding: "2px 10px", borderRadius: 20 }}>
                    {alertesHotel} alerte{alertesHotel > 1 ? "s" : ""}
                  </span>
                )}
                {alertesHotel === 0 && records.length > 0 && (
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#15803D" }}>
                    <CheckCircle size={12} /> Tout OK
                  </span>
                )}
              </div>
              <HotelTable records={records} />
            </div>

            {/* Piscine Thalasso */}
            <div style={sectionCard}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                <Droplets size={15} color="#0891B2" />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>Piscine Thalasso</p>
                <span style={{ fontSize: 11, color: "#8E8E93" }}>Eau de mer · Traitement UV + hypochlorite · Seuil temp : {SEUIL_TEMP_THALASSO}°C</span>
                {alertesThalasso > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#DC2626", backgroundColor: "#FEF2F2", padding: "2px 10px", borderRadius: 20 }}>
                    {alertesThalasso} alerte{alertesThalasso > 1 ? "s" : ""}
                  </span>
                )}
                {alertesThalasso === 0 && records.length > 0 && (
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#15803D" }}>
                    <CheckCircle size={12} /> Tout OK
                  </span>
                )}
              </div>
              <ThalassoTable records={records} />
            </div>

            {/* Graphiques */}
            {records.length > 0 && (
              <div style={{ display: "grid", gap: 16, marginBottom: 20 }} className="grid-2-resp">
                <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <PoolChart
                    title="Piscine Hôtel — Température & Chlore"
                    chartData={hotelChartData}
                    line1Key="temp" line1Label="Temp (°C)" line1Color="#2563EB"
                    line2Key="chlore" line2Label="Chlore" line2Color="#0891B2"
                  />
                </div>
                <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: "18px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
                  <PoolChart
                    title="Piscine Thalasso — Température & Hypochlorite"
                    chartData={thalassoChartData}
                    line1Key="temp" line1Label="Temp (°C)" line1Color="#0891B2"
                    line2Key="hypo" line2Label="Hypochlorite (L)" line2Color="#16A34A"
                    refLine={{ value: SEUIL_TEMP_THALASSO, label: `Max ${SEUIL_TEMP_THALASSO}°C` }}
                  />
                </div>
              </div>
            )}

            {/* Incidents */}
            {incidents.length > 0 && (
              <div style={sectionCard}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={15} color="#D97706" />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>Incidents consignés</p>
                  <span style={{ fontSize: 11, color: "#AEAEB2" }}>· {incidents.length} sur la période</span>
                </div>
                <div>
                  {incidents.map((inc, i) => (
                    <div key={inc.id} style={{
                      padding: "14px 20px",
                      borderBottom: i < incidents.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                      backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FFFBF5",
                    }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1D1D1F" }}>{fmtDateFull(inc.date)}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 20, backgroundColor: "#FEF9C3", color: "#854D0E" }}>{BASSIN_LABELS[inc.bassin]}</span>
                        {inc.technicien_nom && <span style={{ fontSize: 11, color: "#8E8E93" }}>{inc.technicien_nom}</span>}
                      </div>
                      <p style={{ margin: "0 0 4px", fontSize: 13, color: "#1D1D1F" }}>{inc.incident}</p>
                      {inc.action_corrective && (
                        <p style={{ margin: 0, fontSize: 12, color: "#15803D" }}>→ {inc.action_corrective}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rappel réglementaire */}
            <div style={{ padding: "14px 18px", backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Rappel réglementaire
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#6E6E73" }}>
                Arrêté du 26 mai 2021 — Température Thalasso : max {SEUIL_TEMP_THALASSO}°C · Prélèvements mensuels ARS (pH, bactériologie) · Document à conserver 3 ans — Art. D.1332-10 CSP
              </p>
            </div>
          </>
        )}
      </main>

      {showIncident && (
        <IncidentSheet onClose={() => setShowIncident(false)} onCreated={load} />
      )}
    </div>
  );
}
