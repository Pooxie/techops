"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Map,
  Wrench,
  Zap,
  RefreshCw,
  CheckSquare,
  AlertTriangle,
  Users,
  FolderOpen,
  UserCog,
  ChevronUp,
  LogOut,
  Mail,
  ShieldCheck,
  BedDouble,
  Droplets,
  Fuel,
  Receipt,
  Brain,
  type LucideIcon,
} from "lucide-react";
import {
  fetchCurrentUserSummary,
  signOutCurrentUser,
  type CurrentUserSummary,
} from "@/lib/supabase";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
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
      { href: "/cerveau",   label: "Cerveau de Cyrille", icon: Brain },
    ],
  },
  {
    title: "Exploitation",
    items: [
      { href: "/equipements",  label: "Équipements",   icon: Wrench },
      { href: "/interventions",label: "Interventions", icon: Zap },
      { href: "/chambres",     label: "Chambres",      icon: BedDouble },
      { href: "/piscine",      label: "Registre Sanitaire", icon: Droplets },
      { href: "/fuel",         label: "Suivi Fuel",    icon: Fuel },
      { href: "/depenses",     label: "Dépenses",      icon: Receipt },
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

function roleLabel(role: "technicien" | "dt") {
  return role === "dt" ? "Directeur Technique" : "Technicien";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<CurrentUserSummary | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [cerveauBadge, setCerveauBadge] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCurrentUserSummary()
      .then((user) => {
        if (!active) return;
        setProfile(user);
      })
      .catch(() => {
        if (!active) return;
        setProfileError("Impossible de charger le profil.");
      })
      .finally(() => {
        if (!active) return;
        setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Fetch badge urgent count pour le Cerveau
  useEffect(() => {
    let active = true;
    fetch("/api/cerveau/actions")
      .then((r) => r.json() as Promise<{ urgentCount?: number }>)
      .then((d) => { if (active) setCerveauBadge(d.urgentCount ?? 0); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = useMemo(() => {
    const prenom = profile?.prenom?.[0] ?? "";
    const nom = profile?.nom?.[0] ?? "";
    return `${prenom}${nom}`.toUpperCase() || "TU";
  }, [profile]);

  async function handleSignOut() {
    setSigningOut(true);
    setProfileError(null);
    try {
      await signOutCurrentUser();
      router.push("/login");
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Déconnexion impossible.");
      setSigningOut(false);
    }
  }

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
        {/* Logo Sofitel — deux losanges arrondis entrelacés */}
        <div
          style={{
            width: 44,
            height: 30,
            borderRadius: 10,
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.30)",
          }}
        >
          <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
            <rect x="-6" y="-6" width="12" height="12" rx="4.5"
              transform="translate(9,9) scale(1,0.78) rotate(45)"
              stroke="white" strokeWidth="2.2"/>
            <rect x="-6" y="-6" width="12" height="12" rx="4.5"
              transform="translate(17,9) scale(1,0.78) rotate(45)"
              stroke="white" strokeWidth="2.2"/>
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
                const badge = item.href === "/cerveau" ? cerveauBadge : 0;
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
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {badge > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, borderRadius: 9,
                          backgroundColor: "#FF3B30", color: "#FFFFFF",
                          fontSize: 10, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "0 5px", flexShrink: 0,
                        }}>
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
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
        ref={menuRef}
        style={{
          position: "relative",
          padding: "12px 16px 16px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: "calc(100% + 8px)",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.14)",
              padding: 8,
            }}
          >
            <div
              style={{
                padding: "10px 12px 12px",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                marginBottom: 6,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>
                {profile ? `${profile.prenom} ${profile.nom}` : "Compte connecté"}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#8E8E93" }}>
                La déconnexion fermera la session active sur cet appareil.
              </p>
            </div>

            {profile?.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#6E6E73" }}>
                <Mail size={14} />
                <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile.email}
                </span>
              </div>
            )}

            {profile?.role && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#6E6E73" }}>
                <ShieldCheck size={14} />
                <span style={{ fontSize: 12 }}>
                  {roleLabel(profile.role)}
                </span>
              </div>
            )}

            {profileError && (
              <div
                style={{
                  margin: "6px 8px 8px",
                  padding: "10px 12px",
                  borderRadius: 10,
                  backgroundColor: "#FFF1F0",
                  color: "#B42318",
                  fontSize: 12,
                }}
              >
                {profileError}
              </div>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                width: "100%",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border: "1px solid rgba(255,59,48,0.18)",
                backgroundColor: "#FFF1F0",
                color: "#FF3B30",
                borderRadius: 12,
                padding: "11px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: signingOut ? "not-allowed" : "pointer",
              }}
            >
              <LogOut size={14} />
              {signingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Ouvrir le menu utilisateur"
        >
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
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
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
              {loadingProfile ? "Chargement..." : profile ? `${profile.prenom} ${profile.nom}` : "Utilisateur"}
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
              {loadingProfile ? "Session en cours" : profile ? roleLabel(profile.role) : "Menu utilisateur"}
            </p>
          </div>
          <ChevronUp
            size={16}
            color="#AEAEB2"
            style={{
              flexShrink: 0,
              transform: menuOpen ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.15s ease",
            }}
          />
        </button>
      </div>
    </aside>
  );
}
