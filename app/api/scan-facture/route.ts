import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const { imageBase64, mediaType } = (await request.json()) as {
    imageBase64: string;
    mediaType: string;
  };

  if (!imageBase64 || !mediaType) {
    return Response.json({ success: false, error: "Paramètres manquants" }, { status: 400 });
  }

  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(mediaType)) {
    return Response.json({ success: false, error: "Format non supporté (JPEG, PNG, GIF ou WebP requis)" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Tu es un assistant spécialisé dans la lecture de factures françaises pour un hôtel (Sofitel Golfe d'Ajaccio).

Analyse cette facture/ticket de caisse et extrais les informations suivantes.

Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après :
{
  "type": "facture_prestataire" | "achat_fournisseur" | "achat_magasin",
  "fournisseur": "Nom de l'entreprise ou du magasin",
  "montant": 123.45,
  "date": "YYYY-MM-DD",
  "description": "Résumé court de ce qui a été acheté/commandé"
}

Pour le type :
- facture_prestataire : facture d'une entreprise de maintenance, BET, organisme de contrôle (APAVE, CEMIS, SOCOTEC, etc.)
- achat_fournisseur : fournisseur professionnel (Sider, distributeur, etc.)
- achat_magasin : ticket de caisse ou facture d'un magasin grand public (Ajaccio Piscine, Monsieur Bricolage, Leroy Merlin, etc.)

Si une information est illisible ou absente, mets null pour ce champ.`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean) as {
      type: string | null;
      fournisseur: string | null;
      montant: number | null;
      date: string | null;
      description: string | null;
    };
    return Response.json({ success: true, data });
  } catch {
    return Response.json({
      success: false,
      error: "Impossible de lire la facture",
    });
  }
}
