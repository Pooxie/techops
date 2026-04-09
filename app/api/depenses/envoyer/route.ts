import { Resend } from "resend";
import type { DepenseType } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

type DepensePayload = {
  id: string;
  date: string;
  type: DepenseType;
  fournisseur: string;
  description: string | null;
  montant: number;
  photo_url: string | null;
};

const TYPE_LABELS: Record<DepenseType, string> = {
  facture_prestataire: "Factures prestataires",
  achat_fournisseur: "Achats fournisseurs",
  achat_magasin: "Achats magasin",
};

function fmtEur(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "\u00A0€";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function buildHtml(depenses: DepensePayload[], technicienNom: string, mois: string): string {
  const total = depenses.reduce((s, d) => s + d.montant, 0);

  const types: DepenseType[] = ["facture_prestataire", "achat_fournisseur", "achat_magasin"];
  const grouped = Object.fromEntries(
    types.map((t) => [t, depenses.filter((d) => d.type === t)])
  ) as Record<DepenseType, DepensePayload[]>;

  const summaryRows = types
    .filter((t) => grouped[t].length > 0)
    .map((t) => {
      const sub = grouped[t].reduce((s, d) => s + d.montant, 0);
      return `
        <tr style="border-bottom:1px solid #F0F0F0;">
          <td style="padding:10px 14px;font-size:13px;">${TYPE_LABELS[t]}</td>
          <td style="padding:10px 14px;text-align:right;font-size:13px;">${grouped[t].length}</td>
          <td style="padding:10px 14px;text-align:right;font-size:13px;font-weight:700;">${fmtEur(sub)}</td>
        </tr>`;
    }).join("");

  const detailRows = depenses.map((d, i) => `
    <tr style="border-bottom:1px solid #F0F0F0;background:${i % 2 === 0 ? "#FFFFFF" : "#FAFAFA"};">
      <td style="padding:9px 14px;font-size:12px;white-space:nowrap;">${fmtDate(d.date)}</td>
      <td style="padding:9px 14px;font-size:12px;font-weight:600;">${d.fournisseur}</td>
      <td style="padding:9px 14px;font-size:12px;color:#6E6E73;">${d.description ?? "—"}</td>
      <td style="padding:9px 14px;font-size:12px;font-weight:700;text-align:right;">${fmtEur(d.montant)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="font-family:Arial,sans-serif;color:#1D1D1F;max-width:680px;margin:0 auto;padding:24px;background:#F5F5F7;">
  <div style="background:#2563EB;border-radius:14px;padding:24px 28px;margin-bottom:24px;">
    <h1 style="color:#FFFFFF;margin:0;font-size:20px;font-weight:700;">Dépenses Service Technique — ${mois}</h1>
    <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">Sofitel Golfe d'Ajaccio Thalasso Sea &amp; Spa</p>
  </div>

  <div style="background:#FFFFFF;border-radius:12px;padding:20px 24px;margin-bottom:20px;border:1px solid rgba(0,0,0,0.06);">
    <h2 style="font-size:15px;margin:0 0 14px;font-weight:700;">Récapitulatif</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#F5F5F7;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6E6E73;text-transform:uppercase;letter-spacing:.5px;">Catégorie</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6E6E73;text-transform:uppercase;">Docs</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6E6E73;text-transform:uppercase;">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
        <tr style="background:#EFF6FF;">
          <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#1D4ED8;">TOTAL</td>
          <td style="padding:12px 14px;text-align:right;font-size:14px;font-weight:700;color:#1D4ED8;">${depenses.length}</td>
          <td style="padding:12px 14px;text-align:right;font-size:16px;font-weight:700;color:#1D4ED8;">${fmtEur(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="background:#FFFFFF;border-radius:12px;padding:20px 24px;margin-bottom:20px;border:1px solid rgba(0,0,0,0.06);">
    <h2 style="font-size:15px;margin:0 0 14px;font-weight:700;">Détail des dépenses</h2>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#F5F5F7;">
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6E6E73;text-transform:uppercase;">Date</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6E6E73;text-transform:uppercase;">Fournisseur</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;color:#6E6E73;text-transform:uppercase;">Description</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;color:#6E6E73;text-transform:uppercase;">Montant</th>
        </tr>
      </thead>
      <tbody>${detailRows}</tbody>
    </table>
  </div>

  <p style="margin:0;font-size:13px;color:#6E6E73;line-height:1.7;">
    Cordialement,<br />
    <strong style="color:#1D1D1F;">${technicienNom}</strong><br />
    Service Technique — Sofitel Golfe d'Ajaccio Thalasso Sea &amp; Spa
  </p>
  <hr style="margin:20px 0;border:none;border-top:1px solid #E5E5EA;" />
  <p style="font-size:10px;color:#AEAEB2;margin:0;">Document généré automatiquement par TechOps — ${new Date().toLocaleDateString("fr-FR")}</p>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: "RESEND_API_KEY non configurée dans .env.local" }, { status: 500 });
    }

    const { depenses, technicienNom } = (await req.json()) as {
      depenses: DepensePayload[];
      technicienNom: string;
    };

    if (!depenses || depenses.length === 0) {
      return Response.json({ error: "Aucune dépense sélectionnée" }, { status: 400 });
    }

    const now = new Date();
    const mois = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const moisCap = mois.charAt(0).toUpperCase() + mois.slice(1);
    const total = depenses.reduce((s, d) => s + d.montant, 0);

    const html = buildHtml(depenses, technicienNom, moisCap);

    // Fetch photo attachments
    const attachments: { filename: string; content: Buffer }[] = [];
    for (const d of depenses) {
      if (!d.photo_url) continue;
      try {
        const res = await fetch(d.photo_url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = d.photo_url.split(".").pop()?.split("?")[0] ?? "jpg";
        const safe = d.fournisseur.replace(/[^a-z0-9]/gi, "_").slice(0, 30);
        attachments.push({ filename: `${d.date}_${safe}.${ext}`, content: buf });
      } catch {
        // Skip failed attachment — don't block the email
      }
    }

    const toEmail  = process.env.RESEND_TO_EMAIL  ?? "Matheo.riba2a@gmail.com";
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const { error } = await resend.emails.send({
      from: `TechOps <${fromEmail}>`,
      to: toEmail,
      subject: `Dépenses Service Technique — ${moisCap} · ${depenses.length} doc${depenses.length > 1 ? "s" : ""} · ${fmtEur(total)}`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true, sent: depenses.length, attachments: attachments.length });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Erreur inconnue" }, { status: 500 });
  }
}
