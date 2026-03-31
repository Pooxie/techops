"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import {
  type DonneesRonde,
  type OkNok,
  type PiscineThalassoData,
  type ChaufferieEcsData,
  type TechniqueGeneraleData,
  DONNEES_DEFAULT,
  detectHorsNorme,
  saveRonde,
} from "@/lib/supabase";

// ─── Composants UI réutilisables ──────────────────────────────────────────────

function OkNokToggle({ value, onChange }: { value: OkNok; onChange: (v: OkNok) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => onChange(value === "ok" ? null : "ok")}
        style={{
          width: 58, height: 52, borderRadius: 10,
          border: `2px solid ${value === "ok" ? "#34C759" : "rgba(0,0,0,0.1)"}`,
          backgroundColor: value === "ok" ? "#F0FDF4" : "#FFFFFF",
          color: value === "ok" ? "#34C759" : "#8E8E93",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => onChange(value === "nok" ? null : "nok")}
        style={{
          width: 58, height: 52, borderRadius: 10,
          border: `2px solid ${value === "nok" ? "#FF3B30" : "rgba(0,0,0,0.1)"}`,
          backgroundColor: value === "nok" ? "#FFF1F0" : "#FFFFFF",
          color: value === "nok" ? "#FF3B30" : "#8E8E93",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}
      >
        NOK
      </button>
    </div>
  );
}

function NumField({
  label, value, onChange, unit, alert = false,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  alert?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", gap: 8,
    }}>
      <span style={{
        fontSize: 14, color: alert ? "#FF3B30" : "#1D1D1F",
        fontWeight: alert ? 600 : 400, flex: 1, lineHeight: 1.3,
      }}>
        {label}{alert && " ⚠️"}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <input
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
          style={{
            width: 78, padding: "7px 9px", borderRadius: 8, textAlign: "right",
            border: `1.5px solid ${alert ? "#FF3B30" : "rgba(0,0,0,0.12)"}`,
            backgroundColor: alert ? "#FFF1F0" : "#FFFFFF",
            fontSize: 15, fontWeight: 500, color: "#1D1D1F", outline: "none",
          }}
        />
        {unit && <span style={{ fontSize: 12, color: "#AEAEB2", minWidth: 28 }}>{unit}</span>}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", gap: 8,
    }}>
      <span style={{ fontSize: 14, color: "#1D1D1F", flex: 1, lineHeight: 1.3 }}>{label}</span>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
        textTransform: "uppercase", color: "#AEAEB2",
        marginBottom: 6, marginTop: 0,
      }}>
        {title}
      </p>
      <div style={{
        backgroundColor: "#FFFFFF", borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.06)", padding: "0 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}>
        {children}
        {/* Remove bottom border of last child */}
        <div style={{ height: 2 }} />
      </div>
    </div>
  );
}

function ObsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 13, color: "#6E6E73", marginBottom: 6 }}>Observations</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Observations pour cette section…"
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.12)", backgroundColor: "#FFFFFF",
          fontSize: 14, color: "#1D1D1F", resize: "none",
          fontFamily: "inherit", outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ─── Section 1 : Piscine & Thalasso ──────────────────────────────────────────

