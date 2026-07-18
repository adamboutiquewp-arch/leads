import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateBusinessSettings } from "./actions";

const RESPONSE_TIME_OPTIONS = [
  { value: "10", label: "10 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 heure" },
  { value: "120", label: "2 heures" },
  { value: "240", label: "4 heures" },
  { value: "720", label: "12 heures" },
  { value: "1440", label: "24 heures" },
  { value: "2880", label: "48 heures" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("logo_url, website_url, service_area, response_time_minutes")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres entreprise</h1>
        <p className="text-muted-foreground">
          Ces informations sont utilisées pour personnaliser vos campagnes et vos visuels.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>Logo, site web, zone d&apos;intervention et délai de réponse.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4">
              <AlertDescription>Informations mises à jour avec succès.</AlertDescription>
            </Alert>
          )}

          <form action={updateBusinessSettings} className="flex flex-col gap-4" encType="multipart/form-data">
            <div className="grid gap-2">
              <Label htmlFor="logo">Logo</Label>
              {profile?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt="Logo actuel"
                  className="mb-2 h-16 w-16 rounded object-contain border bg-white"
                />
              )}
              <Input id="logo" name="logo" type="file" accept="image/*" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="websiteUrl">Site internet</Label>
              <Input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                placeholder="https://votre-site.com"
                defaultValue={profile?.website_url ?? ""}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="serviceArea">Localisation d&apos;intervention</Label>
              <Input
                id="serviceArea"
                name="serviceArea"
                placeholder="Ex: Paris et Île-de-France, rayon de 30km"
                defaultValue={profile?.service_area ?? ""}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="responseTimeMinutes">Délai de réponse à une demande de devis</Label>
              <Select
                name="responseTimeMinutes"
                defaultValue={profile?.response_time_minutes ? String(profile.response_time_minutes) : undefined}
              >
                <SelectTrigger id="responseTimeMinutes">
                  <SelectValue placeholder="Choisissez un délai" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-fit">
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
