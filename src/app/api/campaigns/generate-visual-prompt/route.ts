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
- En français, 2 à 3 phrases courtes maximum (250 caractères environ), pas de liste, pas de titres.
- Sauf si l'idée du client l'exclut clairement, mets en scène un employé ou artisan de
  l'entreprise qui parle directement à la caméra (face caméra, expression avenante, en train de
  présenter ou vanter le service) — ce style a le mieux fonctionné jusqu'ici pour ce client.
- Un seul plan continu et simple : un sujet, une action, un mouvement de caméra minimal. Pas de
  montage avant/après, pas de changements de scène ni de coupes multiples — les modèles de
  génération vidéo ne gèrent pas bien les scénarios à plusieurs plans dans un seul clip.
- Décris le sujet, l'ambiance/lumière, le style visuel, de façon concise.
- Adapté à une publicité professionnelle et vendeuse pour ce secteur.
- Réponds uniquement avec la description, rien d'autre.`,
      maxRetries: 1,
    });

    // Safety net regardless of what the model returns: overly long prompts
    // have caused outright generation failures on the video model.
    const trimmed = text.trim().slice(0, 400);

    return NextResponse.json({ text: trimmed });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
