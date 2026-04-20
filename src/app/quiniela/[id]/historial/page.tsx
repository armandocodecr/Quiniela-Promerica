"use server";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Trophy, ArrowLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HistorialPage({ params }: Props) {
  const { id: quinielaId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: quiniela }, { data: membership }] = await Promise.all([
    supabase.from("quinielas").select("id, name").eq("id", quinielaId).single(),
    supabase
      .from("quiniela_members")
      .select("user_id")
      .eq("quiniela_id", quinielaId)
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!quiniela || !membership) notFound();

  const { data: predRows } = await supabase
    .from("predictions")
    .select(`points_earned, matches(jornadas(id, number, status, lock_datetime))`)
    .eq("quiniela_id", quinielaId)
    .eq("user_id", user.id);

  // Agrupar por jornada
  const jornadaMap = new Map<
    string,
    { id: string; number: number; status: string; lock_datetime: string; points: number; count: number }
  >();

  for (const row of predRows ?? []) {
    const j = (row.matches as unknown as { jornadas: { id: string; number: number; status: string; lock_datetime: string } | null })?.jornadas;
    if (!j) continue;
    const existing = jornadaMap.get(j.id);
    if (existing) {
      existing.points += row.points_earned ?? 0;
      existing.count += 1;
    } else {
      jornadaMap.set(j.id, {
        id: j.id,
        number: j.number,
        status: j.status,
        lock_datetime: j.lock_datetime,
        points: row.points_earned ?? 0,
        count: 1,
      });
    }
  }

  const jornadas = [...jornadaMap.values()].sort((a, b) => b.number - a.number);

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <Link
            href={`/quiniela/${quinielaId}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"
          >
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-none truncate">{quiniela.name}</h1>
            <p className="text-xs text-muted-foreground">Mis jornadas</p>
          </div>
          <Link
            href={`/quiniela/${quinielaId}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Volver
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-3">
        {jornadas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock aria-hidden="true" className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aún no has participado en ninguna jornada.
              </p>
            </CardContent>
          </Card>
        ) : (
          jornadas.map((j) => {
            const isCompleted = j.status === "completed";
            return (
              <Link key={j.id} href={`/quiniela/${quinielaId}/predict/${j.id}`}>
                <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
                  <CardContent className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        {j.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Jornada {j.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {j.count} {j.count === 1 ? "predicción" : "predicciones"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <>
                            <Badge
                              variant={j.points > 0 ? "default" : "secondary"}
                              className="tabular-nums font-bold text-sm px-2.5"
                            >
                              {j.points} pts
                            </Badge>
                            <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-green-500" />
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock aria-hidden="true" className="h-3 w-3" />
                            En curso
                          </Badge>
                        )}
                        <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
