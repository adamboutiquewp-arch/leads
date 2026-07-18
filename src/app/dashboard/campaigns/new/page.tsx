"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("meta");
  const [format, setFormat] = useState("1080x1080");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          platform,
          format,
          dailyBudgetCents: Math.round(Number(formData.get("dailyBudget") || 0) * 100),
          videoPrompt: formData.get("videoPrompt"),
          voiceoverText: formData.get("voiceoverText"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      router.push("/dashboard/campaigns");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button render={<Link href="/dashboard/campaigns" />} variant="ghost" size="sm" className="mb-4 gap-1">
        <ArrowLeft className="h-4 w-4" />
        Retour aux campagnes
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle campagne</CardTitle>
          <CardDescription>
            Décrivez votre visuel, l&apos;IA génère une vidéo publicitaire prête à l&apos;emploi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom de la campagne</Label>
              <Input id="name" name="name" required disabled={loading} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="platform">Plateforme</Label>
                <Select value={platform} onValueChange={(v) => v && setPlatform(v)} disabled={loading}>
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                    <SelectItem value="google">Google Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="format">Format</Label>
                <Select value={format} onValueChange={(v) => v && setFormat(v)} disabled={loading}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1080x1080">Carré (1080×1080)</SelectItem>
                    <SelectItem value="1080x1920">Vertical / Story (1080×1920)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dailyBudget">Budget quotidien (€)</Label>
              <Input id="dailyBudget" name="dailyBudget" type="number" min={0} step={1} disabled={loading} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="videoPrompt">Description du visuel</Label>
              <Textarea
                id="videoPrompt"
                name="videoPrompt"
                required
                disabled={loading}
                rows={4}
                placeholder="Ex: Vidéo dynamique d'un appartement moderne avec vue sur mer, ambiance chaleureuse, lumière du coucher de soleil"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="voiceoverText">Texte de la voix off (optionnel)</Label>
              <Textarea
                id="voiceoverText"
                name="voiceoverText"
                disabled={loading}
                rows={3}
                placeholder="Ex: Découvrez cet appartement d'exception, contactez-nous dès aujourd'hui"
              />
            </div>

            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Génération en cours (jusqu'à 2-3 min)..." : "Générer la campagne"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
