"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brain, RefreshCw, Send, Loader2, Trash2, Plus,
  ChevronRight, Phone, Clock, CheckCircle, Zap, Mail,
  Download, Wind, Droplets, Eye, Thermometer,
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

type ChatMessage = { role: "user" | "assistant"; content: string; ts: number };

type Memory = { id: string; contenu: string; tags: string[]; created_at: string };

type MeteoData = {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  description: string;
  icon: string;
  main: string;
  visibility: number;
  prochains: { heure: string; temp: number; icon: string; desc: string }[];
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITE_CONFIG: Record<ActionPriorite, { color: string; bg: string; border: string; label: string }> = {
  urgent:     { color: "#991B1B", bg: "#FEF2F2", border: "#EF4444", label: "URGENT" },
  important:  { color: "#92400E", bg: "#FFFBEB", border: "#F59E0B", label: "IMPORTANT" },
  surveiller: { color: "#1E40AF", bg: "#EFF6FF", border: "#3B82F6", label: "SURVEILLER" },
  ok:         { color: "#065F46", bg: "#ECFDF5", border: "#10B981", label: "RAS" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weatherEmoji(icon: string): string {
  const code = icon.replace("d", "").replace("n", "");
  const map: Record<string, string> = {
    "01": "☀️", "02": "⛅", "03": "🌥️", "04": "☁️",
    "09": "🌧️", "10": "🌦️", "11": "⛈️", "13": "❄️", "50": "🌫️",
  };
  return map[code] ?? "🌡️";
}

function windDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

/** Convertit **gras** en JSX */
function renderBriefing(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return <span key={i}>{parts}{i < text.split("\n").length - 1 ? <br /> : null}</span>;
  });
}

const BRIEFING_CACHE_KEY = "cerveau_briefing_v1";

function getBriefingCache(): { briefing: string; timestamp: string; date: string; day: string } | null {
  try {
    const raw = localStorage.getItem(BRIEFING_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { briefing: string; timestamp: string; date: string; day: string };
    const today = new Date().toDateString();
    if (cached.day !== today) return null; // expiré
    return cached;
  } catch { return null; }
}

function saveBriefingCache(briefing: string, timestamp: string, date: string) {
  try {
    localStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify({
      briefing, timestamp, date, day: new Date().toDateString(),
    }));
  } catch { /* silencieux */ }
}

// ─── Bloc Météo ────────────────────────────────────────────────────────────────

function MeteoCard() {
  const [meteo, setMeteo] = useState<MeteoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cerveau/meteo")
      .then((r) => r.json() as Promise<MeteoData>)
      .then((d) => { if (!("error" in d)) setMeteo(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: "14px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
      <Loader2 size={16} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#9CA3AF" }}>Météo Ajaccio…</span>
    </div>
  );

  if (!meteo) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
      borderRadius: 16, padding: "16px 22px",
      boxShadow: "0 4px 16px rgba(14,165,233,0.3)",
      color: "#FFFFFF",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>

        {/* Principal */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 52, lineHeight: 1 }}>{weatherEmoji(meteo.icon)}</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", color: "#BAE6FD", textTransform: "uppercase" }}>
              Ajaccio
            </p>
            <p style={{ margin: 0, fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>
              {meteo.temp}°<span style={{ fontSize: 20 }}>C</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#E0F2FE", textTransform: "capitalize" }}>
              {meteo.description}
            </p>
          </div>
        </div>

        {/* Détails */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <MeteoStat icon={<Thermometer size={14} />} label="Ressenti" value={`${meteo.feels_like}°C`} />
          <MeteoStat icon={<Droplets size={14} />} label="Humidité" value={`${meteo.humidity}%`} />
          <MeteoStat icon={<Wind size={14} />} label="Vent" value={`${meteo.wind_speed} km/h ${windDirection(meteo.wind_deg)}`} />
          <MeteoStat icon={<Eye size={14} />} label="Visibilité" value={`${meteo.visibility} km`} />
        </div>

        {/* Prévisions 3h */}
        {meteo.prochains.length > 0 && (
          <div style={{ display: "flex", gap: 12 }}>
            {meteo.prochains.map((p, i) => (
              <div key={i} style={{ textAlign: "center", padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#BAE6FD" }}>{p.heure}</p>
                <p style={{ margin: "4px 0", fontSize: 20 }}>{weatherEmoji(p.icon)}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{p.temp}°</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MeteoStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#BAE6FD" }}>
        {icon}
        <span style={{ fontSize: 11, color: "#BAE6FD" }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// ─── Bloc Briefing ────────────────────────────────────────────────────────────

function BriefingCard() {
  const [briefing, setBriefing] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);

  const load = async (force = false) => {
    setLoading(true);
    setError("");

    // Vérifier le cache si pas forcé
    if (!force) {
      const cached = getBriefingCache();
      if (cached) {
        setBriefing(cached.briefing);
        setTimestamp(cached.timestamp);
        setDate(cached.date);
        setFromCache(true);
        setLoading(false);
        return;
      }
    }

    setFromCache(false);
    try {
      const res = await fetch("/api/cerveau/briefing");
      const data = await res.json() as { briefing?: string; timestamp?: string; date?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Erreur serveur");
      const b = data.briefing ?? "";
      const t = data.timestamp ?? "";
      const d = data.date ?? "";
      setBriefing(b);
      setTimestamp(t);
      setDate(d);
      saveBriefingCache(b, t, d);
    } catch (e) {
      setError(`Erreur : ${e instanceof Error ? e.message : "inconnue"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%)",
      borderRadius: 20, padding: "24px 28px", color: "#FFFFFF",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
      <div style={{ position: "absolute", bottom: -20, right: 100, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Brain size={20} color="#93C5FD" strokeWidth={2} />
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Bonjour Cyrille ☀️</h2>
            <p style={{ margin: 0, fontSize: 12, color: "#93C5FD", marginTop: 1 }}>
              {date || new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 10, padding: "6px 12px",
            color: "#DBEAFE", fontSize: 12, fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Régénérer
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <Loader2 size={16} color="#93C5FD" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#BFDBFE", fontSize: 13 }}>Analyse de la situation…</span>
        </div>
      ) : error ? (
        <p style={{ color: "#FCA5A5", fontSize: 13, margin: 0 }}>{error}</p>
      ) : (
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.8, color: "#E0EFFE" }}>
          {renderBriefing(briefing)}
        </p>
      )}

      {/* Footer */}
      {!loading && !error && (
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "#93C5FD" }}>
          {fromCache ? `🗂 Briefing du matin • généré à ${timestamp}` : `✨ Généré à ${timestamp}`}
        </p>
      )}
    </div>
  );
}

// ─── Bloc Actions ─────────────────────────────────────────────────────────────

function ActionRow({ action, onFait, onCreerIntervention }: {
  action: ActionJour;
  onFait: (id: string) => void;
  onCreerIntervention: (action: ActionJour) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = PRIORITE_CONFIG[action.priorite];

  return (
    <div style={{
      borderRadius: 10, overflow: "hidden",
      border: `1px solid ${open ? cfg.border + "44" : "rgba(0,0,0,0.06)"}`,
      transition: "border-color 0.15s",
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", background: open ? cfg.bg : "#FFFFFF",
          border: "none", borderLeft: `3px solid ${cfg.border}`,
          cursor: "pointer", textAlign: "left", transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: 15, flexShrink: 0 }}>{action.emoji}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {action.titre}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {action.duree_estimee && (
            <span style={{ fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={10} /> {action.duree_estimee}
            </span>
          )}
          {action.contact?.tel && <Phone size={11} color="#9CA3AF" />}
          <ChevronRight size={13} color="#D1D5DB" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
        </span>
      </button>

      {open && (
        <div style={{ padding: "10px 12px 12px", borderTop: `1px solid ${cfg.border}22`, backgroundColor: cfg.bg }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#4B5563", lineHeight: 1.6 }}>{action.description}</p>
          {action.contact && (
            <a href={`tel:${action.contact.tel}`} style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8,
              padding: "5px 10px", backgroundColor: "#FFFFFF", border: `1px solid ${cfg.border}`,
              borderRadius: 8, textDecoration: "none", fontSize: 12, fontWeight: 600, color: cfg.color,
            }}>
              <Phone size={11} /> {action.contact.nom} — {action.contact.tel}
            </a>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onFait(action.id)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
              borderRadius: 8, border: `1px solid ${cfg.border}`, backgroundColor: "#FFFFFF",
              color: cfg.color, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              <CheckCircle size={12} /> Fait
            </button>
            {(action.source === "set" || action.source === "intervention") && (
              <button onClick={() => onCreerIntervention(action)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                borderRadius: 8, border: "none", backgroundColor: cfg.border,
                color: "#FFFFFF", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
                <Zap size={12} /> Créer intervention
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionsBlock() {
  const [actions, setActions] = useState<ActionJour[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showSecondaires, setShowSecondaires] = useState(false);

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
  const secondaires = visible.filter((a) => a.priorite === "surveiller" || a.priorite === "ok");
  const primaires = [...urgent, ...important];

  function handleFait(id: string) { setDismissed((prev) => new Set([...prev, id])); }

  function handleCreerIntervention(action: ActionJour) {
    const params = new URLSearchParams({ titre: action.titre.slice(0, 100), description: action.description, priorite: action.priorite === "urgent" ? "urgente" : "normale" });
    window.location.href = `/interventions?${params.toString()}`;
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Actions du jour</h3>
          {urgent.length > 0 && (
            <span style={{ backgroundColor: "#EF4444", color: "#FFF", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
              {urgent.length} urgent{urgent.length > 1 ? "s" : ""}
            </span>
          )}
          {important.length > 0 && (
            <span style={{ backgroundColor: "#FEF3C7", color: "#92400E", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
              {important.length} important{important.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {dismissed.size > 0 && (
          <button onClick={() => setDismissed(new Set())} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>
            Réafficher
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
          <Loader2 size={15} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#9CA3AF", fontSize: 13 }}>Analyse…</span>
        </div>
      ) : primaires.length === 0 && secondaires.length === 0 ? (
        <div style={{ padding: "14px", backgroundColor: "#ECFDF5", borderRadius: 10, textAlign: "center", fontSize: 13, color: "#065F46" }}>
          ✅ Tout est sous contrôle — bonne journée !
        </div>
      ) : (
        <>
          {/* Liste scrollable */}
          <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5, paddingRight: 2 }}>
            {primaires.map((a) => (
              <ActionRow key={a.id} action={a} onFait={handleFait} onCreerIntervention={handleCreerIntervention} />
            ))}
          </div>

          {/* Secondaires masquées */}
          {secondaires.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowSecondaires((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9CA3AF", fontWeight: 500, padding: "2px 0" }}
              >
                <ChevronRight size={12} style={{ transform: showSecondaires ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                {showSecondaires ? "Masquer" : `${secondaires.length} élément${secondaires.length > 1 ? "s" : ""} secondaire${secondaires.length > 1 ? "s" : ""}`}
              </button>
              {showSecondaires && (
                <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5, marginTop: 5 }}>
                  {secondaires.map((a) => (
                    <ActionRow key={a.id} action={a} onFait={handleFait} onCreerIntervention={handleCreerIntervention} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setHistory((h) => [...h, { role: "user", content: msg, ts: Date.now() }]);
    setLoading(true);
    try {
      const res = await fetch("/api/cerveau/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: history.map((h) => ({ role: h.role, content: h.content })) }),
      });
      const data = await res.json() as { response?: string; error?: string };
      setHistory((h) => [...h, { role: "assistant", content: data.response ?? data.error ?? "Erreur.", ts: Date.now() }]);
    } catch {
      setHistory((h) => [...h, { role: "assistant", content: "Erreur de connexion.", ts: Date.now() }]);
    } finally { setLoading(false); }
  }

  const SUGGESTIONS = [
    "Quand est-ce qu'APAVE est venu ?", "Combien j'ai dépensé ce mois ?",
    "Suis-je prêt pour la commission de sécurité ?", "Qu'est-ce qui s'est passé cette semaine ?",
  ];

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <Brain size={17} color="#2563EB" />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Demande à TechOps</h3>
      </div>

      <div style={{ padding: "14px 18px", minHeight: 180, maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {history.length === 0 ? (
          <div>
            <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", margin: "12px 0 14px" }}>Pose une question sur ton hôtel…</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)} style={{ background: "#F3F4F6", border: "none", borderRadius: 20, padding: "7px 13px", fontSize: 12, color: "#374151", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((msg) => (
            <div key={msg.ts} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
              <div style={{
                maxWidth: "78%",
                backgroundColor: msg.role === "user" ? "#2563EB" : "#F3F4F6",
                color: msg.role === "user" ? "#FFFFFF" : "#111827",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "9px 13px", fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: "flex", gap: 5, padding: "8px 12px", backgroundColor: "#F3F4F6", borderRadius: "18px 18px 18px 4px", width: "fit-content" }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#9CA3AF", animation: `bounce 1.2s infinite ${d}s`, display: "block" }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Ex : Quand est-ce qu'APAVE est venu ?"
          rows={1}
          style={{ flex: 1, resize: "none", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "9px 13px", fontSize: 13.5, color: "#111827", outline: "none", fontFamily: "inherit", lineHeight: 1.5, backgroundColor: "#F9FAFB" }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          width: 38, height: 38, borderRadius: 10, border: "none",
          background: loading || !input.trim() ? "#E5E7EB" : "linear-gradient(135deg, #2563EB, #1D4ED8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: loading || !input.trim() ? "not-allowed" : "pointer", flexShrink: 0,
        }}>
          <Send size={15} color={loading || !input.trim() ? "#9CA3AF" : "#FFFFFF"} />
        </button>
      </div>
      {history.length > 0 && (
        <div style={{ padding: "0 14px 10px" }}>
          <button onClick={() => setHistory([])} style={{ fontSize: 11, color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}>
            Effacer la conversation
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Bloc Rapport Hebdo ───────────────────────────────────────────────────────

type RapportResult = {
  emailSent?: boolean;
  emailError?: string;
  stats?: Record<string, unknown>;
  subject?: string;
  htmlBody?: string;
};

function RapportBlock() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RapportResult | null>(null);

  async function generer() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cerveau/rapport-hebdo", { method: "POST" });
      const data = await res.json() as RapportResult;
      setResult(data);
    } catch {
      setResult({ emailError: "Erreur réseau" });
    } finally { setLoading(false); }
  }

  function telecharger() {
    if (!result?.htmlBody) return;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${result.subject ?? "Rapport"}</title></head><body>${result.htmlBody}</body></html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-hebdo-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Mail size={17} color="#2563EB" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Rapport Hebdomadaire</h3>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {result?.htmlBody && (
            <button onClick={telecharger} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10, border: "1px solid #E5E7EB",
              backgroundColor: "#F9FAFB", color: "#374151",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Download size={13} /> Télécharger
            </button>
          )}
          <button onClick={generer} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10, border: "none",
            background: loading ? "#E5E7EB" : "linear-gradient(135deg, #2563EB, #1D4ED8)",
            color: loading ? "#9CA3AF" : "#FFFFFF",
            fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 2px 8px rgba(37,99,235,0.25)",
          }}>
            {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={13} />}
            {loading ? "Génération…" : "Envoyer par email"}
          </button>
        </div>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
        Génère un rapport complet de la semaine avec Claude et l&apos;envoie à <strong>Matheo.riba2a@gmail.com</strong>.
      </p>

      {result && (
        <div style={{
          backgroundColor: result.emailSent ? "#ECFDF5" : result.emailError?.includes("RESEND") ? "#FFFBEB" : "#FEF2F2",
          borderRadius: 10, padding: "10px 14px",
          border: `1px solid ${result.emailSent ? "#6EE7B7" : result.emailError?.includes("RESEND") ? "#FCD34D" : "#FCA5A5"}`,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: result.emailSent ? "#065F46" : result.emailError?.includes("RESEND") ? "#92400E" : "#991B1B", fontWeight: 500 }}>
            {result.emailSent
              ? `✅ Rapport envoyé à Matheo.riba2a@gmail.com`
              : result.emailError?.includes("RESEND")
                ? "⚠️ Rapport généré — configure RESEND_API_KEY pour l'envoi email"
                : `❌ ${result.emailError}`}
          </p>
          {result.stats && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(result.stats).map(([k, v]) => (
                <span key={k} style={{ fontSize: 11, color: "#374151", backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 6, padding: "2px 8px" }}>
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
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/cerveau/memories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: newNote.trim() }),
      });
      const data = await res.json() as { memory?: Memory; error?: string };
      if (data.error) { setError(data.error); return; }
      if (data.memory) setMemories((prev) => [data.memory!, ...prev]);
      setNewNote("");
    } catch { setError("Erreur de sauvegarde"); }
    finally { setSaving(false); }
  }

  async function deleteMemory(id: string) {
    await fetch("/api/cerveau/memories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Brain size={17} color="#7C3AED" />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Mémoire du DT</h3>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
        Notes injectées dans le contexte IA.
      </p>

      <textarea
        value={newNote} onChange={(e) => setNewNote(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) void addMemory(); }}
        placeholder="Ex : Chambre 112 — disjoncte avec clim + sèche-cheveux"
        rows={2}
        style={{ width: "100%", resize: "none", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "9px 11px", fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit", lineHeight: 1.5, backgroundColor: "#F9FAFB", boxSizing: "border-box" }}
      />
      {error && <p style={{ fontSize: 12, color: "#EF4444", margin: "4px 0 0" }}>{error}</p>}
      <button onClick={addMemory} disabled={saving || !newNote.trim()} style={{
        marginTop: 8, display: "flex", alignItems: "center", gap: 5,
        padding: "7px 14px", borderRadius: 9, border: "none",
        background: saving || !newNote.trim() ? "#E5E7EB" : "#7C3AED",
        color: saving || !newNote.trim() ? "#9CA3AF" : "#FFFFFF",
        fontSize: 12, fontWeight: 600, cursor: saving || !newNote.trim() ? "not-allowed" : "pointer",
      }}>
        {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
        Mémoriser
      </button>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2 size={14} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>Chargement…</span>
          </div>
        ) : memories.length === 0 ? (
          <p style={{ fontSize: 12, color: "#D1D5DB", textAlign: "center" }}>Aucune note</p>
        ) : (
          memories.map((m) => (
            <div key={m.id} style={{ backgroundColor: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 9, padding: "9px 11px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5, flex: 1 }}>{m.contenu}</p>
              <button onClick={() => void deleteMemory(m.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                <Trash2 size={12} color="#9CA3AF" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CerveauPage() {
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
        @media (max-width: 900px) { .cerveau-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <Header title="Cerveau de Cyrille" subtitle="Sofitel Ajaccio" />

      <main style={{ padding: "20px 24px 48px", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Météo */}
        <MeteoCard />

        {/* Briefing */}
        <BriefingCard />

        {/* Actions + Mémoire */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }} className="cerveau-grid">
          <ActionsBlock />
          <MemoireBlock />
        </div>

        {/* Chat IA */}
        <ChatBlock />

        {/* Rapport hebdo */}
        <RapportBlock />

      </main>
    </>
  );
}
