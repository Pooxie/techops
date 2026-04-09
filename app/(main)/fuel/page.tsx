"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from "recharts";
import Header from "@/components/layout/Header";
import {
  fetchFuelReleves,
  fetchFuelLivraisons,
  createFuelLivraison,
  deleteFuelLivraison,
  type FuelReleveRecord,
  type FuelLivraisonRecord,
} from "@/lib/supabase";

// ── Constantes ────────────────────────────────────────────────────────────────

const CUVE_CAPACITY = 30_000;  // L
const DEFAULT_PRIX   = 1.70;   // €/L
const DEFAULT_CONSO  = 400;    // L/jour
const SEUIL_ROUGE    = 8_000;  // < 27%
const SEUIL_ORANGE   = 16_000; // < 53%

// ── Helpers ───────────────────────────────────────────────────────────────────

function fuelColor(n: number | null) {
  if (n === null) return "#AEAEB2";
  if (n < SEUIL_ROUGE)  return "#DC2626";
  if (n < SEUIL_ORANGE) return "#D97706";
  return "#15803D";
}

function fuelBg(n: number | null) {
  if (n === null) return "#FFFFFF";
  if (n < SEUIL_ROUGE)  return "#FEF2F2";
  if (n < SEUIL_ORANGE) return "#FFFBEB";
  return "#F0FDF4";
}

function autonomieBadge(j: number) {
  if (j < 20) return { label: "Commander", color: "#DC2626", bg: "#FEF2F2" };
  if (j < 40) return { label: "Surveiller", color: "#D97706", bg: "#FFFBEB" };
  return { label: "OK", color: "#15803D", bg: "#F0FDF4" };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function fmtNum(n: number) { return Math.round(n).toLocaleString("fr-FR"); }

function calcConsoMoyenne(releves: FuelReleveRecord[]): number {
  if (releves.length < 2) return DEFAULT_CONSO;
  let totalDrop = 0, totalDays = 0;
  for (let i = 1; i < releves.length; i++) {
    const diff = releves[i - 1].niveau - releves[i].niveau;
    const days = (new Date(releves[i].date).getTime() - new Date(releves[i - 1].date).getTime()) / 86_400_000;
    if (diff > 0 && days > 0) { totalDrop += diff; totalDays += days; }
  }
  return totalDays === 0 ? DEFAULT_CONSO : totalDrop / totalDays;
}

function calcPrixMoyen(livraisons: FuelLivraisonRecord[]): number {
  if (livraisons.length === 0) return DEFAULT_PRIX;
  const vol = livraisons.reduce((s, l) => s + l.volume_livre, 0);
  const eur = livraisons.reduce((s, l) => s + l.prix_total, 0);
  return vol === 0 ? DEFAULT_PRIX : eur / vol;
}

function calcConsoMois(releves: FuelReleveRecord[]): number | null {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  const mois = releves.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  if (mois.length < 2) return null;
  let total = 0;
  for (let i = 1; i < mois.length; i++) {
    const diff = mois[i - 1].niveau - mois[i].niveau;
    if (diff > 0) total += diff;
  }
  return total;
}

// ── Composant KPI card ────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, badge,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.06)", padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#AEAEB2" }}>
        {title}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.1 }}>
          {value}
        </span>
        {badge}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#6E6E73", lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

// ── Jauge fuel ────────────────────────────────────────────────────────────────

