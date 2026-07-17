"use client";

import { useEffect, useState } from "react";
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
import { LeadCountdown } from "@/components/lead-countdown";

export type Lead = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
};

export function LeadsRealtimeTable({
  initialLeads,
  userId,
}: {
  initialLeads: Lead[];
  userId: string;
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`leads-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setLeads((prev) => [payload.new as Lead, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setLeads((prev) =>
            prev.map((l) => (l.id === payload.new.id ? (payload.new as Lead) : l)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Aucun lead reçu pour le moment. Ils apparaîtront ici en temps réel dès qu&apos;un
        formulaire publicitaire est soumis.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Traitement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.full_name ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div>{lead.email ?? "—"}</div>
                <div>{lead.phone ?? ""}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {lead.source ?? "manuel"}
                </Badge>
              </TableCell>
              <TableCell>{STATUS_LABEL[lead.status] ?? lead.status}</TableCell>
              <TableCell>
                {lead.status === "new" ? (
                  <LeadCountdown createdAt={lead.created_at} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
