import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Standing } from "@/lib/api-football";
import { StandingsTable } from "@/components/standings-table";
import { Trophy, Plus, Users, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const quinielaIds = (memberships ?? []).map(
    (m) => (m.quinielas as unknown as { id: string }).id
  );

  // Fetch active jornada, all members of user's quinielas, and user predictions — in parallel
  const [activeJornada, allMembers] = await Promise.all([
    supabase
      .from("jornadas")
      .select("id, number, status")
      .in("status", ["upcoming", "active"])
      .order("number", { ascending: false })
      .limit(1)
      .single()
      .then((r) => r.data),
    quinielaIds.length > 0
      ? supabase
          .from("quiniela_members")
          .select("quiniela_id, user_id, total_points")
          .in("quiniela_id", quinielaIds)
          .order("total_points", { ascending: false })
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ]);

  // Check which quinielas the user has already predicted for the active jornada
  const predictedSet = new Set<string>();
  if (activeJornada) {
    const { data: matchIds } = await supabase
      .from("matches")
      .select("id")
      .eq("jornada_id", activeJornada.id);

    const ids = (matchIds ?? []).map((m) => m.id);
    if (ids.length > 0) {
      const { data: userPreds } = await supabase
        .from("predictions")
        .select("quiniela_id")
        .eq("user_id", user.id)
        .in("match_id", ids);
      (userPreds ?? []).forEach((p) => predictedSet.add(p.quiniela_id));
    }
  }

  // Compute rank + member count per quiniela
  const quinielaStats: Record<string, { rank: number; memberCount: number }> = {};
  for (const qid of quinielaIds) {
    const members = (allMembers as { quiniela_id: string; user_id: string; total_points: number }[])
      .filter((m) => m.quiniela_id === qid);
    const rank = members.findIndex((m) => m.user_id === user.id) + 1;
    quinielaStats[qid] = { rank, memberCount: members.length };
  }

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
            <Link
              href="/profile"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {profile?.username ?? user.email}
            </Link>
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
                const stats = quinielaStats[q.id];
                const hasPredicted = predictedSet.has(q.id);

                return (
                  <Link key={q.id} href={`/quiniela/${q.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                      <CardContent className="px-4 py-4 flex flex-col gap-3">
                        {/* Top row: name + chevron */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold leading-tight">{q.name}</span>
                          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                        </div>

                        {/* Middle row: rank + points */}
                        <div className="flex items-center gap-3">
                          {stats && stats.rank > 0 && (
                            <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-3 py-1.5 min-w-[52px]">
                              <span className="text-base font-bold leading-none">{stats.rank}°</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                de {stats.memberCount}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xl font-bold text-primary leading-none">
                              {m.total_points}
                            </span>
                            <span className="text-xs text-muted-foreground">puntos</span>
                          </div>
                        </div>

                        {/* Bottom row: jornada status */}
                        {activeJornada && (
                          <div className="flex items-center gap-1.5">
                            {hasPredicted ? (
                              <Badge variant="secondary" className="gap-1 text-xs font-normal">
                                <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-green-600" />
                                Jornada {activeJornada.number} · Enviadas
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs font-normal border-yellow-400 text-yellow-700 bg-yellow-50">
                                <Clock aria-hidden="true" className="h-3 w-3" />
                                Jornada {activeJornada.number} · Pendiente
                              </Badge>
                            )}
                          </div>
                        )}
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
