import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsRealtimeTable, type Lead } from "@/components/leads-realtime-table";
import { formatEUR } from "@/lib/forfaits";
import { Users2, Megaphone, Wallet } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: leads }, { data: subscription }, { count: campaignsCount }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, full_name, email, phone, source, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("subscriptions")
        .select("status, budget_monthly_cents, is_unlimited, forfaits(name, budget_cap_cents)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const newLeadsCount = (leads ?? []).filter((l) => l.status === "new").length;
  const forfait = subscription?.forfaits as unknown as
    | { name: string; budget_cap_cents: number }
    | null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-muted-foreground">Suivez vos leads et vos campagnes en temps réel.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads à traiter
            </CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeadsCount}</div>
            <p className="text-xs text-muted-foreground">sur {leads?.length ?? 0} au total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campagnes</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaignsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">créées au total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Forfait actuel
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription?.is_unlimited ? "Illimité" : (forfait?.name ?? "Aucun")}
            </div>
            <p className="text-xs text-muted-foreground">
              {subscription
                ? subscription.is_unlimited
                  ? `Budget illimité (${formatEUR(subscription.budget_monthly_cents)}/mois)`
                  : `Budget ${formatEUR(subscription.budget_monthly_cents)}/mois · plafond ${formatEUR(
                      forfait?.budget_cap_cents ?? 0,
                    )}`
                : "Aucun abonnement actif"}
            </p>
            {subscription && (
              <Badge className="mt-2" variant={subscription.status === "active" ? "default" : "secondary"}>
                {subscription.status}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Leads récents</h2>
        </div>
        <LeadsRealtimeTable initialLeads={(leads ?? []) as Lead[]} userId={user.id} />
      </div>
    </div>
  );
}
