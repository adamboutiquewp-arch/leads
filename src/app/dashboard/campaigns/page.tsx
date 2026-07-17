import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, platform, status, daily_budget_cents, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campagnes</h1>
          <p className="text-muted-foreground">
            Génération de visuels IA et export Bulk Upload — module à venir.
          </p>
        </div>
        <Button disabled title="Module de génération IA en cours de développement">
          Nouvelle campagne
        </Button>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Plateforme</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize">{c.platform}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune campagne pour le moment. Le module de génération IA (visuels + export Bulk
          Upload Meta/Google) sera disponible prochainement.
        </div>
      )}
    </div>
  );
}
