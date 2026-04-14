"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import {
  ExternalLink,
  Check,
  RefreshCw,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

type Article = {
  id: string;
  titre: string;
  resume: string;
  source_url: string | null;
  source_nom: string | null;
  date_publication: string | null;
  date_entree_vigueur: string | null;
  domaine: string;
  impact: string;
  lu: boolean;
  created_at: string;
};

type FiltreDomaine = "Tous" | "Sécurité" | "Environnement" | "Technique" | "Général";
type FiltreImpact = "Tous" | "Fort" | "Moyen" | "Faible";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function impactStyle(impact: string): { bg: string; color: string; label: string } {
  switch (impact) {
    case "Fort":
      return { bg: "#FFF1F0", color: "#FF3B30", label: "FORT" };
    case "Moyen":
      return { bg: "#FFF5E6", color: "#FF9500", label: "MOYEN" };
    default:
      return { bg: "#F5F5F7", color: "#6E6E73", label: "FAIBLE" };
  }
}

function domaineStyle(domaine: string): { bg: string; color: string } {
  switch (domaine) {
    case "Sécurité":
      return { bg: "#FFF1F0", color: "#FF3B30" };
    case "Environnement":
      return { bg: "#F0FDF4", color: "#34C759" };
    case "Technique":
      return { bg: "#EFF6FF", color: "#2563EB" };
    default:
      return { bg: "#F5F5F7", color: "#6E6E73" };
  }
}

