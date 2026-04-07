"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  createTache,
  deleteTache,
  fetchPlanningInterventions,
  fetchPlanningPrestataires,
  fetchPlanningRondes,
  fetchTaches,
  fetchUsers,
  toggleTacheStatut,
  updateTache,
  type PlanningInterventionEvent,
  type PlanningRondeEvent,
  type PrestataireEvent,
  type TacheRecord,
  type UserRecord,
} from "@/lib/supabase";

// ─── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ─── Event types ───────────────────────────────────────────────────────────────

type GridEvent =
  | { kind: "prestataire"; data: PrestataireEvent }
  | { kind: "intervention"; data: PlanningInterventionEvent }
  | { kind: "ronde"; data: PlanningRondeEvent }
  | { kind: "tache"; data: TacheRecord };

function eventColor(e: GridEvent): string {
  if (e.kind === "prestataire") return "#5856D6";
  if (e.kind === "intervention") return e.data.priorite === "urgente" ? "#FF3B30" : "#FF9500";
  if (e.kind === "ronde") return e.data.hors_norme ? "#FF3B30" : e.data.type === "ouverture" ? "#2563EB" : "#34C759";
  return e.data.statut === "fait" ? "#34C759" : "#8E8E93";
}

function eventLabel(e: GridEvent): string {
  if (e.kind === "prestataire") return e.data.nom;
  if (e.kind === "intervention") return e.data.titre;
  if (e.kind === "ronde") return `Ronde ${e.data.type}`;
  return e.data.titre;
}

function kindLabel(kind: GridEvent["kind"]): string {
  return { prestataire: "Prestataire", intervention: "Intervention", ronde: "Ronde", tache: "Tâche" }[kind];
}

// ─── Style constants ───────────────────────────────────────────────────────────

const navBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "#FFFFFF",
  cursor: "pointer", fontSize: 20, lineHeight: 1,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 13, fontWeight: 600,
  color: "#6E6E73", marginBottom: 6,
};

const inputSt: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)", fontSize: 14,
  backgroundColor: "#F5F5F7", outline: "none", boxSizing: "border-box",
};

// ─── EventChip (desktop grid) ──────────────────────────────────────────────────

function EventChip({
  event,
  onToggle,
  onSelectTache,
}: {
  event: GridEvent;
  onToggle?: (id: string, s: "a_faire" | "fait") => void;
  onSelectTache?: (t: TacheRecord) => void;
}) {
  const color = eventColor(event);
  const label = eventLabel(event);
  const isTache = event.kind === "tache";
  const isDone = isTache && (event.data as TacheRecord).statut === "fait";

  return (
    <div
      onClick={
        isTache && onSelectTache
          ? () => onSelectTache(event.data as TacheRecord)
          : isTache && onToggle
          ? () => { const t = event.data as TacheRecord; onToggle(t.id, t.statut === "fait" ? "a_faire" : "fait"); }
          : undefined
      }
      style={{
        backgroundColor: color + "22",
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: "3px 6px",
        marginBottom: 3,
        cursor: isTache ? "pointer" : "default",
        opacity: isDone ? 0.6 : 1,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textDecoration: isDone ? "line-through" : "none",
        }}
      >
        {label}
      </div>
      {event.kind === "tache" && (event.data as TacheRecord).heure && (
        <div style={{ fontSize: 10, color: "#8E8E93" }}>{(event.data as TacheRecord).heure}</div>
      )}
    </div>
  );
}

// ─── Desktop grid ──────────────────────────────────────────────────────────────

