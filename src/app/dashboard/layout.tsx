import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getImpersonationState } from "@/lib/impersonation";
import { returnToAdmin } from "@/app/admin/actions";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Megaphone, Users2, LogOut, UserCog, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/dashboard/leads", label: "Leads", icon: Users2 },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, role")
    .eq("id", user.id)
    .single();

  const { isImpersonating } = await getImpersonationState();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-muted/20 md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Leads
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{profile?.full_name ?? user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.company_name}</p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {isImpersonating && (
          <div className="flex items-center justify-between gap-4 bg-amber-500/15 px-6 py-2 text-sm text-amber-900 dark:text-amber-200">
            <span className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Vous visualisez le compte de <strong>{profile?.full_name ?? user.email}</strong> en mode impersonation.
            </span>
            <form action={returnToAdmin}>
              <Button type="submit" size="sm" variant="outline">
                Retour à l&apos;admin
              </Button>
            </form>
          </div>
        )}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
