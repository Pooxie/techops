"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Zap,
  RefreshCw,
  CheckSquare,
  AlertTriangle,
  Users,
  FolderOpen,
  UserCog,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Général",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/planning",  label: "Planning",        icon: Calendar },
    ],
  },
  {
    title: "Exploitation",
    items: [
      { href: "/equipements",  label: "Équipements",   icon: Wrench },
      { href: "/interventions",label: "Interventions", icon: Zap },
      { href: "/rondes",       label: "Rondes",        icon: RefreshCw },
    ],
  },
  {
    title: "Pilotage",
    items: [
      { href: "/set",            label: "Contrôles SET",    icon: CheckSquare },
      { href: "/non-conformites",label: "Non-conformités",  icon: AlertTriangle },
      { href: "/prestataires",   label: "Prestataires",     icon: Users },
      { href: "/documents",      label: "Documents",        icon: FolderOpen },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/techniciens", label: "Techniciens", icon: UserCog },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 h-full z-40"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: "var(--topbar-height)",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {/* Icône carré bleu arrondi */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.30)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h2.5M7 4v8M10.5 6v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#1D1D1F",
            letterSpacing: "-0.3px",
          }}
        >
          TechOps
        </span>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 12px",
        }}
      >
        {navSections.map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.9px",
                textTransform: "uppercase",
                color: "#AEAEB2",
                padding: "0 10px",
                marginBottom: 4,
                marginTop: 0,
              }}
            >
              {section.title}
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "7px 10px",
                        borderRadius: 9,
                        fontSize: 13.5,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "#2563EB" : "#6E6E73",
                        backgroundColor: isActive ? "#EFF6FF" : "transparent",
                        textDecoration: "none",
                        transition: "background 0.12s, color 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F5F7";
                          (e.currentTarget as HTMLElement).style.color = "#1D1D1F";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "#6E6E73";
                        }
                      }}
                    >
                      <Icon
                        size={15}
                        strokeWidth={isActive ? 2.5 : 2}
                        style={{ flexShrink: 0 }}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Profil utilisateur */}
      <div
        style={{
          padding: "12px 16px 16px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#FFFFFF",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
            }}
          >
            CB
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1D1D1F",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Cyrille Buresi
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#AEAEB2",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Directeur Technique
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
