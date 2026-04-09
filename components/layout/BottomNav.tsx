"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Zap, RefreshCw, CheckSquare, MoreHorizontal,
  Calendar, Map, Wrench, AlertTriangle, Users, FileText, Building2, X,
  BedDouble, Droplets, Fuel, Receipt,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type NavTab = { href: string; label: string; icon: LucideIcon };

const mainTabs: NavTab[] = [
  { href: "/dashboard",     label: "Accueil",       icon: LayoutDashboard },
  { href: "/interventions", label: "Interventions", icon: Zap },
  { href: "/rondes",        label: "Rondes",        icon: RefreshCw },
  { href: "/set",           label: "SET",           icon: CheckSquare },
];

const moreTabs: NavTab[] = [
  { href: "/plan",             label: "Plan hôtel",       icon: Map },
  { href: "/chambres",         label: "Chambres",         icon: BedDouble },
  { href: "/piscine",          label: "Registre piscine", icon: Droplets },
  { href: "/fuel",             label: "Suivi Fuel",       icon: Fuel },
  { href: "/depenses",         label: "Dépenses",         icon: Receipt },
  { href: "/planning",         label: "Planning",         icon: Calendar },
  { href: "/equipements",      label: "Équipements",      icon: Wrench },
  { href: "/non-conformites",  label: "Non-conformités",  icon: AlertTriangle },
  { href: "/prestataires",     label: "Prestataires",     icon: Building2 },
  { href: "/documents",        label: "Documents",        icon: FileText },
  { href: "/techniciens",      label: "Techniciens",      icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreTabs.some(t => pathname === t.href);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[1000]"
        style={{ height: "var(--bottom-nav-height)", backgroundColor: "#FFFFFF", borderTop: "1px solid rgba(0,0,0,0.08)" }}
      >
        <ul style={{ display: "flex", height: "100%", margin: 0, padding: "0 4px", listStyle: "none" }}>
          {mainTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <li key={tab.href} style={{ flex: 1 }}>
                <Link
                  href={tab.href}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 3, color: isActive ? "#2563EB" : "#AEAEB2", textDecoration: "none" }}
                >
                  <div style={{ width: 36, height: 28, borderRadius: 8, backgroundColor: isActive ? "#EFF6FF" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: "0.1px" }}>{tab.label}</span>
                </Link>
              </li>
            );
          })}

          {/* Bouton Plus */}
          <li style={{ flex: 1 }}>
            <button
              onClick={() => setShowMore(true)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: 3, color: isMoreActive ? "#2563EB" : "#AEAEB2", background: "none", border: "none", cursor: "pointer" }}
            >
              <div style={{ width: 36, height: 28, borderRadius: 8, backgroundColor: isMoreActive ? "#EFF6FF" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: 10, fontWeight: isMoreActive ? 700 : 400, letterSpacing: "0.1px" }}>Plus</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Sheet "Plus" */}
      {showMore && (
        <>
          <div
            onClick={() => setShowMore(false)}
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)", zIndex: 1100 }}
          />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "16px 16px 48px", zIndex: 1101 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>Navigation</span>
              <button onClick={() => setShowMore(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} color="#8E8E93" />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setShowMore(false)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 8, padding: "16px 8px", borderRadius: 14, textDecoration: "none",
                      backgroundColor: isActive ? "#EFF6FF" : "#F5F5F7",
                      border: isActive ? "1.5px solid #2563EB" : "1.5px solid transparent",
                    }}
                  >
                    <Icon size={22} color={isActive ? "#2563EB" : "#6E6E73"} strokeWidth={isActive ? 2.5 : 2} />
                    <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? "#2563EB" : "#1D1D1F", textAlign: "center", lineHeight: 1.3 }}>
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
