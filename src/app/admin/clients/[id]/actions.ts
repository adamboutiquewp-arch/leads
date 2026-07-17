"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FORFAITS } from "@/lib/forfaits";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return supabase;
}

export async function updateSubscription(clientId: string, formData: FormData) {
  const supabase = await requireAdmin();

  const isUnlimited = formData.get("unlimited") === "on";
  const forfaitId = String(formData.get("forfaitId"));
  const status = String(formData.get("status") ?? "active");

  const forfait = FORFAITS.find((f) => f.id === forfaitId);

  const customBudgetRaw = formData.get("budgetEuros");
  const customBudgetCents =
    customBudgetRaw && String(customBudgetRaw).trim() !== ""
      ? Math.round(Number(customBudgetRaw) * 100)
      : undefined;

  const { error } = await supabase.from("subscriptions").insert({
    user_id: clientId,
    forfait_id: forfait?.id ?? FORFAITS[0].id,
    budget_monthly_cents: isUnlimited
      ? (customBudgetCents ?? forfait?.budgetCapCents ?? 0)
      : (customBudgetCents ?? forfait?.budgetCapCents ?? 0),
    is_unlimited: isUnlimited,
    status,
  });

  if (error) {
    redirect(`/admin/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
  redirect(`/admin/clients/${clientId}`);
}
