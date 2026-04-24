"use client";

import { useEffect, useState } from "react";
import { Loader2, Wind, Droplets, Eye, Thermometer } from "lucide-react";

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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#BAE6FD" }}>
        {icon}
        <span style={{ fontSize: 11 }}>{label}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default function MeteoCard() {
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
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: "14px 20px", boxShadow: "0 2px 8px rgba(26,26,24,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
      <Loader2 size={16} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#9CA3AF" }}>Météo Ajaccio…</span>
    </div>
  );

  if (!meteo) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #6B6B5F 0%, #6B6B5F 100%)",
      borderRadius: 16, padding: "18px 22px",
      boxShadow: "0 4px 16px rgba(14,165,233,0.3)",
      color: "#FFFFFF",
    }}>
      <div className="meteo-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 52, lineHeight: 1 }}>{weatherEmoji(meteo.icon)}</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", color: "#BAE6FD", textTransform: "uppercase" }}>Ajaccio</p>
            <p style={{ margin: 0, fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>
              {meteo.temp}°<span style={{ fontSize: 20 }}>C</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#E0F2FE", textTransform: "capitalize" }}>{meteo.description}</p>
          </div>
        </div>

        <div className="meteo-details">
          <Stat icon={<Thermometer size={14} />} label="Ressenti" value={`${meteo.feels_like}°C`} />
          <Stat icon={<Droplets size={14} />} label="Humidité" value={`${meteo.humidity}%`} />
          <Stat icon={<Wind size={14} />} label="Vent" value={`${meteo.wind_speed} km/h ${windDirection(meteo.wind_deg)}`} />
          <Stat icon={<Eye size={14} />} label="Visibilité" value={`${meteo.visibility} km`} />
        </div>

        {meteo.prochains.length > 0 && (
          <div className="meteo-forecast">
            {meteo.prochains.map((p, i) => (
              <div key={i} style={{ textAlign: "center", padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, minWidth: 56 }}>
                <p style={{ margin: 0, fontSize: 11, color: "#BAE6FD" }}>{p.heure}</p>
                <p style={{ margin: "4px 0", fontSize: 20 }}>{weatherEmoji(p.icon)}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{p.temp}°</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .meteo-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .meteo-details {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .meteo-forecast {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 768px) {
          .meteo-inner { gap: 12px; }
          .meteo-details { gap: 14px; }
          .meteo-forecast { gap: 8px; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
