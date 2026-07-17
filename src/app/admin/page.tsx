import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Megaphone, Wallet } from "lucide-react";
import { impersonate, confirmEmail } from "./actions";
import { formatEUR } from "@/lib/forfaits";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: subscriptions }, { data: leads }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, company_name, sector, created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("user_id, status, budget_monthly_cents, is_unlimited, forfaits(name), created_at")
      .order("created_at", { ascending: false }),
    supabase.from("leads").select("user_id"),
  ]);

  type SubscriptionRow = NonNullable<typeof subscriptions>[number];
  const latestSubByUser = new Map<string, SubscriptionRow>();
  for (const sub of subscriptions ?? []) {
    if (!latestSubByUser.has(sub.user_id)) latestSubByUser.set(sub.user_id, sub);
  }

  const leadCountByUser = new Map<string, number>();
  for (const lead of leads ?? []) {
    leadCountByUser.set(lead.user_id, (leadCountByUser.get(lead.user_id) ?? 0) + 1);
  }

  const activeSubs = (subscriptions ?? []).filter((s) => s.status === "active").length;

  const admin = createAdminClient();
  const confirmedByUser = new Map<string, boolean>();
  await Promise.all(
    (clients ?? []).map(async (client) => {
      const { data } = await admin.auth.admin.getUserById(client.id);
      confirmedByUser.set(client.id, Boolean(data.user?.email_confirmed_at));
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comptes clients</h1>
        <p className="text-muted-foreground">
          Gérez l&apos;ensemble des comptes clients et accédez à leur dashboard.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abonnements actifs
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads (total)
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Secteur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Forfait / Paiement</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(clients ?? []).map((client) => {
              const sub = latestSubByUser.get(client.id);
              const forfait = sub?.forfaits as unknown as { name: string } | null;
              return (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link href={`/admin/clients/${client.id}`} className="font-medium hover:underline">
                      {client.full_name ?? "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground">{client.email}</div>
                    <div className="text-xs text-muted-foreground">{client.company_name}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.sector ?? "—"}
                  </TableCell>
                  <TableCell>
                    {confirmedByUser.get(client.id) ? (
                      <Badge variant="secondary">Confirmé</Badge>
                    ) : (
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="destructive">Non confirmé</Badge>
                        <form action={confirmEmail.bind(null, client.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            Valider l&apos;email
                          </Button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {sub ? (
                      <div className="space-y-1">
                        <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                          {sub.is_unlimited ? "Illimité" : (forfait?.name ?? sub.status)}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {sub.status} · {formatEUR(sub.budget_monthly_cents)}/mois
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Aucun abonnement</span>
                    )}
                  </TableCell>
                  <TableCell>{leadCountByUser.get(client.id) ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button render={<Link href={`/admin/clients/${client.id}`} />} size="sm" variant="ghost">
                        Voir
                      </Button>
                      <form action={impersonate.bind(null, client.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Se connecter en tant que
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(clients ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Aucun client inscrit pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