function FuelGauge({ niveau }: { niveau: number | null }) {
  const pct = niveau !== null ? Math.min(100, (niveau / CUVE_CAPACITY) * 100) : 0;
  const color = fuelColor(niveau);
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10, color: "#AEAEB2" }}>
        <span>0 L</span>
        <span>30 000 L</span>
      </div>
      <div style={{ height: 16, borderRadius: 8, backgroundColor: "#F0F0F3", overflow: "hidden", position: "relative" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 8,
          background: color === "#DC2626"
            ? "linear-gradient(90deg, #FCA5A5, #DC2626)"
            : color === "#D97706"
              ? "linear-gradient(90deg, #FCD34D, #D97706)"
              : "linear-gradient(90deg, #86EFAC, #15803D)",
          transition: "width 0.7s ease",
        }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(SEUIL_ROUGE / CUVE_CAPACITY) * 100}%`, width: 2, background: "rgba(220,38,38,0.35)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(SEUIL_ORANGE / CUVE_CAPACITY) * 100}%`, width: 2, background: "rgba(217,119,6,0.35)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 9, color: "#B45309" }}>
        <span style={{ color: "#DC2626" }}>▲ 8 000 L</span>
        <span>▲ 16 000 L</span>
      </div>
    </div>
  );
}

// ── Modal livraison ───────────────────────────────────────────────────────────

function LivraisonModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [volume, setVolume] = useState("");
  const [prix, setPrix] = useState("1.700");
  const [fournisseur, setFournisseur] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vol = parseFloat(volume) || 0;
  const px  = parseFloat(prix) || 0;
  const total = vol * px;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || vol <= 0 || px <= 0) {
      setError("Remplissez tous les champs obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createFuelLivraison({
        date, volume_livre: vol, prix_unitaire: px,
        fournisseur: fournisseur.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", marginTop: 5, padding: "9px 12px",
    borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 13,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#3C3C43",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 490, margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.18)", maxHeight: "90dvh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1D1D1F" }}>Enregistrer une livraison</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Date de livraison *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Volume livré (L) *</label>
              <input type="number" min="1" step="1" placeholder="ex : 15 000" value={volume}
                onChange={(e) => setVolume(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Prix unitaire (€/L) *</label>
              <input type="number" min="0" step="0.001" placeholder="1.700" value={prix}
                onChange={(e) => setPrix(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {vol > 0 && px > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total calculé</p>
              <p style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 700, color: "#78350F" }}>
                {total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#B45309" }}>
                {fmtNum(vol)} L × {px.toFixed(3)} €/L
              </p>
            </div>
          )}

          <div>
            <label style={labelStyle}>Fournisseur</label>
            <input type="text" placeholder="ex : Rubis, Total…" value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea placeholder="Observations…" value={notes} rows={2}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: "none" }} />
          </div>

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 10, backgroundColor: "#FEF2F2", color: "#B91C1C", fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", background: "#F5F5F7", color: "#1D1D1F", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: "11px", borderRadius: 12, border: "none", background: "#D97706", color: "#FFFFFF", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Enregistrement…" : "Enregistrer la livraison"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function FuelPage() {
  const [releves, setReleves]       = useState<FuelReleveRecord[]>([]);
  const [livraisons, setLivraisons] = useState<FuelLivraisonRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [r, l] = await Promise.all([fetchFuelReleves(90), fetchFuelLivraisons()]);
    setReleves(r);
    setLivraisons(l);
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── KPIs ────────────────────────────────────────────────────────────────────

  const niveauActuel  = releves.length > 0 ? releves[releves.length - 1].niveau : null;
  const dernierReleve = releves.length > 0 ? releves[releves.length - 1] : null;
  const pct           = niveauActuel !== null ? Math.min(100, (niveauActuel / CUVE_CAPACITY) * 100) : null;

  const consoMoyenne  = calcConsoMoyenne(releves);
  const autonomie     = niveauActuel !== null ? Math.floor(niveauActuel / consoMoyenne) : null;
  const autoBadge     = autonomie !== null ? autonomieBadge(autonomie) : null;

  const consoMois     = calcConsoMois(releves);
  const prixMoyen     = calcPrixMoyen(livraisons);
  const valeurStock   = niveauActuel !== null ? niveauActuel * prixMoyen : null;
  const coutMensuel   = consoMoyenne * 30 * prixMoyen;
  const coutAnnuel    = consoMoyenne * 365 * prixMoyen;

  // ── Chart ───────────────────────────────────────────────────────────────────

  const chartData = releves.map((r) => ({
    date: fmtDate(r.date),
    fullDate: r.date,
    niveau: r.niveau,
  }));

  // Deduplicated delivery dates formatted for chart x-axis labels
  const livraisonDatesSet = new Set(livraisons.map((l) => fmtDate(l.date)));

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteFuelLivraison(id);
      await loadData();
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", color: "#AEAEB2", gap: 10 }}>
        <Loader2 size={20} className="animate-spin" />
        <span style={{ fontSize: 14 }}>Chargement du suivi fuel…</span>
      </div>
    );
  }

  const totalVolLivré  = livraisons.reduce((s, l) => s + l.volume_livre, 0);
  const totalEurLivré  = livraisons.reduce((s, l) => s + l.prix_total, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100dvh", backgroundColor: "#F5F5F7" }}>
      <Header title="Suivi Fuel" />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }} className="page-main">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1D1D1F" }}>Suivi Fuel</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6E6E73" }}>
              Cuve 30 000 L — Sofitel Golfe d'Ajaccio · Groupe électrogène + chauffage
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, border: "none", background: "#D97706", color: "#FFFFFF", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(217,119,6,0.30)" }}
          >
            <Plus size={15} />
            Enregistrer une livraison
          </button>
        </div>

        {/* ── KPIs ligne 1 ────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 16 }} className="grid-3-resp">

          {/* Niveau actuel */}
          <div style={{
            background: fuelBg(niveauActuel),
            borderRadius: 16,
            border: `1px solid ${niveauActuel !== null ? fuelColor(niveauActuel) + "28" : "rgba(0,0,0,0.06)"}`,
            padding: "20px 22px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#AEAEB2" }}>
              Niveau actuel
            </p>
            <p style={{ margin: "8px 0 2px", fontSize: 34, fontWeight: 700, color: fuelColor(niveauActuel), lineHeight: 1 }}>
              {niveauActuel !== null ? `${fmtNum(niveauActuel)} L` : "—"}
            </p>
            {pct !== null && (
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: fuelColor(niveauActuel), opacity: 0.85 }}>
                {pct.toFixed(1)}% de la cuve
              </p>
            )}
            <FuelGauge niveau={niveauActuel} />
            {dernierReleve && (
              <p style={{ margin: "8px 0 0", fontSize: 10, color: "#8E8E93" }}>
                Dernier relevé : {fmtDateFull(dernierReleve.date)} · {dernierReleve.technicien}
              </p>
            )}
          </div>

          {/* Autonomie */}
          <KpiCard
            title="Autonomie estimée"
            value={autonomie !== null ? `${fmtNum(autonomie)} j` : "—"}
            badge={autoBadge && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, color: autoBadge.color, backgroundColor: autoBadge.bg }}>
                {autoBadge.label}
              </span>
            )}
            sub={
              <>
                Conso moy. : {Math.round(consoMoyenne).toLocaleString("fr-FR")} L/j
                {releves.length < 2 && <span style={{ color: "#B45309" }}> (valeur par défaut)</span>}
              </>
            }
          />

          {/* Conso ce mois */}
          <KpiCard
            title="Consommation ce mois"
            value={consoMois !== null ? `${fmtNum(consoMois)} L` : "—"}
            sub={consoMois !== null
              ? `≈ ${Math.round(consoMois / new Date().getDate()).toLocaleString("fr-FR")} L/j ce mois`
              : "Pas assez de relevés ce mois"
            }
          />
        </div>

        {/* ── KPIs ligne 2 ────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 16 }} className="grid-3-resp">

          {/* Prix moyen */}
          <KpiCard
            title="Prix moyen actuel"
            value={`${prixMoyen.toFixed(2).replace(".", ",")} €/L`}
            sub={livraisons.length > 0
              ? `Moyenne pondérée sur ${livraisons.length} livraison${livraisons.length > 1 ? "s" : ""}`
              : "Prix par défaut (1,70 €/L)"
            }
          />

          {/* Valeur stock */}
          <KpiCard
            title="Valeur du stock"
            value={valeurStock !== null
              ? `${Math.round(valeurStock).toLocaleString("fr-FR")} €`
              : "—"
            }
            sub={`${niveauActuel !== null ? fmtNum(niveauActuel) : "—"} L × ${prixMoyen.toFixed(3)} €/L`}
          />

          {/* Coût mensuel */}
          <KpiCard
            title="Coût mensuel estimé"
            value={`~${Math.round(coutMensuel).toLocaleString("fr-FR")} €/mois`}
            sub={`~${Math.round(coutAnnuel).toLocaleString("fr-FR")} €/an · ${Math.round(consoMoyenne).toLocaleString("fr-FR")} L/j × ${prixMoyen.toFixed(3)} €/L`}
          />
        </div>

        {/* ── Graphique ───────────────────────────────────────────────────── */}
        {chartData.length > 0 ? (
          <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1D1D1F" }}>
                Évolution du niveau — 90 derniers jours
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#8E8E93" }}>
                Relevés depuis les rondes · Livraisons marquées en orange
              </p>
            </div>
            <ResponsiveContainer width="100%" height={290}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8E8E93" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis
                  domain={[0, CUVE_CAPACITY]}
                  tickFormatter={(v: number) => `${v / 1000}k`}
                  tick={{ fontSize: 10, fill: "#8E8E93" }}
                  tickLine={false} axisLine={false} width={34}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${typeof v === "number" ? v.toLocaleString("fr-FR") : v} L`, "Niveau"]}
                  labelStyle={{ fontSize: 11, fontWeight: 600 }}
                  contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }}
                />
                {/* Zones de seuil */}
                <ReferenceArea y1={0} y2={SEUIL_ROUGE}    fill="#FEF2F2" fillOpacity={0.55} />
                <ReferenceArea y1={SEUIL_ROUGE} y2={SEUIL_ORANGE} fill="#FFFBEB" fillOpacity={0.45} />
                {/* Lignes seuil */}
                <ReferenceLine y={SEUIL_ROUGE}
                  stroke="#DC2626" strokeDasharray="4 3"
                  label={{ value: "Seuil alerte 8 000 L", position: "insideTopLeft", fontSize: 9, fill: "#DC2626" }}
                />
                <ReferenceLine y={SEUIL_ORANGE}
                  stroke="#D97706" strokeDasharray="4 3"
                  label={{ value: "Surveiller 16 000 L", position: "insideTopLeft", fontSize: 9, fill: "#D97706" }}
                />
                {/* Marqueurs livraisons */}
                {[...livraisonDatesSet].map((d) => (
                  <ReferenceLine key={d} x={d} stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 3"
                    label={{ value: "↑ Livr.", position: "top", fontSize: 8, fill: "#F59E0B" }}
                  />
                ))}
                <Line
                  type="monotone" dataKey="niveau"
                  stroke="#2563EB" strokeWidth={2.5}
                  dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }}
                  activeDot={{ r: 5 }} name="Niveau"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "40px", textAlign: "center", color: "#AEAEB2", fontSize: 13 }}>
            Aucun relevé fuel trouvé — renseignez le champ «&nbsp;Niveau fuel&nbsp;» dans les rondes
          </div>
        )}

        {/* ── Historique des relevés ───────────────────────────────────────── */}
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1D1D1F" }}>Historique des relevés</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8E8E93" }}>30 derniers relevés depuis les rondes</p>
          </div>
          {releves.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#AEAEB2", fontSize: 13 }}>
              Aucun relevé fuel trouvé dans les rondes
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9F9FB" }}>
                    {["Date", "Niveau (L)", "%", "Variation", "Technicien"].map((c) => (
                      <th key={c} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...releves].reverse().slice(0, 30).map((r, i, arr) => {
                    const prev = arr[i + 1];
                    const variation = prev ? r.niveau - prev.niveau : null;
                    const varColor = variation === null ? "#AEAEB2" : variation > 0 ? "#15803D" : variation < 0 ? "#DC2626" : "#6E6E73";
                    const varLabel = variation === null ? "—"
                      : variation > 0 ? `+${fmtNum(variation)} L`
                      : variation < 0 ? `${fmtNum(variation)} L`
                      : "Stable";
                    const rowPct = Math.min(100, (r.niveau / CUVE_CAPACITY) * 100);
                    return (
                      <tr key={r.ronde_id} style={{ backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FAFAFA", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <td style={{ padding: "9px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDateFull(r.date)}</td>
                        <td style={{ padding: "9px 16px", fontWeight: 700, color: fuelColor(r.niveau) }}>
                          {r.niveau.toLocaleString("fr-FR")}
                        </td>
                        <td style={{ padding: "9px 16px", color: fuelColor(r.niveau), fontWeight: 600 }}>
                          {rowPct.toFixed(1)}%
                        </td>
                        <td style={{ padding: "9px 16px", fontWeight: variation !== null && variation !== 0 ? 600 : 400, color: varColor }}>
                          {varLabel}
                        </td>
                        <td style={{ padding: "9px 16px", color: "#6E6E73" }}>{r.technicien}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Historique des livraisons ────────────────────────────────────── */}
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1D1D1F" }}>Historique des livraisons</h2>
            {livraisons.length > 0 && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8E8E93" }}>
                {livraisons.length} livraison{livraisons.length > 1 ? "s" : ""} ·{" "}
                {totalVolLivré.toLocaleString("fr-FR")} L ·{" "}
                {totalEurLivré.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            )}
          </div>

          {livraisons.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#AEAEB2", fontSize: 13 }}>
              Aucune livraison enregistrée
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9F9FB" }}>
                    {["Date", "Volume (L)", "Prix/L (€)", "Total (€)", "Fournisseur", "Notes", ""].map((c) => (
                      <th key={c} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {livraisons.map((l, i) => (
                    <tr key={l.id} style={{ backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FAFAFA", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <td style={{ padding: "9px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDateFull(l.date)}</td>
                      <td style={{ padding: "9px 16px", fontWeight: 700, color: "#D97706" }}>
                        {l.volume_livre.toLocaleString("fr-FR")}
                      </td>
                      <td style={{ padding: "9px 16px" }}>{l.prix_unitaire.toFixed(3)}</td>
                      <td style={{ padding: "9px 16px", fontWeight: 700 }}>
                        {l.prix_total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "9px 16px", color: "#6E6E73" }}>{l.fournisseur ?? "—"}</td>
                      <td style={{ padding: "9px 16px", color: "#6E6E73", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.notes ?? "—"}
                      </td>
                      <td style={{ padding: "9px 16px" }}>
                        {confirmDelete === l.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              onClick={() => void handleDelete(l.id)}
                              disabled={deletingId === l.id}
                              style={{ padding: "5px 10px", borderRadius: 8, border: "none", background: "#DC2626", color: "#FFF", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              {deletingId === l.id ? "…" : "Confirmer"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "none", color: "#6E6E73", fontSize: 11, cursor: "pointer" }}
                            >
                              Non
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(l.id)}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.2)", background: "none", color: "#DC2626", fontSize: 11, cursor: "pointer" }}
                          >
                            <Trash2 size={11} />
                            Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#FFFBEB", borderTop: "2px solid rgba(217,119,6,0.15)" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 700, fontSize: 12 }}>Total</td>
                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "#D97706" }}>
                      {totalVolLivré.toLocaleString("fr-FR")} L
                    </td>
                    <td style={{ padding: "10px 16px" }} />
                    <td style={{ padding: "10px 16px", fontWeight: 700 }}>
                      {totalEurLivré.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </main>

      {showModal && (
        <LivraisonModal
          onClose={() => setShowModal(false)}
          onCreated={() => void loadData()}
        />
      )}
    </div>
  );
}
