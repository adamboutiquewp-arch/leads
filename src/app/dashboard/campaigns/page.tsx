import Link from "next/link";
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

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  generating: "Génération en cours…",
  ready: "Prête",
  failed: "Échec",
  exported: "Exportée",
  live: "En ligne",
  paused: "En pause",
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, platform, status, daily_budget_cents, creative_url, error_message, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campagnes</h1>
          <p className="text-muted-foreground">
            Génération de visuels vidéo par IA, prêts pour Meta et Google Ads.
          </p>
        </div>
        <Button render={<Link href="/dashboard/campaigns/new" />}>Nouvelle campagne</Button>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aperçu</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Plateforme</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.creative_url ? (
                      <video
                        src={c.creative_url}
                        controls
                        muted
                        className="h-16 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize">{c.platform}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "ready"
                          ? "default"
                          : c.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                    {c.status === "failed" && c.error_message && (
                      <p className="mt-1 max-w-xs truncate text-xs text-destructive" title={c.error_message}>
                        {c.error_message}
                      </p>
                    )}
                    {c.status === "ready" && c.error_message && (
                      <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground" title={c.error_message}>
                        {c.error_message}
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucune campagne pour le moment. Cliquez sur &quot;Nouvelle campagne&quot; pour générer
          votre premier visuel publicitaire par IA.
        </div>
      )}
    </div>
  );
}
