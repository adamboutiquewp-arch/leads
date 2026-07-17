"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";

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

  return { supabase, adminUser: user };
}

export async function impersonate(targetUserId: string) {
  const { supabase, adminUser } = await requireAdmin();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const admin = createAdminClient();

  const { data: targetAuthUser, error: getUserError } =
    await admin.auth.admin.getUserById(targetUserId);

  if (getUserError || !targetAuthUser.user?.email) {
    redirect("/admin?error=Utilisateur introuvable");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetAuthUser.user.email,
  });

  if (linkError || !linkData) {
    redirect("/admin?error=Impossible de démarrer l'impersonation");
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    cookieStore.delete(IMPERSONATION_COOKIE);
    redirect("/admin?error=Échec de l'impersonation");
  }

  await admin.from("impersonation_logs").insert({
    admin_id: adminUser.id,
    target_user_id: targetUserId,
  });

  redirect("/dashboard");
}

export async function confirmEmail(targetUserId: string) {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(targetUserId, {
    email_confirm: true,
  });

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${targetUserId}`);
}

export async function returnToAdmin() {
  const cookieStore = await cookies();
  const adminRefreshToken = cookieStore.get(IMPERSONATION_COOKIE)?.value;

  if (!adminRefreshToken) redirect("/admin");

  const supabase = await createClient();

  const {
    data: { user: impersonatedUser },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.refreshSession({
    refresh_token: adminRefreshToken,
  });

  cookieStore.delete(IMPERSONATION_COOKIE);

  if (impersonatedUser) {
    const admin = createAdminClient();
    await admin
      .from("impersonation_logs")
      .update({ ended_at: new Date().toISOString() })
      .eq("target_user_id", impersonatedUser.id)
      .is("ended_at", null);
  }

  if (error) redirect("/login");

  redirect("/admin");
}
