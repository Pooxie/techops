// Coordonnées Sofitel Golfe d'Ajaccio
const LAT = 41.883511;
const LON = 8.779018;

type OpenMeteoMarineResponse = {
  current?: {
    time: string;
    wave_height?: number;
    wave_direction?: number;
    wave_period?: number;
    sea_surface_temperature?: number;
    wind_wave_height?: number;
    swell_wave_height?: number;
    swell_wave_period?: number;
    swell_wave_direction?: number;
  };
  daily?: {
    time: string[];
    wave_height_max?: number[];
    wave_period_max?: number[];
    sea_surface_temperature_max?: number[];
    sea_surface_temperature_min?: number[];
  };
};

export async function GET() {
  try {
    const url = new URL("https://marine-api.open-meteo.com/v1/marine");
    url.searchParams.set("latitude", String(LAT));
    url.searchParams.set("longitude", String(LON));
    url.searchParams.set(
      "current",
      "wave_height,wave_direction,wave_period,sea_surface_temperature,wind_wave_height,swell_wave_height,swell_wave_period,swell_wave_direction",
    );
    url.searchParams.set(
      "daily",
      "wave_height_max,wave_period_max,sea_surface_temperature_max,sea_surface_temperature_min",
    );
    url.searchParams.set("timezone", "Europe/Paris");
    url.searchParams.set("forecast_days", "3");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Open-Meteo Marine: ${res.status}`);
    const data = (await res.json()) as OpenMeteoMarineResponse;

    const c: NonNullable<OpenMeteoMarineResponse["current"]> = data.current ?? { time: "" };
    const d: NonNullable<OpenMeteoMarineResponse["daily"]> = data.daily ?? { time: [] };

    const prochains = (d.time ?? []).map((iso, i) => ({
      date: iso,
      wave_max: d.wave_height_max?.[i] ?? null,
      period_max: d.wave_period_max?.[i] ?? null,
      sst_max: d.sea_surface_temperature_max?.[i] ?? null,
      sst_min: d.sea_surface_temperature_min?.[i] ?? null,
    }));

    return Response.json({
      wave_height: c.wave_height ?? null,
      wave_direction: c.wave_direction ?? null,
      wave_period: c.wave_period ?? null,
      sea_surface_temperature: c.sea_surface_temperature ?? null,
      wind_wave_height: c.wind_wave_height ?? null,
      swell_wave_height: c.swell_wave_height ?? null,
      swell_wave_period: c.swell_wave_period ?? null,
      swell_wave_direction: c.swell_wave_direction ?? null,
      prochains,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Erreur météo marine" },
      { status: 500 },
    );
  }
}
