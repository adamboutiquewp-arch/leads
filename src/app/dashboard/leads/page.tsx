import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeadsRealtimeTable, type Lead } from "@/components/leads-realtime-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: leads }, { data: profile }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, email, phone, source, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("profiles").select("webhook_token").eq("id", user.id).single(),
  ]);

  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/webhook/leads`;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-muted-foreground">Tous vos leads reçus, mis à jour en temps réel.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoint webhook interne</CardTitle>
          <CardDescription>
            Configurez vos formulaires publicitaires pour envoyer un POST JSON vers cette URL,
            avec l&apos;en-tête <code className="rounded bg-muted px-1">x-webhook-token</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-sm">
          <div className="truncate rounded-md bg-muted px-3 py-2">{webhookUrl || "/api/webhook/leads"}</div>
          <div className="truncate rounded-md bg-muted px-3 py-2">
            x-webhook-token: {profile?.webhook_token}
          </div>
        </CardContent>
      </Card>

      <LeadsRealtimeTable initialLeads={(leads ?? []) as Lead[]} userId={user.id} />
    </div>
  );
}
