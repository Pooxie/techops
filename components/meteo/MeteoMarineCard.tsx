"use client";

import { useEffect, useState } from "react";
import { Loader2, Waves, Thermometer, Navigation, Activity } from "lucide-react";

type MarineData = {
  wave_height: number | null;
  wave_direction: number | null;
  wave_period: number | null;
  sea_surface_temperature: number | null;
  wind_wave_height: number | null;
  swell_wave_height: number | null;
  swell_wave_period: number | null;
  swell_wave_direction: number | null;
  prochains: {
    date: string;
    wave_max: number | null;
    period_max: number | null;
    sst_max: number | null;
    sst_min: number | null;
  }[];
};

function windDirection(deg: number | null): string {
  if (deg === null) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

function seaStateLabel(h: number | null): { label: string; emoji: string } {
  if (h === null) return { label: "—", emoji: "🌊" };
  if (h < 0.1) return { label: "Calme", emoji: "😌" };
  if (h < 0.5) return { label: "Ridée", emoji: "🌊" };
  if (h < 1.25) return { label: "Belle", emoji: "🌊" };
  if (h < 2.5) return { label: "Peu agitée", emoji: "🌊" };
  if (h < 4) return { label: "Agitée", emoji: "⚠️" };
  return { label: "Forte", emoji: "🚨" };
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#A7D8F5" }}>
        {icon}
        <span style={{ fontSize: 11 }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default function MeteoMarineCard() {
  const [data, setData] = useState<MarineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cerveau/meteo-marine")
      .then((r) => r.json() as Promise<MarineData | { error: string }>)
      .then((d) => { if (!("error" in d)) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: "14px 20px", boxShadow: "0 2px 8px rgba(26,26,24,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
      <Loader2 size={16} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#9CA3AF" }}>Météo marine…</span>
    </div>
  );

  if (!data) return null;

  const state = seaStateLabel(data.wave_height);
  const sst = data.sea_surface_temperature;

  return (
    <div style={{
      background: "linear-gradient(135deg, #1E3A5F 0%, #2E5A8A 100%)",
      borderRadius: 16, padding: "18px 22px",
      boxShadow: "0 4px 16px rgba(30,58,95,0.3)",
      color: "#FFFFFF",
    }}>
      <div className="marine-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 52, lineHeight: 1 }}>{state.emoji}</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", color: "#A7D8F5", textTransform: "uppercase" }}>
              Mer · Golfe d&apos;Ajaccio
            </p>
            <p style={{ margin: 0, fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>
              {data.wave_height !== null ? data.wave_height.toFixed(1) : "—"}
              <span style={{ fontSize: 20 }}> m</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#D0E8F5" }}>
              Mer {state.label.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="marine-details">
          <Stat
            icon={<Thermometer size={14} />}
            label="Température eau"
            value={sst !== null ? `${sst.toFixed(1)}°C` : "—"}
          />
          <Stat
            icon={<Activity size={14} />}
            label="Période"
            value={data.wave_period !== null ? `${data.wave_period.toFixed(1)} s` : "—"}
          />
          <Stat
            icon={<Navigation size={14} />}
            label="Direction"
            value={windDirection(data.wave_direction)}
          />
          <Stat
            icon={<Waves size={14} />}
            label="Houle"
            value={data.swell_wave_height !== null ? `${data.swell_wave_height.toFixed(1)} m` : "—"}
          />
        </div>

        {data.prochains.length > 0 && (
          <div className="marine-forecast">
            {data.prochains.slice(0, 3).map((p, i) => (
              <div key={i} style={{ textAlign: "center", padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, minWidth: 64 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#A7D8F5", textTransform: "capitalize" }}>{fmtDay(p.date)}</p>
                <p style={{ margin: "4px 0", fontSize: 13, fontWeight: 700 }}>
                  {p.wave_max !== null ? `${p.wave_max.toFixed(1)}m` : "—"}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#D0E8F5" }}>
                  {p.sst_max !== null ? `${p.sst_max.toFixed(0)}°` : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .marine-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .marine-details {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .marine-forecast {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .marine-inner { gap: 12px; }
          .marine-details { gap: 14px; }
          .marine-forecast { gap: 8px; }
        }
      `}</style>
    </div>
  );
}