export default function VeillePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtreDomaine, setFiltreDomaine] = useState<FiltreDomaine>("Tous");
  const [filtreImpact, setFiltreImpact] = useState<FiltreImpact>("Tous");
  const [nonLusSeulement, setNonLusSeulement] = useState(false);
  const [derniereMaj, setDerniereMaj] = useState<string | null>(null);
  const [markingLu, setMarkingLu] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("veille_reglementaire")
        .select("*")
        .eq("hotel_id", HOTEL_ID)
        .order("created_at", { ascending: false });

      const list = (data ?? []) as Article[];
      setArticles(list);
      if (list.length > 0) setDerniereMaj(list[0].created_at);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/veille/scrape");
      await loadArticles();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMarquerLu(id: string) {
    setMarkingLu(id);
    try {
      await fetch(`/api/veille/${id}/lu`, { method: "PATCH" });
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, lu: true } : a))
      );
    } finally {
      setMarkingLu(null);
    }
  }

  // Filtrage côté client
  const articlesFiltres = articles.filter((a) => {
    if (filtreDomaine !== "Tous" && a.domaine !== filtreDomaine) return false;
    if (filtreImpact !== "Tous" && a.impact !== filtreImpact) return false;
    if (nonLusSeulement && a.lu) return false;
    return true;
  });

  const nonLusCount = articles.filter((a) => !a.lu).length;

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: 860,
        margin: "0 auto",
        paddingBottom: 80,
      }}
    >
      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1D1D1F",
                margin: 0,
                letterSpacing: "-0.4px",
              }}
            >
              Veille Réglementaire
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "#6E6E73",
                margin: "4px 0 0",
              }}
            >
              Mise à jour automatique chaque matin à 7h
              {derniereMaj && (
                <span>
                  {" "}
                  · Dernière mise à jour le{" "}
                  <strong style={{ color: "#1D1D1F" }}>
                    {formatDate(derniereMaj)}
                  </strong>
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid rgba(37,99,235,0.25)",
              backgroundColor: "#EFF6FF",
              color: "#2563EB",
              fontSize: 13,
              fontWeight: 600,
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              opacity: refreshing || loading ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : undefined,
              }}
            />
            {refreshing ? "Actualisation…" : "Actualiser maintenant"}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        {/* Filtre domaine */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(["Tous", "Sécurité", "Environnement", "Technique", "Général"] as FiltreDomaine[]).map(
            (d) => (
              <button
                key={d}
                type="button"
                onClick={() => setFiltreDomaine(d)}
                style={{
                  padding: "6px 13px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor:
                    filtreDomaine === d ? "#2563EB" : "rgba(0,0,0,0.10)",
                  backgroundColor: filtreDomaine === d ? "#EFF6FF" : "#FFFFFF",
                  color: filtreDomaine === d ? "#2563EB" : "#6E6E73",
                  fontSize: 12.5,
                  fontWeight: filtreDomaine === d ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {d}
              </button>
            )
          )}
        </div>

        <div
          style={{
            width: 1,
            height: 20,
            backgroundColor: "rgba(0,0,0,0.10)",
            margin: "0 4px",
          }}
        />

        {/* Filtre impact */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["Tous", "Fort", "Moyen", "Faible"] as FiltreImpact[]).map((i) => {
            const s = i !== "Tous" ? impactStyle(i) : null;
            const active = filtreImpact === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setFiltreImpact(i)}
                style={{
                  padding: "6px 13px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: active
                    ? s?.color ?? "#2563EB"
                    : "rgba(0,0,0,0.10)",
                  backgroundColor: active ? s?.bg ?? "#EFF6FF" : "#FFFFFF",
                  color: active ? s?.color ?? "#2563EB" : "#6E6E73",
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {i}
              </button>
            );
          })}
        </div>

        <div
          style={{
            width: 1,
            height: 20,
            backgroundColor: "rgba(0,0,0,0.10)",
            margin: "0 4px",
          }}
        />

        {/* Toggle non lus */}
        <button
          type="button"
          onClick={() => setNonLusSeulement((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 13px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: nonLusSeulement ? "#2563EB" : "rgba(0,0,0,0.10)",
            backgroundColor: nonLusSeulement ? "#EFF6FF" : "#FFFFFF",
            color: nonLusSeulement ? "#2563EB" : "#6E6E73",
            fontSize: 12.5,
            fontWeight: nonLusSeulement ? 600 : 400,
            cursor: "pointer",
          }}
        >
          <BookOpen size={13} />
          Non lus
          {nonLusCount > 0 && (
            <span
              style={{
                backgroundColor: nonLusSeulement ? "#2563EB" : "#FF3B30",
                color: "#FFFFFF",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              {nonLusCount}
            </span>
          )}
        </button>
      </div>

      {/* Liste des articles */}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.05)",
                padding: 20,
                height: 140,
                animation: "pulse 1.5s ease-in-out infinite",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : articlesFiltres.length === 0 ? (
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.05)",
            padding: "48px 24px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#F5F5F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <BookOpen size={22} color="#AEAEB2" />
          </div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#1D1D1F",
              margin: "0 0 6px",
            }}
          >
            Aucune nouvelle réglementation détectée
          </p>
          <p style={{ fontSize: 13, color: "#6E6E73", margin: 0 }}>
            {nonLusSeulement || filtreDomaine !== "Tous" || filtreImpact !== "Tous"
              ? "Modifiez les filtres pour voir plus d'articles."
              : "Prochaine vérification demain à 7h."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {articlesFiltres.map((article) => {
            const imp = impactStyle(article.impact);
            const dom = domaineStyle(article.domaine);
            return (
              <div
                key={article.id}
                style={{
                  backgroundColor: article.lu ? "#FFFFFF" : "#EFF6FF",
                  borderRadius: 16,
                  border: `1px solid ${article.lu ? "rgba(0,0,0,0.05)" : "rgba(37,99,235,0.15)"}`,
                  padding: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  opacity: article.lu ? 0.75 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {/* Ligne 1 : badges + date */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Badge impact */}
                  <span
                    style={{
                      backgroundColor: imp.bg,
                      color: imp.color,
                      borderRadius: 6,
                      padding: "3px 9px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {imp.label}
                  </span>

                  {/* Badge domaine */}
                  <span
                    style={{
                      backgroundColor: dom.bg,
                      color: dom.color,
                      borderRadius: 6,
                      padding: "3px 9px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {article.domaine}
                  </span>

                  {/* Date */}
                  <span
                    style={{
                      fontSize: 12,
                      color: "#AEAEB2",
                      marginLeft: "auto",
                    }}
                  >
                    {formatDate(article.date_publication ?? article.created_at)}
                  </span>
                </div>

                {/* Titre */}
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#1D1D1F",
                    margin: "0 0 8px",
                    lineHeight: 1.4,
                  }}
                >
                  {article.titre}
                </p>

                {/* Résumé */}
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#6E6E73",
                    margin: "0 0 14px",
                    lineHeight: 1.6,
                  }}
                >
                  {article.resume}
                </p>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {article.source_url && (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 13px",
                        borderRadius: 8,
                        border: "1px solid rgba(0,0,0,0.10)",
                        backgroundColor: "#FFFFFF",
                        color: "#2563EB",
                        fontSize: 12.5,
                        fontWeight: 600,
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                    >
                      <ExternalLink size={13} />
                      Consulter la source
                    </a>
                  )}

                  {!article.lu && (
                    <button
                      type="button"
                      onClick={() => handleMarquerLu(article.id)}
                      disabled={markingLu === article.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 13px",
                        borderRadius: 8,
                        border: "1px solid rgba(52,199,89,0.30)",
                        backgroundColor: "#F0FDF4",
                        color: "#34C759",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor:
                          markingLu === article.id ? "not-allowed" : "pointer",
                        opacity: markingLu === article.id ? 0.6 : 1,
                      }}
                    >
                      <Check size={13} />
                      {markingLu === article.id ? "Marquage…" : "Marquer comme lu"}
                    </button>
                  )}

                  {article.lu && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        color: "#AEAEB2",
                        fontStyle: "italic",
                      }}
                    >
                      <Check size={12} />
                      Lu
                    </span>
                  )}

                  {article.date_entree_vigueur && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginLeft: "auto",
                        fontSize: 12,
                        color: "#6E6E73",
                      }}
                    >
                      <AlertTriangle size={12} color="#FF9500" />
                      En vigueur le {formatDate(article.date_entree_vigueur)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
