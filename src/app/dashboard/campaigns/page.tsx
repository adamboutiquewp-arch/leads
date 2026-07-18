import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CampaignsRealtimeTable, type Campaign } from "@/components/campaigns-realtime-table";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id, name, platform, status, daily_budget_cents, creative_url, error_message, generation_step, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campagnes</h1>
          <p className="text-muted-foreground">
            Génération de visuels vidéo par IA, prêts pour Meta et Google Ads.
          </p>
        </div>
        <Button render={<Link href="/dashboard/campaigns/new" />}>Nouvelle campagne</Button>
      </div>

      <CampaignsRealtimeTable initialCampaigns={(campaigns ?? []) as Campaign[]} userId={user.id} />
    </div>
  );
}