function Section1({ data, onChange }: { data: PiscineThalassoData; onChange: (d: PiscineThalassoData) => void }) {
  const upPH = (k: keyof typeof data.piscine_hotel, v: unknown) =>
    onChange({ ...data, piscine_hotel: { ...data.piscine_hotel, [k]: v } });
  const upPI = (k: keyof typeof data.piscine_institut, v: unknown) =>
    onChange({ ...data, piscine_institut: { ...data.piscine_institut, [k]: v } });
  const upTH = (k: keyof typeof data.thalasso, v: unknown) =>
    onChange({ ...data, thalasso: { ...data.thalasso, [k]: v } });
  const upSU = (k: keyof typeof data.surpresseur, v: unknown) =>
    onChange({ ...data, surpresseur: { ...data.surpresseur, [k]: v } });
  const upBA = (k: keyof typeof data.baches, v: unknown) =>
    onChange({ ...data, baches: { ...data.baches, [k]: v } });
  const upFE = (k: keyof typeof data.filtration_emf, v: unknown) =>
    onChange({ ...data, filtration_emf: { ...data.filtration_emf, [k]: v } });

  const ph = data.piscine_hotel;
  const pi = data.piscine_institut;
  const th = data.thalasso;
  const su = data.surpresseur;
  const ba = data.baches;
  const fe = data.filtration_emf;

  return (
    <>
      <SubSection title="Piscine Hôtel">
        <NumField label="Chlore libre" value={ph.chlore_libre} onChange={(v) => upPH("chlore_libre", v)} unit="mg/L"
          alert={ph.chlore_libre !== null && (ph.chlore_libre < 0.4 || ph.chlore_libre > 1.4)} />
        <NumField label="pH" value={ph.ph} onChange={(v) => upPH("ph", v)}
          alert={ph.ph !== null && (ph.ph < 7.2 || ph.ph > 7.6)} />
        <NumField label="Température" value={ph.temperature} onChange={(v) => upPH("temperature", v)} unit="°C" />
        <NumField label="Niveau hypochlorite" value={ph.niveau_hypochlorite} onChange={(v) => upPH("niveau_hypochlorite", v)} />
        <NumField label="Compteur débit" value={ph.compteur_debit} onChange={(v) => upPH("compteur_debit", v)} unit="M³/h" />
        <FieldRow label="Nettoyage filtres"><OkNokToggle value={ph.nettoyage_filtres} onChange={(v) => upPH("nettoyage_filtres", v)} /></FieldRow>
        <FieldRow label="Contrôle SWAN"><OkNokToggle value={ph.controle_swan} onChange={(v) => upPH("controle_swan", v)} /></FieldRow>
        <FieldRow label="Débordement"><OkNokToggle value={ph.debordement} onChange={(v) => upPH("debordement", v)} /></FieldRow>
      </SubSection>

      <SubSection title="Piscine Institut">
        <NumField label="Chlore libre" value={pi.chlore_libre} onChange={(v) => upPI("chlore_libre", v)} unit="mg/L"
          alert={pi.chlore_libre !== null && (pi.chlore_libre < 0.4 || pi.chlore_libre > 1.4)} />
        <NumField label="pH" value={pi.ph} onChange={(v) => upPI("ph", v)}
          alert={pi.ph !== null && (pi.ph < 7.2 || pi.ph > 7.6)} />
        <NumField label="Température" value={pi.temperature} onChange={(v) => upPI("temperature", v)} unit="°C" />
        <FieldRow label="Gallet pédiluves"><OkNokToggle value={pi.gallet_pediluves} onChange={(v) => upPI("gallet_pediluves", v)} /></FieldRow>
        <FieldRow label="Débordement"><OkNokToggle value={pi.debordement} onChange={(v) => upPI("debordement", v)} /></FieldRow>
      </SubSection>

      <SubSection title="Thalasso">
        <NumField label="T° échange piscine" value={th.temp_echange} onChange={(v) => upTH("temp_echange", v)} unit="°C"
          alert={th.temp_echange !== null && th.temp_echange > 32} />
        <NumField label="Compteur remplissage" value={th.compteur_remplissage} onChange={(v) => upTH("compteur_remplissage", v)} />
        <NumField label="N° pompe filtration" value={th.num_pompe_filtration} onChange={(v) => upTH("num_pompe_filtration", v)} />
        <NumField label="Compteur remplissage EMF" value={th.compteur_remplissage_emf} onChange={(v) => upTH("compteur_remplissage_emf", v)} />
        <FieldRow label="Nettoyage filtres"><OkNokToggle value={th.nettoyage_filtres} onChange={(v) => upTH("nettoyage_filtres", v)} /></FieldRow>
        <FieldRow label="Contrôle SWAN"><OkNokToggle value={th.controle_swan} onChange={(v) => upTH("controle_swan", v)} /></FieldRow>
      </SubSection>

      <SubSection title="Surpresseur">
        <NumField label="P5 Eau de Mer Froide" value={su.p5_eau_mer} onChange={(v) => upSU("p5_eau_mer", v)} unit="bar" />
        <NumField label="P7c Affusions" value={su.p7c_affusions} onChange={(v) => upSU("p7c_affusions", v)} unit="bar" />
        <NumField label="P7b Douches à jet" value={su.p7b_douches_jet} onChange={(v) => upSU("p7b_douches_jet", v)} unit="bar" />
        <NumField label="P7a Baignoires" value={su.p7a_baignoires} onChange={(v) => upSU("p7a_baignoires", v)} unit="bar" />
      </SubSection>

      <SubSection title="Bâches">
        <FieldRow label="Bâche PISCINE niveau"><OkNokToggle value={ba.piscine_niveau} onChange={(v) => upBA("piscine_niveau", v)} /></FieldRow>
        <FieldRow label="Bâche EMF niveau"><OkNokToggle value={ba.emf_niveau} onChange={(v) => upBA("emf_niveau", v)} /></FieldRow>
        <FieldRow label="Bâche EMC niveau"><OkNokToggle value={ba.emc_niveau} onChange={(v) => upBA("emc_niveau", v)} /></FieldRow>
      </SubSection>

      <SubSection title="Filtration EMF">
        <NumField label="Pression AV filtre" value={fe.pression_av_filtre} onChange={(v) => upFE("pression_av_filtre", v)} unit="bar" />
        <NumField label="Pression APRÈS filtre" value={fe.pression_apres_filtre} onChange={(v) => upFE("pression_apres_filtre", v)} unit="bar" />
        <FieldRow label="Contrôle UV EMF"><OkNokToggle value={fe.controle_uv} onChange={(v) => upFE("controle_uv", v)} /></FieldRow>
        <FieldRow label="Contrôle SWAN EMF"><OkNokToggle value={fe.controle_swan} onChange={(v) => upFE("controle_swan", v)} /></FieldRow>
      </SubSection>

      <ObsField value={data.observations} onChange={(v) => onChange({ ...data, observations: v })} />
    </>
  );
}

