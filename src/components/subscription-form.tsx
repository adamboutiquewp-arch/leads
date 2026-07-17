"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORFAITS, formatEUR } from "@/lib/forfaits";

export function SubscriptionForm({
  clientId,
  action,
  defaultForfaitId,
  defaultStatus,
}: {
  clientId: string;
  action: (clientId: string, formData: FormData) => void;
  defaultForfaitId?: string;
  defaultStatus?: string;
}) {
  const [unlimited, setUnlimited] = useState(false);
  const [forfaitId, setForfaitId] = useState(defaultForfaitId ?? FORFAITS[0].id);

  return (
    <form action={action.bind(null, clientId)} className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label htmlFor="unlimited-switch">Budget illimité</Label>
          <p className="text-xs text-muted-foreground">
            Ignore le plafond du forfait — à utiliser avec précaution.
          </p>
        </div>
        <Switch
          id="unlimited-switch"
          checked={unlimited}
          onCheckedChange={(checked) => setUnlimited(checked === true)}
        />
        <input type="hidden" name="unlimited" value={unlimited ? "on" : "off"} />
      </div>

      {!unlimited && (
        <div className="grid gap-2">
          <Label htmlFor="forfaitId">Forfait</Label>
          <Select
            name="forfaitId"
            value={forfaitId}
            onValueChange={(value) => setForfaitId(value ?? FORFAITS[0].id)}
          >
            <SelectTrigger id="forfaitId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORFAITS.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} — {formatEUR(f.priceCents)}/mois (plafond {formatEUR(f.budgetCapCents)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="budgetEuros">
          Budget publicitaire mensuel (€){unlimited ? "" : " — laisser vide pour utiliser le plafond du forfait"}
        </Label>
        <Input
          id="budgetEuros"
          name="budgetEuros"
          type="number"
          min={0}
          step={1}
          placeholder={unlimited ? "Illimité" : undefined}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status">Statut du paiement</Label>
        <Select name="status" defaultValue={defaultStatus ?? "active"}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="past_due">Impayé</SelectItem>
            <SelectItem value="canceled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
