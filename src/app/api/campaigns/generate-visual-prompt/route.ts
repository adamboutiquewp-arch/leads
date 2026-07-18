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
  const idea = body?.idea as string | undefined;
  const sector = body?.sector as string | undefined;
  const companyName = body?.companyName as string | undefined;

  if (!idea || !idea.trim()) {
    return NextResponse.json({ error: "Décrivez d'abord votre idée en quelques mots." }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: "openai/gpt-5.4",
      prompt: `Tu es un réalisateur publicitaire expert en génération vidéo par IA (text-to-video).

Un client a une idée brute de visuel publicitaire pour son entreprise. Transforme-la en une description
détaillée et cinématographique, prête à être envoyée à un modèle de génération vidéo par IA.

Idée du client : "${idea}"
Secteur d'activité : ${sector || "non précisé"}
Entreprise : ${companyName || "non précisée"}

Contraintes :
- En français, un seul paragraphe fluide (pas de liste, pas de titres).
- Décris le sujet, l'action/mouvement de caméra, l'ambiance/lumière, le style visuel.
- Doit rester crédible pour un plan de 15-30 secondes (pas de scénario trop complexe).
- Adapté à une publicité professionnelle et vendeuse pour ce secteur.
- Réponds uniquement avec la description, rien d'autre.`,
      maxRetries: 1,
    });

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
