import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, LogOut, ShieldCheck } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Clients", icon: Users },
];

export default async function AdminLayout({
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
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-muted/20 md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">Super Admin</span>
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
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            Mon dashboard
          </Link>
        </nav>
        <div className="border-t p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{profile?.full_name ?? user.email}</p>
            <p className="text-xs text-muted-foreground">Administrateur</p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
