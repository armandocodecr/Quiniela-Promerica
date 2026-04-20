import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Trophy, ArrowLeft, Copy, Calendar, Target, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LeaderboardRealtime } from "@/components/leaderboard-realtime";
import { DeleteQuinielaButton } from "@/components/delete-quiniela-button";
import { LeaveQuinielaButton } from "@/components/leave-quiniela-button";
import { isOwner } from "@/lib/owner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface Props {
  params: Promise<{ id: string }>;
}

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  match_datetime: string;
  home_score: number | null;
  away_score: number | null;
  status: "upcoming" | "live" | "finished";
}

function matchStatusLabel(status: MatchRow["status"]): string {
  if (status === "finished") return "FT";
  if (status === "live") return "EN VIVO";
  return "";
}

export default async function QuinielaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const owner = isOwner(user.email);

  const [{ data: quiniela }, { data: membership }] = await Promise.all([
    supabase
      .from("quinielas")
      .select("id, name, invite_code, season")
      .eq("id", id)
      .single(),
    supabase
      .from("quiniela_members")
      .select("user_id")
      .eq("quiniela_id", id)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!quiniela || !membership) notFound();

  // Members + activeJornada are independent — fetch in parallel
  const [{ data: members }, { data: activeJornada }] = await Promise.all([
    supabase
      .from("quiniela_members")
      .select(`total_points, user_id, profiles(username)`)
      .eq("quiniela_id", id)
      .order("total_points", { ascending: false }),
    supabase
      .from("jornadas")
      .select("id, number, lock_datetime, status")
      .in("status", ["upcoming", "active"])
      .order("number", { ascending: false })
      .limit(1)
      .single(),
  ]);

  // Matches depend on activeJornada — fetch after
  const { data: matchRows } = activeJornada?.id
    ? await supabase
        .from("matches")
        .select("id, home_team, away_team, home_team_logo, away_team_logo, match_datetime, home_score, away_score, status")
        .eq("jornada_id", activeJornada.id)
        .order("match_datetime", { ascending: true })
    : { data: [] };

  const matches: MatchRow[] = (matchRows ?? []) as MatchRow[];

  // Verificar si el usuario ya envió predicciones para esta jornada
  const matchIds = matches.map((m) => m.id);
  const { data: userPreds } = matchIds.length > 0
    ? await supabase
        .from("predictions")
        .select("id")
        .eq("quiniela_id", id)
        .eq("user_id", user.id)
        .in("match_id", matchIds)
        .limit(1)
    : { data: [] };

  const hasSubmitted = (userPreds ?? []).length > 0;

  const initialMembers = (members ?? []).map((m) => ({
    user_id: m.user_id,
    username: (m.profiles as unknown as { username: string })?.username ?? "—",
    total_points: m.total_points,
  }));

  const userRank = initialMembers.findIndex((m) => m.user_id === user.id) + 1;

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"
          >
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-none truncate">{quiniela.name}</h1>
            <p className="text-xs text-muted-foreground">{quiniela.season}</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* CTA predecir — solo cuando hay jornada activa y el usuario aún no envió */}
        {activeJornada && !hasSubmitted && (
          <Link
            href={`/quiniela/${id}/predict/${activeJornada.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary px-5 py-4 text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
                <Target aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">
                  Jornada {activeJornada.number} — ¡Haz tus predicciones!
                </p>
                <p className="mt-1 text-xs text-primary-foreground/70">
                  Cierre:{" "}
                  {new Date(activeJornada.lock_datetime).toLocaleString("es-CR", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0 rotate-180 opacity-70" />
          </Link>
        )}

        {/* Código + enlace "ver predicciones" cuando ya envió */}
        <div className="flex items-center gap-4 flex-wrap">
          {owner && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              Código:{" "}
              <code className="font-mono font-semibold text-foreground tracking-wider">
                {quiniela.invite_code}
              </code>
            </div>
          )}
          {activeJornada && hasSubmitted && (
            <Link
              href={`/quiniela/${id}/predict/${activeJornada.id}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              <Target aria-hidden="true" className="h-4 w-4 mr-1.5" />
              Ver mis predicciones — Jornada {activeJornada.number}
            </Link>
          )}
          <Link
            href={`/quiniela/${id}/historial`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            <History aria-hidden="true" className="h-4 w-4 mr-1.5" />
            Mis jornadas
          </Link>
          {owner
            ? <DeleteQuinielaButton quinielaId={id} quinielaName={quiniela.name} />
            : <LeaveQuinielaButton quinielaId={id} quinielaName={quiniela.name} />
          }
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Leaderboard — actualización en tiempo real */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Clasificación
            </h2>
            <LeaderboardRealtime
              quinielaId={id}
              currentUserId={user.id}
              initialMembers={initialMembers}
            />
            {userRank > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Estás en el puesto {userRank} de {initialMembers.length}
              </p>
            )}
          </section>

          {/* Partidos de la jornada activa */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Partidos
            </h2>
            {matches.length > 0 ? (
              <div className="space-y-2">
                {matches.map((m) => (
                  <Card key={m.id}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-1 items-center gap-2 justify-end min-w-0">
                          <span className="text-sm font-medium text-right leading-tight truncate">
                            {m.home_team}
                          </span>
                          {m.home_team_logo && (
                            <Image
                              src={m.home_team_logo}
                              alt={m.home_team}
                              width={22}
                              height={22}
                              className="object-contain shrink-0"
                            />
                          )}
                        </div>

                        <div className="text-center min-w-[52px] shrink-0">
                          {m.home_score !== null && m.away_score !== null ? (
                            <span className="text-sm font-bold">
                              {m.home_score} - {m.away_score}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">
                              {new Date(m.match_datetime).toLocaleDateString("es-CR", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {matchStatusLabel(m.status)}
                          </p>
                        </div>

                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          {m.away_team_logo && (
                            <Image
                              src={m.away_team_logo}
                              alt={m.away_team}
                              width={22}
                              height={22}
                              className="object-contain shrink-0"
                            />
                          )}
                          <span className="text-sm font-medium leading-tight truncate">
                            {m.away_team}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar aria-hidden="true" className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No hay partidos disponibles en este momento.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
