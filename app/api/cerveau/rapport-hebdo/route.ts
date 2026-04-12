import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";
const RECIPIENT_EMAIL = "Matheo.riba2a@gmail.com";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const since7Days = new Date(today.getTime() - 7 * 86_400_000);
  const since7DaysStr = since7Days.toISOString().slice(0, 10);
  const since14Days = new Date(today.getTime() - 14 * 86_400_000).toISOString().slice(0, 10);
  const in14Days = new Date(today.getTime() + 14 * 86_400_000).toISOString().slice(0, 10);
  const weekStart = todayStr.slice(0, 7) + "-01";

  const [
    rondesSemaineRes,
    interventionsSemaineRes,
    newNCRes,
    ncLeveesRes,
    setRetardsRes,
    setAlertes14jRes,
    depensesSemaineRes,
    prestataires14jRes,
  ] = await Promise.all([
    supabase
      .from("rondes")
      .select("type, validee, date_heure")
      .eq("hotel_id", HOTEL_ID)
      .gte("date_heure", since7DaysStr + "T00:00:00")
      .order("date_heure", { ascending: true }),
    supabase
      .from("interventions")
      .select("titre, statut, priorite, zone, created_at, cloturee_le")
      .eq("hotel_id", HOTEL_ID)
      .gte("created_at", since7DaysStr + "T00:00:00")
      .order("created_at", { ascending: false }),
    supabase
      .from("non_conformites")
      .select("description, gravite, statut, date_cible")
      .eq("hotel_id", HOTEL_ID)
      .gte("created_at", since7DaysStr + "T00:00:00"),
    supabase
      .from("non_conformites")
      .select("description, gravite")
      .eq("hotel_id", HOTEL_ID)
      .eq("statut", "levee")
      .gte("updated_at", since7DaysStr + "T00:00:00"),
    supabase
      .from("set_controles")
      .select("nom, prestataire, date_prochaine, statut")
      .eq("hotel_id", HOTEL_ID)
      .in("statut", ["retard", "alerte"])
      .order("date_prochaine", { ascending: true }),
    supabase
      .from("set_controles")
      .select("nom, prestataire, date_prochaine")
      .eq("hotel_id", HOTEL_ID)
      .gte("date_prochaine", todayStr)
      .lte("date_prochaine", in14Days)
      .order("date_prochaine", { ascending: true }),
    supabase
      .from("depenses")
      .select("montant, type, fournisseur, date")
      .eq("hotel_id", HOTEL_ID)
      .gte("date", since7DaysStr)
      .order("date", { ascending: false }),
    supabase
      .from("set_controles")
      .select("nom, prestataire, date_prochaine")
      .eq("hotel_id", HOTEL_ID)
      .gte("date_prochaine", todayStr)
      .lte("date_prochaine", in14Days)
      .not("prestataire", "is", null)
      .neq("prestataire", "")
      .order("date_prochaine", { ascending: true }),
  ]);

  const rondesSemaine = rondesSemaineRes.data ?? [];
  const interventionsSemaine = interventionsSemaineRes.data ?? [];
  const newNC = newNCRes.data ?? [];
  const ncLevees = ncLeveesRes.data ?? [];
  const setRetards = setRetardsRes.data ?? [];
  const depensesSemaine = depensesSemaineRes.data ?? [];

  // Stats rondes (14 rondes attendues sur 7 jours = 2/jour)
  const rondesOuv = rondesSemaine.filter((r) => r.type === "ouverture" && r.validee).length;
  const rondesFerm = rondesSemaine.filter((r) => r.type === "fermeture" && r.validee).length;
  const totalRondes = rondesOuv + rondesFerm;
  const pctRondes = Math.round((totalRondes / 14) * 100);

  const interventionsCrees = interventionsSemaine.length;
  const interventionsCloturees = interventionsSemaine.filter((i) => i.statut === "cloturee").length;
  const totalDepensesSemaine = depensesSemaine.reduce((s, d) => s + (Number(d.montant) || 0), 0);

  // Score santé (simplifié)
  const scoreRetards = Math.max(0, 30 - setRetards.filter((c) => c.statut === "retard").length * 5);
  const scoreRondes = Math.round(pctRondes * 0.3);
  const scoreNC = Math.max(0, 20 - newNC.filter((n) => n.gravite === "majeure").length * 5);
  const scoreInterv = Math.min(20, 20 - interventionsSemaine.filter((i) => i.priorite === "urgente" && i.statut !== "cloturee").length * 5);
  const scoreTotal = Math.min(100, scoreRetards + scoreRondes + scoreNC + scoreInterv);

  const weekRange = `${since7Days.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} – ${today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

  const dataContext = `
