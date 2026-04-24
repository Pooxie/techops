"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Map,
  Wrench,
  ClipboardList,
  AlertTriangle,
  FolderOpen,
  ChevronUp,
  LogOut,
  Mail,
  ShieldCheck,
  BedDouble,
  Droplets,
  Receipt,
  Gauge,
  Brain,
  Settings,
  Briefcase,
  HardHat,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import {
  fetchCurrentUserSummary,
  signOutCurrentUser,
  createClient,
  type CurrentUserSummary,
} from "@/lib/supabase";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

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
    title: "Tableau de bord",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/cerveau",   label: "Cerveau IA",       icon: Brain },
      { href: "/plan",      label: "Plan de l'hôtel",  icon: Map },
    ],
  },
  {
    title: "Exploitation",
    items: [
      { href: "/rondes",        label: "Rondes",        icon: ClipboardList },
      { href: "/interventions", label: "Interventions", icon: Wrench },
      { href: "/planning",      label: "Planning",      icon: Calendar },
      { href: "/chambres",      label: "Chambres",      icon: BedDouble },
    ],
  },
  {
    title: "Réglementaire",
    items: [
      { href: "/set",             label: "Contrôles SET",        icon: ShieldCheck },
      { href: "/non-conformites", label: "Non-conformités",      icon: AlertTriangle },
      { href: "/piscine",         label: "Registre sanitaire",   icon: Droplets },
      { href: "/veille",          label: "Veille Réglementaire", icon: Newspaper },
    ],
  },
  {
    title: "Ressources",
    items: [
      { href: "/equipements",  label: "Équipements",  icon: Settings },
      { href: "/prestataires", label: "Prestataires", icon: Briefcase },
      { href: "/techniciens",  label: "Techniciens",  icon: HardHat },
      { href: "/documents",    label: "Documents",    icon: FolderOpen },
    ],
  },
  {
    title: "Finances",
    items: [
      { href: "/depenses", label: "Dépenses & Factures", icon: Receipt },
      { href: "/fuel",     label: "Suivi Fuel",          icon: Gauge },
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
  const [veilleBadge, setVeilleBadge] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCurrentUserSummary()
      .then((user) => { if (!active) return; setProfile(user); })
      .catch(() => { if (!active) return; setProfileError("Impossible de charger le profil."); })
      .finally(() => { if (!active) return; setLoadingProfile(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase
      .from("veille_reglementaire")
      .select("id", { count: "exact", head: true })
      .eq("hotel_id", HOTEL_ID)
      .eq("lu", false)
      .then(({ count }) => { if (!active) return; setVeilleBadge(count ?? 0); });
    return () => { active = false; };
  }, [pathname]);

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
        borderRight: "1px solid #E8E6E1",
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: "var(--topbar-height)",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #E8E6E1",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "0.02em",
            color: "#1A1A18",
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
          padding: "16px 10px",
        }}
      >
        {navSections.map((section, idx) => (
          <div key={section.title}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#9C9C8E",
                padding: "0 12px",
                marginBottom: 4,
                marginTop: idx === 0 ? 0 : 24,
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
                        gap: 8,
                        padding: "0 12px",
                        height: 36,
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? "#7A5C2E" : "#6B6B5F",
                        backgroundColor: isActive ? "#F5EFE6" : "transparent",
                        textDecoration: "none",
                        transition: "background 150ms ease, color 150ms ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "#F4F3F0";
                          (e.currentTarget as HTMLElement).style.color = "#1A1A18";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "#6B6B5F";
                        }
                      }}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.5}
                        style={{
                          flexShrink: 0,
                          color: isActive ? "#C4A882" : "inherit",
                        }}
                      />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.href === "/veille" && veilleBadge > 0 && (
                        <span
                          style={{
                            backgroundColor: "#B83232",
                            color: "#FFFFFF",
                            borderRadius: 9999,
                            padding: "1px 7px",
                            fontSize: 11,
                            fontWeight: 500,
                            lineHeight: 1.6,
                            flexShrink: 0,
                          }}
                        >
                          {veilleBadge}
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
          padding: "12px 12px 16px",
          borderTop: "1px solid #E8E6E1",
          flexShrink: 0,
        }}
      >
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: "calc(100% + 8px)",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #E8E6E1",
              boxShadow: "0 8px 24px rgba(26,26,24,0.10)",
              padding: 8,
            }}
          >
            <div
              style={{
                padding: "10px 12px 12px",
                borderBottom: "1px solid #E8E6E1",
                marginBottom: 6,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1A1A18" }}>
                {profile ? `${profile.prenom} ${profile.nom}` : "Compte connecté"}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9C9C8E" }}>
                La déconnexion fermera la session active sur cet appareil.
              </p>
            </div>

            {profile?.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#6B6B5F" }}>
                <Mail size={14} strokeWidth={1.5} />
                <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile.email}
                </span>
              </div>
            )}

            {profile?.role && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "#6B6B5F" }}>
                <ShieldCheck size={14} strokeWidth={1.5} />
                <span style={{ fontSize: 12 }}>{roleLabel(profile.role)}</span>
              </div>
            )}

            {profileError && (
              <div
                style={{
                  margin: "6px 8px 8px",
                  padding: "10px 12px",
                  borderRadius: 8,
                  backgroundColor: "#FAE8E8",
                  color: "#B83232",
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
                border: "1px solid #E8E6E1",
                backgroundColor: "#FAE8E8",
                color: "#B83232",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 500,
                cursor: signingOut ? "not-allowed" : "pointer",
                transition: "150ms ease",
              }}
            >
              <LogOut size={14} strokeWidth={1.5} />
              {signingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
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
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#F5EFE6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              color: "#7A5C2E",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#1A1A18",
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
                color: "#9C9C8E",
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
            size={14}
            color="#9C9C8E"
            strokeWidth={1.5}
            style={{
              flexShrink: 0,
              transform: menuOpen ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 150ms ease",
            }}
          />
        </button>
      </div>
    </aside>
  );
}
