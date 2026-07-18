import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewCampaignForm } from "@/components/new-campaign-form";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("sector, company_name, website_url, service_area, response_time_minutes")
    .eq("id", user.id)
    .single();

  return (
    <NewCampaignForm
      sector={profile?.sector ?? null}
      companyName={profile?.company_name ?? null}
      websiteUrl={profile?.website_url ?? null}
      serviceArea={profile?.service_area ?? null}
      responseTimeMinutes={profile?.response_time_minutes ?? null}
    />
  );
}
