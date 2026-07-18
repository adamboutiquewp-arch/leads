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
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

export function NewCampaignForm({
  sector,
  companyName,
  websiteUrl,
  serviceArea,
  responseTimeMinutes,
}: {
  sector: string | null;
  companyName: string | null;
  websiteUrl: string | null;
  serviceArea: string | null;
  responseTimeMinutes: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("meta");
  const [format, setFormat] = useState("1080x1080");
  const [duration, setDuration] = useState("8");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [voiceoverText, setVoiceoverText] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  async function handleGenerateScript() {
    if (!videoPrompt.trim()) {
      setScriptError("Décrivez d'abord le visuel avant de générer le texte.");
      return;
    }

    setGeneratingScript(true);
    setScriptError(null);

    try {
      const res = await fetch("/api/campaigns/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPrompt,
          sector,
          companyName,
          websiteUrl,
          serviceArea,
          responseTimeMinutes,
          durationSeconds: Number(duration),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScriptError(data.error ?? "Impossible de générer le texte.");
        return;
      }

      setVoiceoverText(data.text);
    } catch {
      setScriptError("Impossible de contacter le serveur.");
    } finally {
      setGeneratingScript(false);
    }
  }

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
          videoPrompt,
          voiceoverText,
          durationSeconds: Number(duration),
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dailyBudget">Budget quotidien (€)</Label>
                <Input id="dailyBudget" name="dailyBudget" type="number" min={0} step={1} disabled={loading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Durée de la vidéo</Label>
                <Select value={duration} onValueChange={(v) => v && setDuration(v)} disabled={loading}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 secondes (rapide)</SelectItem>
                    <SelectItem value="30">30 secondes (2 clips, ~3-4 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="videoPrompt">Description du visuel</Label>
              <Textarea
                id="videoPrompt"
                name="videoPrompt"
                required
                disabled={loading}
                rows={4}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Ex: Vidéo dynamique d'un appartement moderne avec vue sur mer, ambiance chaleureuse, lumière du coucher de soleil"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="voiceoverText">Texte de la voix off</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={generatingScript || loading}
                  onClick={handleGenerateScript}
                >
                  {generatingScript ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Générer un texte optimisé leads
                </Button>
              </div>
              {scriptError && <p className="text-xs text-destructive">{scriptError}</p>}
              <Textarea
                id="voiceoverText"
                name="voiceoverText"
                disabled={loading}
                rows={3}
                value={voiceoverText}
                onChange={(e) => setVoiceoverText(e.target.value)}
                placeholder="Décrivez le visuel puis cliquez sur « Générer un texte optimisé leads », ou écrivez le vôtre."
              />
              <p className="text-xs text-muted-foreground">
                Généré par IA pour maximiser la prise de contact — modifiable avant de lancer la génération.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? duration === "30"
                  ? "Génération en cours (jusqu'à 4-5 min pour 30s)..."
                  : "Génération en cours (jusqu'à 2-3 min)..."
                : "Générer la campagne"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
