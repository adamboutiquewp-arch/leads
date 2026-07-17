import Link from "next/link";
import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>Démarrez la génération de vos campagnes en quelques minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form action={signup} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" name="fullName" required autoComplete="name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyName">Entreprise</Label>
              <Input id="companyName" name="companyName" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sector">Secteur d&apos;activité</Label>
              <Input id="sector" name="sector" placeholder="Ex: Immobilier, E-commerce…" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full">
              Créer mon compte
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà inscrit ?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
