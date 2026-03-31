"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  RefreshCw,
  CheckSquare,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

type NavTab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const tabs: NavTab[] = [
  { href: "/dashboard",    label: "Accueil",       icon: LayoutDashboard },
  { href: "/interventions",label: "Interventions", icon: Zap },
  { href: "/rondes",       label: "Rondes",        icon: RefreshCw },
  { href: "/set",          label: "SET",           icon: CheckSquare },
  { href: "/planning",     label: "Plus",          icon: MoreHorizontal },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[1000]"
      style={{
        height: "var(--bottom-nav-height)",
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <ul
        style={{
          display: "flex",
          height: "100%",
          margin: 0,
          padding: "0 4px",
          listStyle: "none",
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} style={{ flex: 1 }}>
              <Link
                href={tab.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 3,
                  color: isActive ? "#2563EB" : "#AEAEB2",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: isActive ? "#EFF6FF" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 400,
                    letterSpacing: "0.1px",
                  }}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
