"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Loader2, Trash2 } from "lucide-react";
import { deleteCampaign } from "@/app/dashboard/campaigns/actions";

export type Campaign = {
  id: string;
  name: string;
  platform: string;
  status: string;
  daily_budget_cents: number | null;
  creative_url: string | null;
  error_message: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  generating: "Génération en cours…",
  ready: "Prête",
  failed: "Échec",
  exported: "Exportée",
  live: "En ligne",
  paused: "En pause",
};

// If a campaign has been "generating" longer than this, the background
// function very likely hit the platform's execution time limit and died
// without ever reaching the failure handler. Treat it as stale in the UI
// rather than spinning forever.
const STALE_GENERATING_MS = 6 * 60 * 1000;

function isStale(campaign: Campaign) {
  return (
    campaign.status === "generating" &&
    Date.now() - new Date(campaign.created_at).getTime() > STALE_GENERATING_MS
  );
}

export function CampaignsRealtimeTable({
  initialCampaigns,
  userId,
}: {
  initialCampaigns: Campaign[];
  userId: string;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(campaign: Campaign) {
    if (!confirm(`Supprimer définitivement la campagne « ${campaign.name} » ?`)) return;

    setDeletingId(campaign.id);
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id);
      if (result?.error) {
        alert(`Échec de la suppression : ${result.error}`);
        setDeletingId(null);
        return;
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      setDeletingId(null);
    });
  }

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`campaigns-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campaigns", filter: `user_id=eq.${userId}` },
        (payload) => setCampaigns((prev) => [payload.new as Campaign, ...prev]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaigns", filter: `user_id=eq.${userId}` },
        (payload) =>
          setCampaigns((prev) =>
            prev.map((c) => (c.id === payload.new.id ? (payload.new as Campaign) : c)),
          ),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "campaigns", filter: `user_id=eq.${userId}` },
        (payload) =>
          setCampaigns((prev) => prev.filter((c) => c.id !== (payload.old as { id: string }).id)),
      )
      .subscribe();

    // Periodic re-render so stale "generating" rows flip status without a
    // page refresh even if no realtime event ever arrives for them.
    const tick = setInterval(() => setCampaigns((prev) => [...prev]), 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [userId]);

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Aucune campagne pour le moment. Cliquez sur &quot;Nouvelle campagne&quot; pour générer
        votre premier visuel publicitaire par IA.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aperçu</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Plateforme</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => {
            const stale = isStale(c);
            return (
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
                        : c.status === "failed" || stale
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {stale ? "Échec (délai dépassé)" : (STATUS_LABEL[c.status] ?? c.status)}
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
                  {stale && (
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      La génération a dépassé le délai autorisé. Réessayez.
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending && deletingId === c.id}
                    onClick={() => handleDelete(c)}
                    aria-label="Supprimer la campagne"
                  >
                    {isPending && deletingId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