// ─── Section 2 : Chaufferie & ECS ─────────────────────────────────────────────

function Section2({ data, onChange }: { data: ChaufferieEcsData; onChange: (d: ChaufferieEcsData) => void }) {
  const upCH = (k: keyof typeof data.chaufferie, v: unknown) =>
    onChange({ ...data, chaufferie: { ...data.chaufferie, [k]: v } });
  const upRE = (k: keyof typeof data.recyclage, v: unknown) =>
    onChange({ ...data, recyclage: { ...data.recyclage, [k]: v } });
  const upGE = (k: keyof typeof data.geg_hotel, v: unknown) =>
    onChange({ ...data, geg_hotel: { ...data.geg_hotel, [k]: v } });
  const upDC = (k: keyof typeof data.dry_cooling, v: unknown) =>
    onChange({ ...data, dry_cooling: { ...data.dry_cooling, [k]: v } });
  const upCP = (k: keyof typeof data.compteurs_pompes_edm, v: unknown) =>
    onChange({ ...data, compteurs_pompes_edm: { ...data.compteurs_pompes_edm, [k]: v } });
  const upEMU = (k: keyof typeof data.compteur_emu, v: unknown) =>
    onChange({ ...data, compteur_emu: { ...data.compteur_emu, [k]: v } });

  const ch = data.chaufferie;
  const re = data.recyclage;
  const ge = data.geg_hotel;
  const dc = data.dry_cooling;
  const cp = data.compteurs_pompes_edm;
  const emu = data.compteur_emu;

  return (
    <>
      <SubSection title="Chaufferie">
        <FieldRow label="Pompe de bouclage"><OkNokToggle value={ch.pompe_bouclage} onChange={(v) => upCH("pompe_bouclage", v)} /></FieldRow>
        <NumField label="Pression primaire chaud 2b" value={ch.pression_primaire} onChange={(v) => upCH("pression_primaire", v)} unit="bar" />
        <NumField label="T° primaire échangeur" value={ch.temp_primaire_echangeur} onChange={(v) => upCH("temp_primaire_echangeur", v)} unit="°C" />
        <NumField label="T° départ ECS" value={ch.temp_depart_ecs} onChange={(v) => upCH("temp_depart_ecs", v)} unit="°C"
          alert={ch.temp_depart_ecs !== null && (ch.temp_depart_ecs < 55 || ch.temp_depart_ecs > 65)} />
        <NumField label="T° ballon" value={ch.temp_ballon} onChange={(v) => upCH("temp_ballon", v)} unit="°C"
          alert={ch.temp_ballon !== null && ch.temp_ballon < 55} />
      </SubSection>

      <SubSection title="Recyclage Thalasso">
        <NumField label="Temp thalasso S3" value={re.temp_s3} onChange={(v) => upRE("temp_s3", v)} unit="°C" />
        <NumField label="Temp hôtel S4" value={re.temp_s4} onChange={(v) => upRE("temp_s4", v)} unit="°C" />
        <NumField label="Temp général S5" value={re.temp_s5} onChange={(v) => upRE("temp_s5", v)} unit="°C" />
      </SubSection>

      <SubSection title="GEG Hôtel">
        <NumField label="Pression GEG" value={ge.pression} onChange={(v) => upGE("pression", v)} unit="bar" />
        <NumField label="Température GEG" value={ge.temperature} onChange={(v) => upGE("temperature", v)} unit="°C" />
      </SubSection>

      <SubSection title="Dry Cooling">
        <FieldRow label="Pression circuit 1.5b"><OkNokToggle value={dc.pression_circuit} onChange={(v) => upDC("pression_circuit", v)} /></FieldRow>
        <NumField label="Niveau fuel" value={dc.niveau_fuel} onChange={(v) => upDC("niveau_fuel", v)} unit="L" />
      </SubSection>

      <SubSection title="Compteurs horaires pompes EDM">
        <NumField label="Pompe 1" value={cp.pompe1} onChange={(v) => upCP("pompe1", v)} unit="h" />
        <NumField label="Pompe 2" value={cp.pompe2} onChange={(v) => upCP("pompe2", v)} unit="h" />
      </SubSection>

      <SubSection title="Compteur EMU">
        <NumField label="Compteur débit" value={emu.debit} onChange={(v) => upEMU("debit", v)} unit="M³/h" />
        <FieldRow label="Contrôle voyants"><OkNokToggle value={emu.controle_voyants} onChange={(v) => upEMU("controle_voyants", v)} /></FieldRow>
        <FieldRow label="Contrôle UV désinfection"><OkNokToggle value={emu.controle_uv} onChange={(v) => upEMU("controle_uv", v)} /></FieldRow>
      </SubSection>

      <ObsField value={data.observations} onChange={(v) => onChange({ ...data, observations: v })} />
    </>
  );
}