function DesktopGrid({
  weekDays,
  eventsForDay,
  onToggle,
  onSelectTache,
  today,
}: {
  weekDays: Date[];
  eventsForDay: (d: Date) => GridEvent[];
  onToggle: (id: string, s: "a_faire" | "fait") => void;
  onSelectTache: (t: TacheRecord) => void;
  today: Date;
}) {
  return (
    <div style={{ overflowX: "auto", padding: "16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(130px, 1fr))",
          gap: 8,
          minWidth: 700,
        }}
      >
        {weekDays.map((day, i) => {
          const isToday = toDateStr(day) === toDateStr(today);
          const events = eventsForDay(day);
          return (
            <div
              key={i}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: isToday
                  ? "0 0 0 2px #2563EB"
                  : "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #F5F5F7",
                  backgroundColor: isToday ? "#2563EB" : "transparent",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isToday ? "rgba(255,255,255,0.8)" : "#8E8E93",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {JOURS_COURT[i]}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: isToday ? "#FFFFFF" : "#1D1D1F",
                    lineHeight: 1.2,
                  }}
                >
                  {day.getDate()}
                </div>
              </div>
              <div style={{ padding: "6px 8px", minHeight: 80 }}>
                {events.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#C7C7CC", textAlign: "center", paddingTop: 12 }}>
                    —
                  </div>
                ) : (
                  events.map((e, j) => (
                    <EventChip key={j} event={e} onToggle={onToggle} onSelectTache={onSelectTache} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mobile list ───────────────────────────────────────────────────────────────

function MobileList({
  weekDays,
  eventsForDay,
  onToggle,
  onSelectTache,
  today,
}: {
  weekDays: Date[];
  eventsForDay: (d: Date) => GridEvent[];
  onToggle: (id: string, s: "a_faire" | "fait") => void;
  onSelectTache: (t: TacheRecord) => void;
  today: Date;
}) {
  return (
    <div style={{ padding: "16px" }}>
      {weekDays.map((day, i) => {
        const isToday = toDateStr(day) === toDateStr(today);
        const events = eventsForDay(day);
        return (
          <div key={i} style={{ marginBottom: 16 }}>
            {/* Day header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 16,
                  backgroundColor: isToday ? "#2563EB" : "rgba(0,0,0,0.08)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? "rgba(255,255,255,0.8)" : "#8E8E93", lineHeight: 1 }}>
                  {JOURS_COURT[i]}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: isToday ? "#FFFFFF" : "#1D1D1F", lineHeight: 1 }}>
                  {day.getDate()}
                </span>
              </div>
              <div style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.08)" }} />
              {events.length > 0 && (
                <span style={{ fontSize: 12, color: "#8E8E93", flexShrink: 0 }}>
                  {events.length} événement{events.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {/* Events */}
            {events.length === 0 ? (
              <div style={{ paddingLeft: 50, fontSize: 13, color: "#C7C7CC" }}>Aucun événement</div>
            ) : (
              <div
                style={{
                  backgroundColor: "#FFFFFF", borderRadius: 12,
                  overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                {events.map((e, j) => {
                  const color = eventColor(e);
                  const label = eventLabel(e);
                  const isTache = e.kind === "tache";
                  const isDone = isTache && (e.data as TacheRecord).statut === "fait";
                  return (
                    <div
                      key={j}
                      onClick={
                        isTache
                          ? () => onSelectTache(e.data as TacheRecord)
                          : undefined
                      }
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px",
                        borderBottom: j < events.length - 1 ? "1px solid #F5F5F7" : "none",
                        cursor: isTache ? "pointer" : "default",
                      }}
                    >
                      <div style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: "#1D1D1F",
                          textDecoration: isDone ? "line-through" : "none",
                          opacity: isDone ? 0.6 : 1,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 12, color: "#8E8E93" }}>
                          {kindLabel(e.kind)}
                          {e.kind === "tache" && (e.data as TacheRecord).heure && ` · ${(e.data as TacheRecord).heure}`}
                          {e.kind === "tache" && (e.data as TacheRecord).assignee_prenom && ` · ${(e.data as TacheRecord).assignee_prenom}`}
                          {e.kind === "intervention" && ` · ${(e.data as PlanningInterventionEvent).priorite}`}
                          {e.kind === "prestataire" && (e.data as PrestataireEvent).categorie && ` · ${(e.data as PrestataireEvent).categorie}`}
                        </div>
                      </div>
                      {isTache && (
                        <div style={{
                          width: 24, height: 24, borderRadius: 12,
                          border: `2px solid ${color}`,
                          backgroundColor: isDone ? color : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          {isDone && <span style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{
      flex: "1 1 0",
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: "14px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      minWidth: 90,
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8E8E93", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Tâche drawer (détail / édition / suppression) ───────────────────────────

function TacheDrawer({
  tache,
  onClose,
  onUpdated,
  onDeleted,
}: {
  tache: TacheRecord;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [titre, setTitre] = useState(tache.titre);
  const [date, setDate] = useState(tache.date);
  const [heure, setHeure] = useState(tache.heure ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!titre.trim()) { setError("Le titre est obligatoire"); return; }
    setSaving(true); setError("");
    try {
      await updateTache(tache.id, { titre: titre.trim(), date, heure: heure || null });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette tâche ?")) return;
    setDeleting(true);
    try {
      await deleteTache(tache.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setDeleting(false);
    }
  }

  const fmtD = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", zIndex: 201, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 16px" }} />

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", backgroundColor: "#F5F5F7", padding: "2px 8px", borderRadius: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tâche</span>
            {!editing && <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "8px 0 4px", lineHeight: 1.3 }}>{tache.titre}</p>}
            {!editing && <p style={{ fontSize: 13, color: "#8E8E93", margin: 0 }}>{fmtD(tache.date)}{tache.heure ? ` · ${tache.heure}` : ""}</p>}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setEditing(v => !v)}
              style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: editing ? "#EFF6FF" : "#F5F5F7", fontSize: 12, fontWeight: 600, color: editing ? "#2563EB" : "#6E6E73", cursor: "pointer" }}
            >
              {editing ? "Annuler" : "Modifier"}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(255,59,48,0.2)", backgroundColor: "#FFF1F0", fontSize: 12, fontWeight: 600, color: "#FF3B30", cursor: deleting ? "not-allowed" : "pointer" }}
            >
              {deleting ? "…" : "Supprimer"}
            </button>
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: "#FF3B30", backgroundColor: "#FFF1F0", padding: "10px 12px", borderRadius: 10, margin: "0 0 16px" }}>{error}</p>}

        {/* Statut */}
        {!editing && (
          <div style={{ padding: "12px 16px", backgroundColor: tache.statut === "fait" ? "#F0FDF4" : "#F5F5F7", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, border: `2px solid ${tache.statut === "fait" ? "#34C759" : "#C7C7CC"}`, backgroundColor: tache.statut === "fait" ? "#34C759" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {tache.statut === "fait" && <span style={{ color: "#FFFFFF", fontSize: 11, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: tache.statut === "fait" ? "#34C759" : "#6E6E73" }}>
              {tache.statut === "fait" ? "Tâche accomplie" : "À faire"}
            </span>
          </div>
        )}

        {/* Formulaire édition */}
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelSt}>TITRE *</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} style={inputSt} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={labelSt}>DATE *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputSt} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelSt}>HEURE</label>
                <input type="time" value={heure} onChange={e => setHeure(e.target.value)} style={inputSt} />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ width: "100%", padding: "13px", backgroundColor: saving ? "#C7C7CC" : "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}

        <button onClick={onClose} style={{ width: "100%", padding: "12px", backgroundColor: "transparent", color: "#8E8E93", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, fontSize: 14, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </>
  );
}

// ─── Create task sheet ─────────────────────────────────────────────────────────

function CreateTaskSheet({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [heure, setHeure] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!titre.trim()) { setError("Le titre est obligatoire"); return; }
    if (!date) { setError("La date est obligatoire"); return; }
    setSaving(true);
    setError("");
    try {
      await createTache({
        titre: titre.trim(),
        date,
        heure: heure || undefined,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
      setSaving(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200 }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "20px 20px 44px", zIndex: 201,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 20px" }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>Nouvelle tâche</h2>

        {error && (
          <div style={{
            backgroundColor: "#FF3B3015", borderRadius: 10, padding: "10px 14px",
            marginBottom: 16, color: "#FF3B30", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelSt}>Titre *</label>
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex : Vérification chaudière"
            style={inputSt}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 2 }}>
            <label style={labelSt}>Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputSt} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelSt}>Heure</label>
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} style={inputSt} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: "100%", padding: "14px",
            backgroundColor: saving ? "#C7C7CC" : "#2563EB",
            color: "#FFFFFF", border: "none", borderRadius: 14,
            fontSize: 16, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Création…" : "Créer la tâche"}
        </button>
      </div>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [prestataires, setPrestataires] = useState<PrestataireEvent[]>([]);
  const [interventions, setInterventions] = useState<PlanningInterventionEvent[]>([]);
  const [rondes, setRondes] = useState<PlanningRondeEvent[]>([]);
  const [taches, setTaches] = useState<TacheRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTache, setSelectedTache] = useState<TacheRecord | null>(null);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const startStr = toDateStr(weekStart);
  const endStr = toDateStr(weekEnd);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [p, iv, r, t, u] = await Promise.all([
      fetchPlanningPrestataires(startStr, endStr),
      fetchPlanningInterventions(startStr, endStr),
      fetchPlanningRondes(startStr, endStr),
      fetchTaches(startStr, endStr),
      fetchUsers(),
    ]);
    setPrestataires(p);
    setInterventions(iv);
    setRondes(r);
    setTaches(t);
    setUsers(u);
    setLoading(false);
  }, [startStr, endStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const eventsForDay = useCallback(
    (date: Date): GridEvent[] => {
      const ds = toDateStr(date);
      const events: GridEvent[] = [];
      prestataires.filter((e) => e.date === ds).forEach((e) => events.push({ kind: "prestataire", data: e }));
      interventions.filter((e) => e.date === ds).forEach((e) => events.push({ kind: "intervention", data: e }));
      rondes.filter((e) => e.date === ds).forEach((e) => events.push({ kind: "ronde", data: e }));
      taches
        .filter((e) => e.date === ds)
        .sort((a, b) => (a.heure ?? "99:99").localeCompare(b.heure ?? "99:99"))
        .forEach((e) => events.push({ kind: "tache", data: e }));
      return events;
    },
    [prestataires, interventions, rondes, taches]
  );

  async function handleToggle(id: string, newStatut: "a_faire" | "fait") {
    await toggleTacheStatut(id, newStatut);
    setTaches((prev) => prev.map((t) => (t.id === id ? { ...t, statut: newStatut } : t)));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getMonday(today));

  const fmtShort = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <div style={{ backgroundColor: "#F5F5F7", minHeight: "100vh", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ backgroundColor: "#FFFFFF", padding: "16px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px" }}>Planning</h1>

        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={navBtn} onClick={() => setWeekStart((prev) => addDays(prev, -7))}>
            ‹
          </button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>
            Semaine du {fmtShort(weekStart)} au {fmtShort(weekEnd)}
          </span>
          <button style={navBtn} onClick={() => setWeekStart((prev) => addDays(prev, 7))}>
            ›
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeekStart(getMonday(today))}
              style={{
                padding: "5px 12px", borderRadius: 16,
                border: "1px solid #2563EB", backgroundColor: "transparent",
                color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
              }}
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, padding: "16px 16px 0" }}>
        <KpiCard label="Prestataires" value={prestataires.length} color="#5856D6" icon="🔧" />
        <KpiCard label="Interventions" value={interventions.length} color="#FF9500" icon="⚡" />
        <KpiCard label="Tâches" value={taches.length} color="#34C759" icon="✓" />
      </div>

      {/* Calendar / List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#8E8E93", fontSize: 15 }}>
          Chargement…
        </div>
      ) : isMobile ? (
        <MobileList weekDays={weekDays} eventsForDay={eventsForDay} onToggle={handleToggle} onSelectTache={setSelectedTache} today={today} />
      ) : (
        <DesktopGrid weekDays={weekDays} eventsForDay={eventsForDay} onToggle={handleToggle} onSelectTache={setSelectedTache} today={today} />
      )}

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "4px 16px 16px" }}>
        {[
          { color: "#5856D6", label: "Prestataire" },
          { color: "#FF9500", label: "Intervention" },
          { color: "#2563EB", label: "Ronde ouv." },
          { color: "#34C759", label: "Ronde ferm." },
          { color: "#FF3B30", label: "Hors norme / Urgente" },
          { color: "#8E8E93", label: "Tâche" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
            <span style={{ fontSize: 11, color: "#8E8E93" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        style={{
          position: "fixed", bottom: 80, right: 20,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: "#2563EB", color: "#FFFFFF",
          fontSize: 28, border: "none", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
        }}
      >
        +
      </button>

      {/* Tâche drawer */}
      {selectedTache && (
        <TacheDrawer
          tache={selectedTache}
          onClose={() => setSelectedTache(null)}
          onUpdated={() => { setSelectedTache(null); loadData(); }}
          onDeleted={() => { setSelectedTache(null); loadData(); }}
        />
      )}

      {/* Create task sheet */}
      {showCreate && (
        <CreateTaskSheet
          defaultDate={toDateStr(today)}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadData(); }}
        />
      )}
    </div>
  );
}
