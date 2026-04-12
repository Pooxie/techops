import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const owKey = process.env.OPENWEATHER_API_KEY;
  if (!owKey || owKey === "your_openweather_api_key_here") {
    return Response.json({ error: "OPENWEATHER_API_KEY manquante" }, { status: 500 });
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=Ajaccio,FR&appid=${owKey}&units=metric&lang=fr`, { cache: "no-store" }),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=Ajaccio,FR&appid=${owKey}&units=metric&lang=fr&cnt=8`, { cache: "no-store" }),
    ]);

    if (!currentRes.ok) throw new Error(`OpenWeatherMap: ${currentRes.status}`);

    const current = await currentRes.json() as {
      main: { temp: number; feels_like: number; humidity: number; pressure: number };
      weather: { description: string; icon: string; main: string }[];
      wind: { speed: number; deg: number };
      visibility: number;
      name: string;
    };

    const forecast = forecastRes.ok ? await forecastRes.json() as {
      list: { dt: number; main: { temp_min: number; temp_max: number }; weather: { description: string; icon: string }[] }[];
    } : null;

    // Prochains créneaux (toutes les 3h)
    const prochains = forecast?.list.slice(1, 4).map((item) => ({
      heure: new Date(item.dt * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      temp: Math.round(item.main.temp_max),
      icon: item.weather[0]?.icon ?? "01d",
      desc: item.weather[0]?.description ?? "",
    })) ?? [];

    return Response.json({
      temp: Math.round(current.main.temp),
      feels_like: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      pressure: current.main.pressure,
      wind_speed: Math.round(current.wind.speed * 3.6), // m/s → km/h
      wind_deg: current.wind.deg,
      description: current.weather[0]?.description ?? "",
      icon: current.weather[0]?.icon ?? "01d",
      main: current.weather[0]?.main ?? "",
      visibility: Math.round((current.visibility ?? 10000) / 1000),
      prochains,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Erreur météo" }, { status: 500 });
  }
}
