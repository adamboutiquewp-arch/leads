import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const videoPrompt = body?.videoPrompt as string | undefined;
  const sector = body?.sector as string | undefined;
  const companyName = body?.companyName as string | undefined;
  const durationSeconds = (body?.durationSeconds as number | undefined) || 8;

  if (!videoPrompt || !videoPrompt.trim()) {
    return NextResponse.json({ error: "Décrivez d'abord le visuel." }, { status: 400 });
  }

  const wordRange =
    durationSeconds >= 30 ? "70 à 85 mots" : "18 à 25 mots";

  try {
    const { text } = await generateText({
      model: "openai/gpt-5.4",
      prompt: `Tu es un copywriter publicitaire expert en génération de leads pour les réseaux sociaux (Meta/Google Ads).

Écris le texte d'une voix off publicitaire de ${durationSeconds} secondes (environ ${wordRange}), en français, pour la vidéo suivante :
Visuel : "${videoPrompt}"
Secteur d'activité : ${sector || "non précisé"}
Entreprise : ${companyName || "non précisée"}

Contraintes :
- Optimisé pour générer un maximum de leads (prise de contact, demande d'info, clic).
- Ton direct, percutant, orienté bénéfice client.
- Termine par un appel à l'action clair (ex: "contactez-nous", "réservez dès maintenant", "demandez votre devis").
- Aucune ponctuation exotique, pas de guillemets, pas d'emoji.
- Réponds uniquement avec le texte de la voix off, rien d'autre.`,
      maxRetries: 1,
    });

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
