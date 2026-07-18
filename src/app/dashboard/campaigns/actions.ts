"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";

export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié" };
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creative_url, user_id")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { error: "Campagne introuvable" };
  }

  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);

  if (error) {
    return { error: error.message };
  }

  if (campaign.creative_url) {
    await del(campaign.creative_url).catch(() => {});
  }

  revalidatePath("/dashboard/campaigns");
  return { success: true };
}