SEMAINE DU ${weekRange}

RONDES :
- Ouvertures : ${rondesOuv}/7 | Fermetures : ${rondesFerm}/7 | Total : ${totalRondes}/14 (${pctRondes}%)

INTERVENTIONS :
- Créées : ${interventionsCrees} | Clôturées : ${interventionsCloturees}
- Urgentes non clôturées : ${interventionsSemaine.filter((i) => i.priorite === "urgente" && i.statut !== "cloturee").length}
${interventionsSemaine.slice(0, 10).map((i) => `  • [${i.statut}][${i.priorite}] ${i.titre}${i.zone ? ` (${i.zone})` : ""}`).join("\n")}

NON-CONFORMITÉS :
- Nouvelles cette semaine : ${newNC.length} (${newNC.filter((n) => n.gravite === "majeure").length} majeures)
- Levées cette semaine : ${ncLevees.length}

CONTRÔLES SET EN RETARD (${setRetards.filter((c) => c.statut === "retard").length}) :
${setRetards.filter((c) => c.statut === "retard").map((c) => `  • ${c.nom} — ${c.prestataire || "interne"} — prévu ${c.date_prochaine}`).join("\n") || "  Aucun"}

CONTRÔLES SET EN ALERTE :
${setRetards.filter((c) => c.statut === "alerte").map((c) => `  • ${c.nom} — ${c.prestataire || "interne"} — prévu ${c.date_prochaine}`).join("\n") || "  Aucun"}

RDV PRESTATAIRES DANS LES 14 PROCHAINS JOURS :
${(prestataires14jRes.data ?? []).map((c) => `  • ${c.nom} avec ${c.prestataire} le ${c.date_prochaine}`).join("\n") || "  Aucun"}

DÉPENSES SEMAINE : ${totalDepensesSemaine.toFixed(0)} €
${depensesSemaine.slice(0, 8).map((d) => `  • ${d.date} | ${d.fournisseur} | ${Number(d.montant).toFixed(0)} €`).join("\n")}

SCORE DE SANTÉ : ${scoreTotal}/100`;

  const htmlResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `Tu es l'assistant du Sofitel Golfe d'Ajaccio. Tu génères des emails HTML de rapport hebdomadaire pour Cyrille Buresi, Directeur Technique.
L'email doit être responsive, en HTML valide, aux couleurs de TechOps (bleu #2563EB, fond #F5F5F7).
Inclure : résumé de la semaine passée, actions prioritaires pour cette semaine, RDV prestataires, alertes SET, état général avec score.
Sois précis, opérationnel, utilise des tableaux HTML pour les données chiffrées.
Génère UNIQUEMENT le HTML du corps de l'email (pas de <html><head> — juste le <body> content).`,
    messages: [{
      role: "user",
      content: `Génère l'email HTML de rapport hebdomadaire avec ces données :\n\n${dataContext}`,
    }],
  });

  const htmlBody = htmlResponse.content[0].type === "text" ? htmlResponse.content[0].text : "";

  const subject = `TechOps — Briefing semaine du ${since7Days.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — Sofitel Ajaccio`;

  // Envoi email via Resend si la clé est configurée
  const resendKey = process.env.RESEND_API_KEY;
  let emailSent = false;
  let emailError = "";

  if (resendKey) {
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TechOps Sofitel <techops@resend.dev>",
          to: [RECIPIENT_EMAIL],
          subject,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body>${htmlBody}</body></html>`,
        }),
      });
      emailSent = emailRes.ok;
      if (!emailRes.ok) {
        const err = await emailRes.json() as { message?: string };
        emailError = err.message ?? "Erreur Resend inconnue";
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : "Erreur réseau";
    }
  } else {
    emailError = "RESEND_API_KEY non configurée — email non envoyé";
  }

  return Response.json({
    success: true,
    subject,
    htmlBody,
    emailSent,
    emailError: emailError || undefined,
    stats: {
      rondes: `${totalRondes}/14 (${pctRondes}%)`,
      interventionsCrees,
      interventionsCloturees,
      newNC: newNC.length,
      ncLevees: ncLevees.length,
      depenses: `${totalDepensesSemaine.toFixed(0)} €`,
      scoreTotal,
    },
  });
}
