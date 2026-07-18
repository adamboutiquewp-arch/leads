"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";

export async function updateBusinessSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const websiteUrl = String(formData.get("websiteUrl") || "").trim();
  const serviceArea = String(formData.get("serviceArea") || "").trim();
  const responseTimeMinutes = Number(formData.get("responseTimeMinutes")) || null;
  const logoFile = formData.get("logo") as File | null;

  const update: Record<string, unknown> = {
    website_url: websiteUrl || null,
    service_area: serviceArea || null,
    response_time_minutes: responseTimeMinutes,
  };

  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop() || "png";
    const blob = await put(`logos/${user.id}.${ext}`, logoFile, {
      access: "public",
      addRandomSuffix: false,
    });
    update.logo_url = blob.url;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?success=1");
}
