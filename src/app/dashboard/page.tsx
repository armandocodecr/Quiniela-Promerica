import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Standing } from "@/lib/api-football";
import { StandingsTable } from "@/components/standings-table";
import { Trophy, Plus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/actions";
import { isOwner } from "@/lib/owner";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const owner = isOwner(user.email ?? "");

  const [profile, memberships, standings] = await Promise.all([
    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then((r) => r.data),
    supabase
      .from("quiniela_members")
      .select(`total_points, quinielas(id, name, invite_code)`)
      .eq("user_id", user.id)
      .order("total_points", { ascending: false })
      .then((r) => r.data),
    Promise.resolve(
      supabase
        .from("cache")
        .select("data")
        .eq("key", "standings")
        .single()
    ).then((r) => (r.data?.data as Standing[] | null) ?? null)
      .catch(() => null),
  ]);

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"
          >
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary-foreground" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-none">
              Quiniela Promerica
            </h1>
            <p className="text-xs text-muted-foreground">
              {profile?.username ?? user.email}
            </p>
          </div>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Mis quinielas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Mis quinielas</h2>
            <div className="flex gap-2">
              <Link
                href="/quiniela/join"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Users aria-hidden="true" className="h-4 w-4 mr-1" />
                Unirse
              </Link>
              {owner && (
                <Link
                  href="/quiniela/create"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Plus aria-hidden="true" className="h-4 w-4 mr-1" />
                  Crear
                </Link>
              )}
            </div>
          </div>

          {memberships && memberships.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {memberships.map((m) => {
                const q = m.quinielas as unknown as {
                  id: string;
                  name: string;
                  invite_code: string;
                };
                return (
                  <Link key={q.id} href={`/quiniela/${q.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{q.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Código:{" "}
                          <code className="font-mono text-foreground">
                            {q.invite_code}
                          </code>
                        </span>
                        <span className="text-base font-bold text-primary">
                          {m.total_points} pts
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <p className="font-medium text-sm">
                  Aún no estás en ninguna quiniela
                </p>
                <p className="text-xs mt-1">
                  Crea una nueva o únete con un código de invitación.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Tabla de posiciones */}
        <section className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span>🏆</span>
                Tabla de Posiciones — Clausura 2026
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              {standings && standings.length > 0 ? (
                <StandingsTable standings={standings} />
              ) : (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Datos no disponibles aún. Se actualizan cada hora.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              Clasificación directa
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Zona de descenso
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="font-semibold text-green-600">G</span> Victoria ·{" "}
              <span className="font-semibold text-yellow-600">E</span> Empate ·{" "}
              <span className="font-semibold text-red-500">P</span> Derrota
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
