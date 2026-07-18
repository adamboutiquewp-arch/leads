import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateAdVideo,
  generateVoiceover,
  muxVideoWithAudio,
  type CreativeFormat,
} from "@/lib/video-gen";
import { applyBranding } from "@/lib/video-branding";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const {
    name,
    platform,
    format,
    dailyBudgetCents,
    videoPrompt,
    voiceoverText,
    durationSeconds,
  } = body as {
    name: string;
    platform: "meta" | "google";
    format: CreativeFormat;
    dailyBudgetCents: number;
    videoPrompt: string;
    voiceoverText?: string;
    durationSeconds?: number;
  };

  if (!name || !platform || !format || !videoPrompt) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const { data: campaign, error: insertError } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name,
      platform,
      status: "generating",
      daily_budget_cents: dailyBudgetCents || null,
      creative_format: format,
      video_prompt: videoPrompt,
      voiceover_text: voiceoverText || null,
    })
    .select("id")
    .single();

  if (insertError || !campaign) {
    return NextResponse.json(
      { error: insertError?.message ?? "Impossible de créer la campagne" },
      { status: 500 },
    );
  }

  // Generation can take longer than a client is willing to wait on a single
  // fetch (and can approach the platform's function duration cap). Respond
  // right away with the campaign in "generating" state, and keep working in
  // the background via `after()` — the client polls/subscribes for the
  // status change instead of holding the connection open.
  after(async () => {
    const admin = createAdminClient();

    const setStep = async (step: string) => {
      await admin.from("campaigns").update({ generation_step: step }).eq("id", campaign.id);
    };

    try {
      const videoBuffer = await generateAdVideo(videoPrompt, format, durationSeconds || 30, setStep);

      let finalBuffer = videoBuffer;
      if (voiceoverText && voiceoverText.trim()) {
        try {
          await setStep("generating_voiceover");
          const audioBuffer = await generateVoiceover(voiceoverText);
          await setStep("mixing_audio");
          finalBuffer = await muxVideoWithAudio(videoBuffer, audioBuffer);
        } catch (audioError) {
          await admin
            .from("campaigns")
            .update({
              error_message: `Vidéo générée sans la voix off scriptée (son d'ambiance natif conservé): ${
                audioError instanceof Error ? audioError.message : String(audioError)
              }`,
            })
            .eq("id", campaign.id);
        }
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("logo_url, website_url")
        .eq("id", user.id)
        .single();

      if (profile?.logo_url || profile?.website_url) {
        try {
          await setStep("branding");
          finalBuffer = await applyBranding(finalBuffer, {
            logoUrl: profile.logo_url,
            websiteUrl: profile.website_url,
          });
        } catch (brandingError) {
          await admin
            .from("campaigns")
            .update({
              error_message: `Vidéo générée sans logo/site web (échec de l'incrustation): ${
                brandingError instanceof Error ? brandingError.message : String(brandingError)
              }`,
            })
            .eq("id", campaign.id);
        }
      }

      await setStep("uploading");
      const blob = await put(`campaigns/${campaign.id}.mp4`, finalBuffer, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: false,
      });

      await admin
        .from("campaigns")
        .update({ status: "ready", creative_url: blob.url })
        .eq("id", campaign.id);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const message = rawMessage.includes("quota of 1 request per minute")
        ? "Une seule vidéo peut être générée par minute avec le forfait actuel. Réessayez dans une minute."
        : rawMessage.includes('"status":"failed"')
          ? "Le modèle vidéo a échoué deux fois de suite sans raison précise (panne temporaire côté fournisseur). Réessayez dans quelques minutes."
          : rawMessage;

      await admin
        .from("campaigns")
        .update({ status: "failed", error_message: message })
        .eq("id", campaign.id);
    }
  });

  return NextResponse.json({ success: true, campaignId: campaign.id, status: "generating" });
}
