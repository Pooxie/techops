"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brain, RefreshCw, Send, Loader2, Trash2, Plus,
  ChevronRight, Calendar, Phone, Clock, CheckCircle,
  AlertTriangle, Zap, X, Mail,
} from "lucide-react";
import Header from "@/components/layout/Header";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionPriorite = "urgent" | "important" | "surveiller" | "ok";

type ActionJour = {
  id: string;
  priorite: ActionPriorite;
  emoji: string;
  titre: string;
  description: string;
  contact?: { nom: string; tel: string };
  duree_estimee?: string;
  source: string;
  lien?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

type Memory = {
  id: string;
  contenu: string;
  tags: string[];
  created_at: string;
};

type PlanningEvent = {
  date: string;
  label: string;
  type: "ronde" | "prestataire" | "set" | "intervention";
  details?: string;
};

// ─── Design ───────────────────────────────────────────────────────────────────

const PRIORITE_CONFIG: Record<ActionPriorite, { color: string; bg: string; border: string; label: string }> = {
  urgent:     { color: "#991B1B", bg: "#FEF2F2", border: "#EF4444", label: "URGENT" },
  important:  { color: "#92400E", bg: "#FFFBEB", border: "#F59E0B", label: "IMPORTANT" },
  surveiller: { color: "#1E40AF", bg: "#EFF6FF", border: "#3B82F6", label: "À SURVEILLER" },
  ok:         { color: "#065F46", bg: "#ECFDF5", border: "#10B981", label: "RAS" },
};

const EVENT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  ronde:        { bg: "#F0FDF4", color: "#166534", border: "#22C55E" },
  prestataire:  { bg: "#EFF6FF", color: "#1E40AF", border: "#3B82F6" },
  set:          { bg: "#F5F3FF", color: "#5B21B6", border: "#8B5CF6" },
  intervention: { bg: "#FEF2F2", color: "#991B1B", border: "#EF4444" },
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatDateFR(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Bloc Briefing ────────────────────────────────────────────────────────────

function BriefingCard() {
  const [briefing, setBriefing] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cerveau/briefing");
      const data = await res.json() as { briefing?: string; timestamp?: string; date?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Erreur serveur");
      setBriefing(data.briefing ?? "");
      setTimestamp(data.timestamp ?? "");
      setDate(data.date ?? "");
    } catch (e) {
      setError(`Erreur : ${e instanceof Error ? e.message : "inconnue"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)",
      borderRadius: 20,
      padding: "28px 32px",
      color: "#FFFFFF",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Décoration */}
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 120, height: 120, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)",
      }} />
      <div style={{
        position: "absolute", bottom: -20, right: 80,
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Brain size={22} color="#93C5FD" strokeWidth={2} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
              Bonjour Cyrille ☀️
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "#93C5FD", marginTop: 2 }}>
              {date || new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 10, padding: "6px 12px",
            color: "#DBEAFE", fontSize: 12, fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Régénérer
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Loader2 size={18} color="#93C5FD" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#BFDBFE", fontSize: 14 }}>Analyse en cours…</span>
        </div>
      ) : error ? (
        <p style={{ color: "#FCA5A5", fontSize: 14, margin: 0 }}>{error}</p>
      ) : (
        <p style={{
          margin: 0, fontSize: 14.5, lineHeight: 1.75,
          color: "#E0EFFE", whiteSpace: "pre-wrap",
        }}>
          {briefing}
        </p>
      )}

      {timestamp && !loading && (
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "#93C5FD" }}>
          Généré à {timestamp}
        </p>
      )}
    </div>
  );
}

// ─── Bloc Actions ─────────────────────────────────────────────────────────────

function ActionCard({
  action,
  onFait,
  onCreerIntervention,
}: {
  action: ActionJour;
  onFait: (id: string) => void;
  onCreerIntervention: (action: ActionJour) => void;
}) {
  const cfg = PRIORITE_CONFIG[action.priorite];
  return (
    <div style={{
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.border}22`,
      borderLeft: `4px solid ${cfg.border}`,
      borderRadius: 14,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.8px",
              color: cfg.color, backgroundColor: `${cfg.border}22`,
              padding: "2px 8px", borderRadius: 6,
            }}>
              {action.emoji} {cfg.label}
            </span>
          </div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
            {action.titre}
          </h4>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
            {action.description}
          </p>
        </div>
      </div>

      {/* Contact */}
      {action.contact && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Phone size={13} color="#6B7280" />
          <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
            {action.contact.nom} : {action.contact.tel || "—"}
          </span>
        </div>
      )}

      {/* Durée */}
      {action.duree_estimee && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Clock size={13} color="#6B7280" />
          <span style={{ fontSize: 12, color: "#6B7280" }}>Estimé : {action.duree_estimee}</span>
        </div>
      )}

      {/* Boutons */}
      {action.priorite !== "ok" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onFait(action.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 9,
              border: `1px solid ${cfg.border}`,
              backgroundColor: "#FFFFFF",
              color: cfg.color, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <CheckCircle size={13} />
            Fait
          </button>
          {action.source === "set" || action.source === "intervention" ? (
            <button
              onClick={() => onCreerIntervention(action)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9,
                border: "none",
                backgroundColor: cfg.border,
                color: "#FFFFFF", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <ChevronRight size={13} />
              Créer intervention
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ActionsBlock() {
  const [actions, setActions] = useState<ActionJour[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/cerveau/actions")
      .then((r) => r.json() as Promise<{ actions: ActionJour[] }>)
      .then((d) => setActions(d.actions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = actions.filter((a) => !dismissed.has(a.id));
  const urgent = visible.filter((a) => a.priorite === "urgent");
  const important = visible.filter((a) => a.priorite === "important");
  const reste = visible.filter((a) => a.priorite !== "urgent" && a.priorite !== "important");

  function handleFait(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  function handleCreerIntervention(action: ActionJour) {
    // Redirige vers /interventions avec pre-fill (via URL param)
    const params = new URLSearchParams({
      titre: action.titre.slice(0, 100),
      description: action.description,
      priorite: action.priorite === "urgent" ? "urgente" : "normale",
    });
    window.location.href = `/interventions?${params.toString()}`;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
          Actions du jour
          {urgent.length > 0 && (
            <span style={{
              marginLeft: 8, backgroundColor: "#EF4444", color: "#FFFFFF",
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
            }}>
              {urgent.length} urgent{urgent.length > 1 ? "s" : ""}
            </span>
          )}
        </h3>
        {dismissed.size > 0 && (
          <button
            onClick={() => setDismissed(new Set())}
            style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer" }}
          >
            Tout réafficher
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 20 }}>
          <Loader2 size={18} color="#6B7280" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#6B7280", fontSize: 14 }}>Analyse en cours…</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...urgent, ...important, ...reste].map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              onFait={handleFait}
              onCreerIntervention={handleCreerIntervention}
            />
          ))}
          {visible.length === 0 && (
            <div style={{
              backgroundColor: "#ECFDF5", border: "1px solid #6EE7B7",
              borderRadius: 14, padding: "20px 18px",
              textAlign: "center", color: "#065F46", fontSize: 14,
            }}>
              ✅ Toutes les actions du jour sont traitées. Bien joué !
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bloc Planning Semaine ────────────────────────────────────────────────────

function PlanningBlock() {
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlanningEvent | null>(null);

  const monday = getMondayOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  useEffect(() => {
    async function fetchPlanningData() {
      try {
        const [setRes, interRes] = await Promise.all([
          fetch("/api/cerveau/actions").then((r) => r.json() as Promise<{ actions: ActionJour[] }>),
          // On va directement chercher les données via l'API actions qui a déjà tout
          Promise.resolve({ actions: [] }),
        ]);

        const evts: PlanningEvent[] = [];
        const today = new Date();

        // Rondes quotidiennes
        for (let i = 0; i < 7; i++) {
          const d = addDays(monday, i);
          const ds = d.toISOString().slice(0, 10);
          const isToday = ds === today.toISOString().slice(0, 10);
          const isPast = d < today;

          evts.push({
            date: ds,
            label: "🌅 Ronde ouverture",
            type: "ronde",
            details: "Ronde d'ouverture quotidienne — Piscines, Fuel, Technique",
          });
          if (!isPast || isToday) {
            evts.push({
              date: ds,
              label: "🌙 Ronde fermeture",
              type: "ronde",
              details: "Ronde de fermeture quotidienne",
            });
          }
        }

        // Actions SET en retard/alerte comme événements
        for (const action of setRes.actions ?? []) {
          if (action.source === "set" && action.priorite !== "ok") {
            // On les met aujourd'hui
            evts.push({
              date: today.toISOString().slice(0, 10),
              label: action.emoji + " " + action.titre.slice(0, 40),
              type: action.priorite === "urgent" ? "intervention" : "set",
              details: action.description,
            });
          }
        }

        setEvents(evts);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchPlanningData();
  }, []);

  function eventsForDay(dateStr: string) {
    return events.filter((e) => e.date === dateStr);
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#111827" }}>
        Planning de la semaine
      </h3>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 20 }}>
          <Loader2 size={18} color="#6B7280" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#6B7280", fontSize: 14 }}>Chargement…</span>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(120px, 1fr))", gap: 8, minWidth: 700 }}>
            {weekDays.map((day, i) => {
              const ds = day.toISOString().slice(0, 10);
              const isToday = ds === new Date().toISOString().slice(0, 10);
              const dayEvents = eventsForDay(ds);

              return (
                <div key={ds} style={{
                  backgroundColor: isToday ? "#EFF6FF" : "#F9FAFB",
                  borderRadius: 12,
                  padding: "12px 10px",
                  border: isToday ? "2px solid #2563EB" : "1px solid rgba(0,0,0,0.06)",
                }}>
                  <div style={{ marginBottom: 8, textAlign: "center" }}>
                    <p style={{
                      margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px",
                      color: isToday ? "#2563EB" : "#9CA3AF", textTransform: "uppercase",
                    }}>
                      {DAYS_FR[i]}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: isToday ? "#2563EB" : "#111827" }}>
                      {day.getDate()}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {dayEvents.slice(0, 5).map((evt, ei) => {
                      const colors = EVENT_COLORS[evt.type] ?? EVENT_COLORS.set;
                      return (
                        <button
                          key={ei}
                          onClick={() => setSelected(evt)}
                          style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}44`,
                            borderLeft: `3px solid ${colors.border}`,
                            borderRadius: 6,
                            padding: "4px 6px",
                            fontSize: 10, color: colors.color, fontWeight: 500,
                            textAlign: "left", cursor: "pointer", width: "100%",
                            lineHeight: 1.3,
                          }}
                        >
                          {evt.label}
                        </button>
                      );
                    })}
                    {dayEvents.length > 5 && (
                      <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", textAlign: "center" }}>
                        +{dayEvents.length - 5} autres
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Légende */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        {Object.entries(EVENT_COLORS).map(([type, colors]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.border }} />
            <span style={{ fontSize: 11, color: "#6B7280", textTransform: "capitalize" }}>
              {type === "prestataire" ? "Prestataire" : type === "ronde" ? "Ronde" : type === "set" ? "Contrôle SET" : "Intervention"}
            </span>
          </div>
        ))}
      </div>

      {/* Drawer détail événement */}
      {selected && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF", borderRadius: 20, padding: 28,
              maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{selected.label}</h4>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} color="#6B7280" />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
              📅 {formatDateFR(selected.date)}
            </p>
            {selected.details && (
              <p style={{ margin: "10px 0 0", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                {selected.details}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bloc Chat ────────────────────────────────────────────────────────────────

function ChatBlock() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: msg, ts: Date.now() };
    setHistory((h) => [...h, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/cerveau/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: history.map((h) => ({ role: h.role, content: h.content })),
        }),
      });
      const data = await res.json() as { response?: string; error?: string };
      const reply = data.response ?? data.error ?? "Erreur inattendue.";
      setHistory((h) => [...h, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch {
      setHistory((h) => [...h, { role: "assistant", content: "Erreur de connexion.", ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  const SUGGESTIONS = [
    "Quand est-ce qu'APAVE est venu la dernière fois ?",
    "Combien j'ai dépensé ce mois ?",
    "Est-ce que je suis prêt pour la commission de sécurité ?",
    "Qu'est ce qui s'est passé cette semaine ?",
  ];

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <Brain size={18} color="#2563EB" />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
          Demande à TechOps
        </h3>
      </div>

      {/* Messages */}
      <div style={{ padding: "16px 20px", minHeight: 200, maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {history.length === 0 ? (
          <div>
            <p style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", margin: "20px 0 16px" }}>
              Pose une question sur ton hôtel…
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  style={{
                    background: "#F3F4F6", border: "none", borderRadius: 20,
                    padding: "8px 14px", fontSize: 12, color: "#374151",
                    cursor: "pointer", lineHeight: 1.4, textAlign: "left",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((msg) => (
            <div
              key={msg.ts}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              <div style={{
                maxWidth: "78%",
                backgroundColor: msg.role === "user" ? "#2563EB" : "#F3F4F6",
                color: msg.role === "user" ? "#FFFFFF" : "#111827",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 14px",
                fontSize: 14, lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              backgroundColor: "#F3F4F6", borderRadius: "18px 18px 18px 4px",
              padding: "10px 14px", display: "flex", gap: 4, alignItems: "center",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#9CA3AF", animation: "bounce 1.2s infinite 0s" }} />
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#9CA3AF", animation: "bounce 1.2s infinite 0.2s" }} />
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#9CA3AF", animation: "bounce 1.2s infinite 0.4s" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        display: "flex", gap: 10, alignItems: "flex-end",
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
          }}
          placeholder="Ex : Quand est-ce qu'APAVE est venu ?"
          rows={1}
          style={{
            flex: 1, resize: "none", border: "1.5px solid rgba(0,0,0,0.1)",
            borderRadius: 14, padding: "10px 14px", fontSize: 14, color: "#111827",
            outline: "none", fontFamily: "inherit", lineHeight: 1.5,
            backgroundColor: "#F9FAFB",
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: 12, border: "none",
            background: loading || !input.trim() ? "#E5E7EB" : "linear-gradient(135deg, #2563EB, #1D4ED8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          <Send size={16} color={loading || !input.trim() ? "#9CA3AF" : "#FFFFFF"} />
        </button>
      </div>

      {history.length > 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          <button
            onClick={() => setHistory([])}
            style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}
          >
            Effacer la conversation
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Bloc Rapport Hebdo ───────────────────────────────────────────────────────

function RapportBlock() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ emailSent?: boolean; emailError?: string; stats?: Record<string, unknown>; subject?: string } | null>(null);

  async function generer() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cerveau/rapport-hebdo", { method: "POST" });
      const data = await res.json() as { emailSent?: boolean; emailError?: string; stats?: Record<string, unknown>; subject?: string };
      setResult(data);
    } catch {
      setResult({ emailError: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mail size={18} color="#2563EB" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
            Rapport Hebdomadaire
          </h3>
        </div>
        <button
          onClick={generer}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 12,
            border: "none",
            background: loading ? "#E5E7EB" : "linear-gradient(135deg, #2563EB, #1D4ED8)",
            color: loading ? "#9CA3AF" : "#FFFFFF",
            fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 2px 8px rgba(37,99,235,0.30)",
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={14} />}
          {loading ? "Génération…" : "Envoyer le planning par email"}
        </button>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
        Génère un rapport complet de la semaine avec Claude AI et l&apos;envoie par email à <strong>Matheo.riba2a@gmail.com</strong>.
        Inclut rondes, interventions, NC, SET et les actions de la semaine à venir.
      </p>

      {result && (
        <div style={{
          backgroundColor: result.emailSent ? "#ECFDF5" : result.emailError?.includes("RESEND") ? "#FFFBEB" : "#FEF2F2",
          borderRadius: 10, padding: "12px 16px",
          border: `1px solid ${result.emailSent ? "#6EE7B7" : result.emailError?.includes("RESEND") ? "#FCD34D" : "#FCA5A5"}`,
        }}>
          {result.emailSent ? (
            <p style={{ margin: 0, fontSize: 13, color: "#065F46", fontWeight: 500 }}>
              ✅ Rapport envoyé avec succès à Matheo.riba2a@gmail.com
              {result.subject && <><br /><span style={{ fontWeight: 400, color: "#047857" }}>Objet : {result.subject}</span></>}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: result.emailError?.includes("RESEND") ? "#92400E" : "#991B1B" }}>
              {result.emailError?.includes("RESEND")
                ? "⚠️ Rapport généré mais non envoyé — configure RESEND_API_KEY dans .env.local"
                : `❌ ${result.emailError}`}
            </p>
          )}
          {result.stats && (
            <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(result.stats).map(([k, v]) => (
                <span key={k} style={{ fontSize: 11, color: "#374151", backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 6, padding: "2px 8px" }}>
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bloc Mémoire DT ──────────────────────────────────────────────────────────

function MemoireBlock() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cerveau/memories")
      .then((r) => r.json() as Promise<{ memories: Memory[] }>)
      .then((d) => setMemories(d.memories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addMemory() {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cerveau/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: newNote.trim() }),
      });
      const data = await res.json() as { memory?: Memory; error?: string };
      if (data.error) { setError(data.error); return; }
      if (data.memory) setMemories((prev) => [data.memory!, ...prev]);
      setNewNote("");
    } catch {
      setError("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMemory(id: string) {
    try {
      await fetch("/api/cerveau/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch { /* silencieux */ }
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Brain size={18} color="#7C3AED" />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>
          Mémoire du DT
        </h3>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
        Notes de terrain injectées dans le contexte IA. Ce que tu veux que TechOps se rappelle.
      </p>

      {/* Ajouter une note */}
      <div style={{ marginBottom: 16 }}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) { void addMemory(); } }}
          placeholder={"Ex : La chambre 112 disjoncte quand la clim et le sèche-cheveux sont allumés en même temps"}
          rows={2}
          style={{
            width: "100%", resize: "none", border: "1.5px solid rgba(0,0,0,0.1)",
            borderRadius: 12, padding: "10px 12px", fontSize: 13, color: "#111827",
            outline: "none", fontFamily: "inherit", lineHeight: 1.5,
            backgroundColor: "#F9FAFB", boxSizing: "border-box",
          }}
        />
        {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "4px 0 0" }}>{error}</p>}
        <button
          onClick={addMemory}
          disabled={saving || !newNote.trim()}
          style={{
            marginTop: 8, display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10, border: "none",
            background: saving || !newNote.trim() ? "#E5E7EB" : "#7C3AED",
            color: saving || !newNote.trim() ? "#9CA3AF" : "#FFFFFF",
            fontSize: 13, fontWeight: 600, cursor: saving || !newNote.trim() ? "not-allowed" : "pointer",
          }}
        >
          {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
          Mémoriser
        </button>
      </div>

      {/* Liste des notes */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12 }}>
          <Loader2 size={16} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>Chargement…</span>
        </div>
      ) : memories.length === 0 ? (
        <p style={{ fontSize: 13, color: "#D1D5DB", textAlign: "center", padding: "12px 0" }}>
          Aucune note mémorisée
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {memories.map((m) => (
            <div key={m.id} style={{
              backgroundColor: "#F5F3FF",
              border: "1px solid #DDD6FE",
              borderRadius: 10, padding: "10px 12px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5, flex: 1 }}>
                {m.contenu}
              </p>
              <button
                onClick={() => void deleteMemory(m.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}
              >
                <Trash2 size={13} color="#9CA3AF" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CerveauPage() {
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>

      <Header title="Cerveau de Cyrille" subtitle="Sofitel Ajaccio" />

      <main style={{
        padding: "24px 28px 48px",
        maxWidth: 1200, margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 24,
      }}>

        {/* BLOC 1 — Briefing du jour */}
        <BriefingCard />

        {/* BLOC 2 + 6 — Actions & Mémoire */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}
          className="cerveau-grid-main">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <ActionsBlock />
          </div>
          <MemoireBlock />
        </div>

        {/* BLOC 3 — Planning semaine */}
        <PlanningBlock />

        {/* BLOC 4 — Chat IA */}
        <ChatBlock />

        {/* BLOC 5 — Rapport hebdo */}
        <RapportBlock />

      </main>

      <style>{`
        @media (max-width: 900px) {
          .cerveau-grid-main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