// ─── Section 3 : Technique générale ──────────────────────────────────────────

function Section3({ data, onChange }: { data: TechniqueGeneraleData; onChange: (d: TechniqueGeneraleData) => void }) {
  const upRE = (k: keyof typeof data.reception, v: unknown) =>
    onChange({ ...data, reception: { ...data.reception, [k]: v } });
  const upCE = (k: keyof typeof data.cave_economat, v: unknown) =>
    onChange({ ...data, cave_economat: { ...data.cave_economat, [k]: v } });
  const upCA = (k: keyof typeof data.compresseur_air, v: unknown) =>
    onChange({ ...data, compresseur_air: { ...data.compresseur_air, [k]: v } });

  return (
    <>
      <SubSection title="Réception">
        <FieldRow label="Contrôle alarme incendie"><OkNokToggle value={data.reception.alarme_incendie} onChange={(v) => upRE("alarme_incendie", v)} /></FieldRow>
        <FieldRow label="Éclairage de secours"><OkNokToggle value={data.reception.eclairage_secours} onChange={(v) => upRE("eclairage_secours", v)} /></FieldRow>
        <FieldRow label="Pression circuit GEG 2 bar"><OkNokToggle value={data.reception.pression_geg} onChange={(v) => upRE("pression_geg", v)} /></FieldRow>
      </SubSection>

      <SubSection title="Cave Économat">
        <FieldRow label="Séparateur graisse"><OkNokToggle value={data.cave_economat.separateur_graisse} onChange={(v) => upCE("separateur_graisse", v)} /></FieldRow>
        <FieldRow label="Coffret relevage"><OkNokToggle value={data.cave_economat.coffret_relevage} onChange={(v) => upCE("coffret_relevage", v)} /></FieldRow>
        <FieldRow label="Pompe puisard"><OkNokToggle value={data.cave_economat.pompe_puisard} onChange={(v) => upCE("pompe_puisard", v)} /></FieldRow>
      </SubSection>

      <SubSection title="Compresseur Air">
        <FieldRow label="Mise en route"><OkNokToggle value={data.compresseur_air.mise_en_route} onChange={(v) => upCA("mise_en_route", v)} /></FieldRow>
        <FieldRow label="Contrôle huile"><OkNokToggle value={data.compresseur_air.controle_huile} onChange={(v) => upCA("controle_huile", v)} /></FieldRow>
        <NumField label="Pression spilotairs 1 bar" value={data.compresseur_air.pression_spilotairs} onChange={(v) => upCA("pression_spilotairs", v)} unit="bar" />
      </SubSection>

      <SubSection title="Coffret Relevage">
        <FieldRow label="Contrôle voyants">
          <OkNokToggle
            value={data.coffret_relevage.controle_voyants}
            onChange={(v) => onChange({ ...data, coffret_relevage: { controle_voyants: v } })}
          />
        </FieldRow>
      </SubSection>

      <SubSection title="Coffret Puisard">
        <FieldRow label="Contrôle voyants">
          <OkNokToggle
            value={data.coffret_puisard.controle_voyants}
            onChange={(v) => onChange({ ...data, coffret_puisard: { controle_voyants: v } })}
          />
        </FieldRow>
      </SubSection>

      <ObsField value={data.observations} onChange={(v) => onChange({ ...data, observations: v })} />
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const STEPS = [
  { label: "Piscine & Thalasso", short: "Piscine" },
  { label: "Chaufferie & ECS", short: "Chaufferie" },
  { label: "Technique générale", short: "Technique" },
  { label: "Clôture", short: "Clôture" },
] as const;

const SECTION_LABELS = ["Piscine & Thalasso", "Chaufferie & ECS", "Technique générale"] as const;

const BtnPrimary = {
  width: "100%", padding: "15px", borderRadius: 14, border: "none",
  backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 16, fontWeight: 600,
  cursor: "pointer", marginTop: 8, marginBottom: 32,
  boxShadow: "0 2px 8px rgba(37,99,235,0.28)", letterSpacing: "-0.1px",
} as const;

export default function RondeFormPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as "ouverture" | "fermeture";

  const [step, setStep] = useState(1);
  const [donnees, setDonnees] = useState<DonneesRonde>(JSON.parse(JSON.stringify(DONNEES_DEFAULT)));
  const [validated, setValidated] = useState([false, false, false]);
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sigRef = useRef<SignatureCanvas>(null);
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(320);

  useEffect(() => {
    if (sigContainerRef.current) {
      setCanvasWidth(sigContainerRef.current.offsetWidth);
    }
  }, [step]);

  function goNext(sectionIndex: number) {
    setValidated((prev) => {
      const next = [...prev];
      next[sectionIndex] = true;
      return next;
    });
    setStep(sectionIndex + 2 <= 3 ? sectionIndex + 2 : 4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/rondes");
    }
  }

  async function handleSubmit() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Veuillez signer avant de valider la ronde.");
      return;
    }
    const sig = sigRef.current.toDataURL("image/png");
    const hors_norme = detectHorsNorme(donnees);

    setSaving(true);
    setError(null);
    try {
      await saveRonde({ type, donnees, observations, signature: sig, hors_norme });
      router.push("/rondes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
      setSaving(false);
    }
  }

  const stepTitle = STEPS[step - 1].label;

  return (
    <div style={{ backgroundColor: "#F5F5F7", minHeight: "100vh" }}>

      {/* ── Header sticky ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        backgroundColor: "rgba(245,245,247,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "12px 16px 10px",
      }}>
        {/* Ligne titre */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button
            onClick={goBack}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px 4px 0", color: "#2563EB", flexShrink: 0 }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", margin: 0, textTransform: "capitalize" }}>
              Ronde {type} — {stepTitle}
            </h1>
            <p style={{ fontSize: 12, color: "#AEAEB2", margin: 0 }}>
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>

        {/* Barre de progression 4 étapes */}
        <div style={{ display: "flex", gap: 5 }}>
          {STEPS.map((s, i) => {
            const done = i + 1 < step;
            const active = i + 1 === step;
            return (
              <div key={s.short} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  height: 4, borderRadius: 4, marginBottom: 4,
                  backgroundColor: done ? "#34C759" : active ? "#2563EB" : "rgba(0,0,0,0.1)",
                  transition: "background-color 0.3s",
                }} />
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.3px",
                  color: done ? "#34C759" : active ? "#2563EB" : "#AEAEB2",
                  textTransform: "uppercase",
                }}>
                  {s.short}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ padding: "16px", maxWidth: 640, margin: "0 auto" }}>

        {step === 1 && (
          <>
            <Section1
              data={donnees.piscine_thalasso}
              onChange={(d) => setDonnees({ ...donnees, piscine_thalasso: d })}
            />
            <button style={BtnPrimary} onClick={() => goNext(0)}>
              Valider Section 1 / 3 →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Section2
              data={donnees.chaufferie_ecs}
              onChange={(d) => setDonnees({ ...donnees, chaufferie_ecs: d })}
            />
            <button style={BtnPrimary} onClick={() => goNext(1)}>
              Valider Section 2 / 3 →
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <Section3
              data={donnees.technique_generale}
              onChange={(d) => setDonnees({ ...donnees, technique_generale: d })}
            />
            <button style={BtnPrimary} onClick={() => goNext(2)}>
              Valider Section 3 / 3 →
            </button>
          </>
        )}

        {step === 4 && (
          <>
            {/* ── Récap sections ── */}
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
                textTransform: "uppercase", color: "#AEAEB2", marginBottom: 8,
              }}>
                Récapitulatif
              </p>
              <div style={{
                backgroundColor: "#FFFFFF", borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}>
                {SECTION_LABELS.map((label, i) => (
                  <div
                    key={label}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "13px 14px",
                      borderBottom: i < SECTION_LABELS.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "#1D1D1F" }}>{label}</span>
                    {validated[i]
                      ? <CheckCircle size={18} color="#34C759" strokeWidth={2.5} />
                      : <AlertTriangle size={18} color="#FF9500" strokeWidth={2} />
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* ── Hors norme warning ── */}
            {detectHorsNorme(donnees) && (
              <div style={{
                backgroundColor: "#FFF1F0", borderRadius: 12,
                border: "1px solid rgba(255,59,48,0.2)",
                padding: "12px 14px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <AlertTriangle size={18} color="#FF3B30" strokeWidth={2} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#FF3B30", margin: 0 }}>
                    Valeurs hors norme détectées
                  </p>
                  <p style={{ fontSize: 12, color: "#FF3B30", opacity: 0.8, margin: 0 }}>
                    Une notification sera envoyée au DT.
                  </p>
                </div>
              </div>
            )}

            {/* ── Observations générales ── */}
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
                textTransform: "uppercase", color: "#AEAEB2", marginBottom: 8,
              }}>
                Observations générales
              </p>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                placeholder="Observations générales sur la ronde…"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)", backgroundColor: "#FFFFFF",
                  fontSize: 14, color: "#1D1D1F", resize: "none",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              />
            </div>

            {/* ── Signature ── */}
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
                textTransform: "uppercase", color: "#AEAEB2", marginBottom: 8,
              }}>
                Signature *
              </p>
              <div
                ref={sigContainerRef}
                style={{
                  backgroundColor: "#FFFFFF", borderRadius: 14,
                  border: "1.5px solid rgba(0,0,0,0.12)",
                  overflow: "hidden", touchAction: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{
                    width: canvasWidth,
                    height: 160,
                    style: { display: "block" },
                  }}
                  backgroundColor="white"
                  penColor="#1D1D1F"
                />
              </div>
              <button
                type="button"
                onClick={() => sigRef.current?.clear()}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  marginTop: 8, background: "none", border: "none",
                  cursor: "pointer", color: "#6E6E73", fontSize: 13,
                  padding: 0,
                }}
              >
                <RotateCcw size={13} />
                Effacer
              </button>
            </div>

            {/* ── Erreur ── */}
            {error && (
              <div style={{
                backgroundColor: "#FFF1F0", borderRadius: 10,
                border: "1px solid rgba(255,59,48,0.2)",
                padding: "10px 14px", marginBottom: 16,
                fontSize: 13, color: "#FF3B30",
              }}>
                {error}
              </div>
            )}

            {/* ── Bouton valider ── */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                ...BtnPrimary,
                backgroundColor: saving ? "#AEAEB2" : "#2563EB",
                boxShadow: saving ? "none" : "0 2px 8px rgba(37,99,235,0.28)",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Sauvegarde en cours…" : "Valider la ronde ✓"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
