import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { formatEUR } from "@/lib/forfaits";
import { SubscriptionForm } from "@/components/subscription-form";
import { impersonate } from "../../actions";
import { updateSubscription } from "./actions";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: client }, { data: subscriptions }, { data: leads }, { data: campaigns }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase
        .from("subscriptions")
        .select("*, forfaits(name, budget_cap_cents)")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select("id, full_name, email, status, source, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("campaigns").select("id, name, platform, status").eq("user_id", id),
    ]);

  if (!client) notFound();

  const currentSub = subscriptions?.[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button render={<Link href="/admin" />} variant="ghost" size="sm" className="mb-4 gap-1">
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.full_name ?? "Client sans nom"}
            </h1>
            <p className="text-muted-foreground">
              {client.email} · {client.company_name ?? "—"} · {client.sector ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Inscrit le {new Date(client.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <form action={impersonate.bind(null, client.id)}>
            <Button type="submit" variant="outline">
              Se connecter en tant que
            </Button>
          </form>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads ({leads?.length ?? 0})</CardTitle>
              <CardDescription>20 leads les plus récents</CardDescription>
            </CardHeader>
            <CardContent>
              {leads && leads.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>{lead.full_name ?? lead.email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.source ?? "manuel"}</Badge>
                        </TableCell>
                        <TableCell>{lead.status}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun lead pour ce client.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campagnes ({campaigns?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns && campaigns.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {campaigns.map((c) => (
                    <li key={c.id} className="flex items-center justify-between">
                      <span>{c.name}</span>
                      <Badge variant="secondary">{c.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune campagne pour ce client.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des abonnements</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions && subscriptions.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {subscriptions.map((sub) => {
                    const forfait = sub.forfaits as unknown as { name: string } | null;
                    return (
                      <li key={sub.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div>
                          <span className="font-medium">
                            {sub.is_unlimited ? "Budget illimité" : forfait?.name}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {formatEUR(sub.budget_monthly_cents)}/mois
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                            {sub.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun abonnement pour ce client.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Gérer l&apos;abonnement</CardTitle>
            <CardDescription>
              Assignez un forfait, un budget illimité, ou mettez à jour le statut de paiement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionForm
              clientId={client.id}
              action={updateSubscription}
              defaultForfaitId={currentSub?.forfait_id}
              defaultStatus={currentSub?.status}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
