"use client";

import { useState } from "react";
import { upsertPredictions } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, ArrowLeft, Lock, Save, Radio, AlertTriangle } from "lucide-react";
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

interface Props {
  quinielaId: string;
  jornadaId: string;
  jornada: Jornada;
  matches: Match[];
  predictions: Prediction[];
}

export function PredictForm({ quinielaId, jornadaId, jornada, matches, predictions }: Props) {
  const predsMap: Record<string, Prediction> = {};
  const initValues: Record<string, { home: string; away: string }> = {};

  predictions.forEach((p) => { predsMap[p.match_id] = p; });
  matches.forEach((m) => {
    const p = predsMap[m.id];
    initValues[m.id] = {
      home: p ? String(p.home_score_pred) : "",
      away: p ? String(p.away_score_pred) : "",
    };
  });

  const [predState, setPredState] = useState<Record<string, Prediction>>(predsMap);
  const [values, setValues] = useState<Record<string, { home: string; away: string }>>(initValues);
  const [saveStatus, setSaveStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Un partido está bloqueado si: está en curso, ya terminó,
  // o el usuario ya envió predicción para ese partido.
  const isMatchLocked = (m: Match) =>
    m.status === "finished" ||
    m.status === "live" ||
    !!predState[m.id];

  const hasEditableMatches = matches.some((m) => !isMatchLocked(m));

  const handleChange = (matchId: string, side: "home" | "away", val: string) => {
    const clean = val.replace(/[^0-9]/g, "").slice(0, 2);
    setValues((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: clean } }));
  };

  const pendingPreds = () =>
    matches
      .filter((m) => !isMatchLocked(m))
      .map((m) => ({
        matchId: m.id,
        home: parseInt(values[m.id]?.home ?? ""),
        away: parseInt(values[m.id]?.away ?? ""),
      }))
      .filter((p) => !isNaN(p.home) && !isNaN(p.away));

  const handleSaveClick = () => {
    if (!hasEditableMatches) return;
    setSaveStatus(null);

    if (pendingPreds().length === 0) {
      setSaveStatus({ error: "Completa al menos una predicción para los partidos disponibles." });
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsPending(true);

    const preds = pendingPreds();

    const result = await upsertPredictions(quinielaId, jornadaId, preds);
    setSaveStatus(result);

    if (result.success) {
      setPredState((prev) => {
        const next = { ...prev };
        for (const p of preds) {
          next[p.matchId] = {
            match_id: p.matchId,
            home_score_pred: p.home,
            away_score_pred: p.away,
            points_earned: 0,
          };
        }
        return next;
      });
    }

    setIsPending(false);
  };

  const isCompleted = jornada.status === "completed";
  const totalPoints = Object.values(predState).reduce(
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
              {!hasEditableMatches ? (
                <><Lock aria-hidden="true" className="h-3 w-3" /> Predicciones cerradas</>
              ) : (
                <>Predecí antes de que empiece cada partido</>
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
        {isCompleted && (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium">Tu resultado en esta jornada</span>
            <Badge variant="default" className="text-base font-bold px-3 py-1">
              {totalPoints} pts
            </Badge>
          </div>
        )}

        {!hasEditableMatches && !isCompleted && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <Lock aria-hidden="true" className="h-4 w-4 shrink-0" />
            Las predicciones están cerradas. Los resultados aparecerán al terminar los partidos.
          </div>
        )}

        {matches.map((m) => {
          const pred = predState[m.id];
          const hasResult = m.home_score !== null && m.away_score !== null;

          return (
            <Card key={m.id}>
              <CardContent className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs text-center text-muted-foreground">
                    {new Date(m.match_datetime).toLocaleString("es-CR", {
                      weekday: "short", day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  {m.status === "live" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      <Radio aria-hidden="true" className="h-3 w-3 animate-pulse" />
                      EN VIVO
                    </span>
                  )}
                  {m.status === "finished" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      <Lock aria-hidden="true" className="h-3 w-3" />
                      Finalizado
                    </span>
                  )}
                </div>

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

                <div className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-2 justify-end min-w-0">
                    <span className="text-sm font-medium text-right leading-tight truncate">
                      {m.home_team}
                    </span>
                    {m.home_team_logo && (
                      <Image src={m.home_team_logo} alt={m.home_team} width={28} height={28} className="object-contain shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isMatchLocked(m) ? (
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

                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    {m.away_team_logo && (
                      <Image src={m.away_team_logo} alt={m.away_team} width={28} height={28} className="object-contain shrink-0" />
                    )}
                    <span className="text-sm font-medium leading-tight truncate">{m.away_team}</span>
                  </div>

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

        {hasEditableMatches && (
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
            <Button onClick={handleSaveClick} disabled={isPending} className="w-full">
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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 text-yellow-500" />
              ¿Confirmar predicciones?
            </DialogTitle>
            <DialogDescription>
              Una vez guardadas <strong>no podrás modificarlas</strong>. Asegúrate de que los
              marcadores que ingresaste son los correctos antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Revisar
            </Button>
            <Button onClick={handleConfirm}>
              <Save aria-hidden="true" className="h-4 w-4 mr-2" />
              Sí, guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
