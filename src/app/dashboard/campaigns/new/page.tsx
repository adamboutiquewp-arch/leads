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
    .select("sector, company_name")
    .eq("id", user.id)
    .single();

  return (
    <NewCampaignForm
      sector={profile?.sector ?? null}
      companyName={profile?.company_name ?? null}
    />
  );
}
