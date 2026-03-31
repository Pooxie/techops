"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Plus, X } from "lucide-react";
import Link from "next/link";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type NotificationRecord,
} from "@/lib/supabase";

type HeaderProps = {
  title: string;
  subtitle?: string;
};

function formatNotifDate(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const QUICK_ACTIONS = [
  { label: "Intervention",       href: "/interventions",     emoji: "🔧" },
  { label: "Non-conformité",     href: "/non-conformites",   emoji: "⚠️" },
  { label: "Ronde ouverture",    href: "/rondes/ouverture",  emoji: "🌅" },
  { label: "Ronde fermeture",    href: "/rondes/fermeture",  emoji: "🌙" },
];

export default function Header({ title, subtitle = "Sofitel Ajaccio" }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);

  // Fermer dropdowns au clic extérieur
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setActionOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Charger notifications à l'ouverture
  useEffect(() => {
    if (!notifOpen) return;
    setLoadingNotif(true);
    fetchNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoadingNotif(false));
  }, [notifOpen]);

  const unreadCount = notifications.filter((n) => !n.lue).length;

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
  }

  return (
    <header
      className="px-6 max-md:px-3"
      style={{
        height: "var(--topbar-height)",
        backgroundColor: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="topbar-subtitle" style={{ fontSize: 13, fontWeight: 400, color: "#AEAEB2" }}>
          {subtitle}
        </span>
        <span className="topbar-sep" style={{ fontSize: 13, color: "#D1D1D6" }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{title}</span>
      </div>

      {/* Actions droite */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

        {/* ── Cloche notifications ── */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setNotifOpen((v) => !v); setActionOpen(false); }}
            style={{
              width: 34, height: 34, borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              backgroundColor: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              position: "relative",
            }}
            aria-label="Notifications"
          >
            <Bell size={15} color="#6E6E73" strokeWidth={2} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -5,
                minWidth: 16, height: 16, borderRadius: 8,
                backgroundColor: "#FF3B30", color: "#FFFFFF",
                fontSize: 10, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1.5px solid #FFFFFF",
                padding: "0 3px",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 320, backgroundColor: "#FFFFFF",
              borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              zIndex: 100, overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 16px 10px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>Notifications</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Tout marquer lu
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                    <X size={14} color="#8E8E93" />
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {loadingNotif ? (
                  <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0, padding: "20px 16px", textAlign: "center" }}>
                    Chargement…
                  </p>
                ) : notifications.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0, padding: "24px 16px", textAlign: "center" }}>
                    Aucune notification
                  </p>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "11px 16px",
                        borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                        backgroundColor: n.lue ? "#FFFFFF" : "#F8FAFF",
                        display: "flex", alignItems: "flex-start", gap: 10,
                      }}
                    >
                      {!n.lue && (
                        <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563EB", marginTop: 5, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, color: "#1D1D1F", margin: "0 0 2px", lineHeight: 1.4 }}>{n.message}</p>
                        <p style={{ fontSize: 11, color: "#AEAEB2", margin: 0 }}>{formatNotifDate(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Bouton + Nouveau ── */}
        <div ref={actionRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setActionOpen((v) => !v); setNotifOpen(false); }}
            style={{
              height: 34, padding: "0 14px", borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#FFFFFF",
              boxShadow: "0 2px 8px rgba(37,99,235,0.30)",
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="topbar-nouveau-text">Nouveau</span>
          </button>

          {actionOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 220, backgroundColor: "#FFFFFF",
              borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              zIndex: 100, padding: 6,
            }}>
              {QUICK_ACTIONS.map(({ label, href, emoji }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setActionOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14, color: "#1D1D1F", fontWeight: 500,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F5F7")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span style={{ fontSize: 15 }}>{emoji}</span>
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
