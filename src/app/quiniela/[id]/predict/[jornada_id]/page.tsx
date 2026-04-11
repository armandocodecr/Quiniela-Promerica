"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { upsertPredictions } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, Lock, Save } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  match_datetime: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface Prediction {
  match_id: string;
  home_score_pred: number;
  away_score_pred: number;
  points_earned: number;
}

interface Jornada {
  id: string;
  number: number;
  lock_datetime: string;
  status: string;
}

export default function PredictPage() {
  const params = useParams();
  const quinielaId = params.id as string;
  const jornadaId = params.jornada_id as string;
  const router = useRouter();

  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [values, setValues] = useState<Record<string, { home: string; away: string }>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: jornada }, { data: matchRows }, { data: preds }] =
        await Promise.all([
          supabase
            .from("jornadas")
            .select("id, number, lock_datetime, status")
            .eq("id", jornadaId)
            .single(),
          supabase
            .from("matches")
            .select("id, home_team, away_team, home_team_logo, away_team_logo, match_datetime, home_score, away_score, status")
            .eq("jornada_id", jornadaId)
            .order("match_datetime"),
          supabase
            .from("predictions")
            .select("match_id, home_score_pred, away_score_pred, points_earned")
            .eq("quiniela_id", quinielaId)
            .eq("user_id", user.id),
        ]);

      if (jornada) {
        setJornada(jornada);
        setIsLocked(new Date() >= new Date(jornada.lock_datetime));
      }
      if (matchRows) setMatches(matchRows);

      const predsMap: Record<string, Prediction> = {};
      const initValues: Record<string, { home: string; away: string }> = {};

      matchRows?.forEach((m) => {
        const p = (preds as Prediction[] | null)?.find((p) => p.match_id === m.id);
        if (p) predsMap[m.id] = p;
        initValues[m.id] = {
          home: p ? String(p.home_score_pred) : "",
          away: p ? String(p.away_score_pred) : "",
        };
      });

      setPredictions(predsMap);
      setValues(initValues);
      setLoading(false);
    }

    load();
  }, [jornadaId, quinielaId, router]);

  const handleChange = (matchId: string, side: "home" | "away", val: string) => {
    if (isLocked) return;
    const clean = val.replace(/[^0-9]/g, "").slice(0, 2);
    setValues((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: clean } }));
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    setIsPending(true);
    setSaveStatus(null);

    const preds = matches
      .map((m) => ({
        matchId: m.id,
        home: parseInt(values[m.id]?.home ?? ""),
        away: parseInt(values[m.id]?.away ?? ""),
      }))
      .filter((p) => !isNaN(p.home) && !isNaN(p.away));

    if (preds.length === 0) {
      setSaveStatus({ error: "Completa al menos una predicción." });
      setIsPending(false);
      return;
    }

    const result = await upsertPredictions(quinielaId, jornadaId, preds);
    setSaveStatus(result);
    setIsPending(false);
  };

  if (loading) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando…</p>
      </main>
    );
  }

  if (!jornada) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Jornada no encontrada.</p>
      </main>
    );
  }

  const isCompleted = jornada.status === "completed";
  const totalPoints = Object.values(predictions).reduce(
    (sum, p) => sum + (p.points_earned ?? 0),
    0
  );

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
          <div className="flex-1">
            <h1 className="text-base font-bold leading-none">
              Jornada {jornada.number}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isLocked ? (
                <><Lock aria-hidden="true" className="h-3 w-3" /> Predicciones cerradas</>
              ) : (
                <>
                  Cierre:{" "}
                  {new Date(jornada.lock_datetime).toLocaleString("es-CR", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </>
              )}
            </p>
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
        {/* Resumen de puntos si la jornada terminó */}
        {isCompleted && (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium">Tu resultado en esta jornada</span>
            <Badge variant="default" className="text-base font-bold px-3 py-1">
              {totalPoints} pts
            </Badge>
          </div>
        )}

        {isLocked && !isCompleted && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
            Las predicciones están cerradas. Los resultados aparecerán al terminar los partidos.
          </div>
        )}

        {matches.map((m) => {
          const pred = predictions[m.id];
          const hasResult = m.home_score !== null && m.away_score !== null;

          return (
            <Card key={m.id}>
              <CardContent className="px-4 py-4 space-y-3">
                <p className="text-xs text-center text-muted-foreground">
                  {new Date(m.match_datetime).toLocaleString("es-CR", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>

                {/* Resultado real (si existe) */}
                {hasResult && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex flex-1 items-center gap-2 justify-end">
                      {m.home_team_logo && (
                        <Image src={m.home_team_logo} alt={m.home_team} width={20} height={20} className="object-contain" />
                      )}
                      <span className="text-xs text-muted-foreground">{m.home_team}</span>
                    </div>
                    <span className="text-sm font-bold min-w-[48px] text-center">
                      {m.home_score} - {m.away_score}
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-xs text-muted-foreground">{m.away_team}</span>
                      {m.away_team_logo && (
                        <Image src={m.away_team_logo} alt={m.away_team} width={20} height={20} className="object-contain" />
                      )}
                    </div>
                  </div>
                )}

                {/* Fila de predicción */}
                <div className="flex items-center gap-3">
                  {/* Local */}
                  <div className="flex flex-1 items-center gap-2 justify-end min-w-0">
                    <span className="text-sm font-medium text-right leading-tight truncate">
                      {m.home_team}
                    </span>
                    {m.home_team_logo && (
                      <Image src={m.home_team_logo} alt={m.home_team} width={28} height={28} className="object-contain shrink-0" />
                    )}
                  </div>

                  {/* Inputs o predicción fija */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLocked ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`w-11 h-11 rounded-md border flex items-center justify-center text-base font-bold
                          ${pred && hasResult
                            ? pred.points_earned === 3
                              ? "border-green-300 bg-green-50 text-green-700"
                              : pred.points_earned === 1
                                ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                                : "border-red-200 bg-red-50 text-red-600"
                            : "border-input bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {pred ? pred.home_score_pred : "—"}
                        </span>
                        <span className="text-muted-foreground font-bold">-</span>
                        <span className={`w-11 h-11 rounded-md border flex items-center justify-center text-base font-bold
                          ${pred && hasResult
                            ? pred.points_earned === 3
                              ? "border-green-300 bg-green-50 text-green-700"
                              : pred.points_earned === 1
                                ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                                : "border-red-200 bg-red-50 text-red-600"
                            : "border-input bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {pred ? pred.away_score_pred : "—"}
                        </span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={values[m.id]?.home ?? ""}
                          onChange={(e) => handleChange(m.id, "home", e.target.value)}
                          placeholder="0"
                          className="w-11 h-11 rounded-md border border-input bg-background text-center text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <span className="text-muted-foreground font-bold">-</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={values[m.id]?.away ?? ""}
                          onChange={(e) => handleChange(m.id, "away", e.target.value)}
                          placeholder="0"
                          className="w-11 h-11 rounded-md border border-input bg-background text-center text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </>
                    )}
                  </div>

                  {/* Visitante */}
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    {m.away_team_logo && (
                      <Image src={m.away_team_logo} alt={m.away_team} width={28} height={28} className="object-contain shrink-0" />
                    )}
                    <span className="text-sm font-medium leading-tight truncate">{m.away_team}</span>
                  </div>

                  {/* Puntos ganados */}
                  {pred && hasResult && (
                    <Badge
                      variant={pred.points_earned > 0 ? "default" : "secondary"}
                      className="shrink-0 tabular-nums"
                    >
                      +{pred.points_earned}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!isLocked && matches.length > 0 && (
          <div className="pt-2 space-y-3">
            {saveStatus?.error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {saveStatus.error}
              </p>
            )}
            {saveStatus?.success && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {saveStatus.success}
              </p>
            )}
            <Button onClick={handleSubmit} disabled={isPending} className="w-full">
              <Save aria-hidden="true" className="h-4 w-4 mr-2" />
              {isPending ? "Guardando…" : "Guardar predicciones"}
            </Button>
          </div>
        )}

        {matches.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            No hay partidos cargados para esta jornada.
          </p>
        )}
      </div>
    </main>
  );
}
