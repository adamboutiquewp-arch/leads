import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FORFAITS, formatEUR } from "@/lib/forfaits";
import {
  Sparkles,
  Zap,
  BarChart3,
  ShieldCheck,
  Upload,
  Radio,
  CreditCard,
  Wand2,
  FileDown,
} from "lucide-react";

const STEPS = [
  {
    icon: CreditCard,
    title: "Choisissez votre forfait",
    description:
      "Sélectionnez une offre et définissez votre budget publicitaire mensuel, dans la limite du plafond inclus.",
  },
  {
    icon: Wand2,
    title: "Générez vos visuels par IA",
    description:
      "Créez des images et vidéos publicitaires aux formats standards (1080×1080, 1080×1920) en quelques clics.",
  },
  {
    icon: FileDown,
    title: "Téléchargez le fichier d'import",
    description:
      "Un fichier .csv/.json conforme à 100% aux templates Meta Ads Manager et Google Ads Editor est généré automatiquement.",
  },
  {
    icon: Radio,
    title: "Recevez vos leads en direct",
    description:
      "Vos leads arrivent en temps réel sur votre dashboard dès qu'un formulaire publicitaire est soumis.",
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Génération IA de visuels",
    description: "Créatifs publicitaires professionnels générés automatiquement pour vos campagnes.",
  },
  {
    icon: Upload,
    title: "Bulk Upload conforme",
    description: "Fichiers d'import 100% compatibles Meta Ads Manager et Google Ads Editor.",
  },
  {
    icon: Zap,
    title: "Leads en temps réel",
    description: "Webhooks internes + Supabase Realtime : zéro latence, zéro rafraîchissement.",
  },
  {
    icon: BarChart3,
    title: "Dashboard unifié",
    description: "Suivez vos campagnes, votre budget et vos leads au même endroit.",
  },
  {
    icon: ShieldCheck,
    title: "Paiement sécurisé",
    description: "Tunnel de paiement Stripe, aucune dépendance à des outils tiers.",
  },
  {
    icon: Radio,
    title: "100% autonome",
    description: "Toute la logique est codée en interne — pas de Make.com, pas de Zapier.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">Leads</span>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#fonctionnalites" className="hover:text-foreground">
              Fonctionnalités
            </a>
            <a href="#comment-ca-marche" className="hover:text-foreground">
              Comment ça marche
            </a>
            <a href="#tarifs" className="hover:text-foreground">
              Tarifs
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button render={<Link href="/login">Connexion</Link>} variant="ghost" />
            <Button render={<Link href="/signup">Commencer</Link>} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-6">
          Plateforme SaaS tout-en-un
        </Badge>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          Automatisez vos campagnes publicitaires, du visuel au lead
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Générez vos créatifs par IA, exportez des campagnes prêtes à l&apos;emploi pour
          Meta et Google Ads, et suivez vos leads en temps réel — sans aucun outil tiers.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button render={<Link href="/signup">Créer mon compte</Link>} size="lg" />
          <Button render={<a href="#tarifs">Voir les forfaits</a>} size="lg" variant="outline" />
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Comment ça marche</h2>
            <p className="mt-4 text-muted-foreground">
              De l&apos;inscription à la réception des leads, tout le parcours est automatisé.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-medium text-muted-foreground">
                  Étape {i + 1}
                </div>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Tout ce qu&apos;il faut, en interne</h2>
            <p className="mt-4 text-muted-foreground">
              Aucune dépendance à des outils tiers : toute la logique métier est codée nativement.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <f.icon className="h-6 w-6" />
                  <CardTitle className="mt-2 text-base">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Des forfaits adaptés à votre budget</h2>
            <p className="mt-4 text-muted-foreground">
              Chaque forfait inclut un plafond de budget publicitaire mensuel.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FORFAITS.map((forfait, i) => (
              <Card key={forfait.id} className={i === 2 ? "border-foreground shadow-lg" : ""}>
                <CardHeader>
                  {i === 2 && <Badge className="mb-2 w-fit">Populaire</Badge>}
                  <CardTitle>{forfait.name}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatEUR(forfait.priceCents)}</span>
                    <span className="text-sm text-muted-foreground">/mois</span>
                  </div>
                  <CardDescription>
                    Budget pub jusqu&apos;à {formatEUR(forfait.budgetCapCents)}/mois
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-2">
                    <li>✓ Génération de visuels IA</li>
                    <li>✓ Export Bulk Upload Meta/Google</li>
                    <li>✓ Leads en temps réel</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    render={<Link href="/signup">Choisir ce forfait</Link>}
                    className="w-full"
                    variant={i === 2 ? "default" : "outline"}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Prêt à lancer votre prochaine campagne ?</h2>
          <p className="mt-4 text-muted-foreground">
            Créez votre compte et générez votre première campagne en moins de 10 minutes.
          </p>
          <Button render={<Link href="/signup">Commencer maintenant</Link>} size="lg" className="mt-8" />
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Leads. Tous droits réservés.</span>
          <div className="flex gap-6">
            <Link href="/login">Connexion</Link>
            <Link href="/signup">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
