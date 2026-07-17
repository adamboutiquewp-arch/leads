"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const SLA_MS = 30 * 60 * 1000; // 30 minutes pour traiter un lead

function format(ms: number) {
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LeadCountdown({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const deadline = new Date(createdAt).getTime() + SLA_MS;
  const remaining = deadline - now;
  const overdue = remaining < 0;

  return (
    <Badge variant={overdue ? "destructive" : "secondary"} className="tabular-nums">
      {overdue ? `Dépassé de ${format(remaining)}` : `${format(remaining)} restant`}
    </Badge>
  );
}
