"use client";

import { useActionState } from "react";
import { syncJornada, syncStandings, syncResults } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, BarChart2, Zap } from "lucide-react";
import Link from "next/link";

export default function AdminSyncPage() {
  const [state, action, isPending] = useActionState(syncJornada, undefined);
  const [standingsState, standingsAction, standingsPending] = useActionState(
    async (_prev: { error?: string; success?: string } | undefined) => syncStandings(),
    undefined
  );
  const [resultsState, resultsAction, resultsPending] = useActionState(
    async (_prev: { error?: string; success?: string } | undefined) => syncResults(),
    undefined
  );

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"
          >
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary-foreground" />
          </Link>
          <div>
            <h1 className="text-base font-bold leading-none">Admin — Sincronizar jornada</h1>
            <p className="text-xs text-muted-foreground">
              Lee los partidos de ESPN y los guarda en Supabase
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Standings sync */}
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 aria-hidden="true" className="h-4 w-4" />
              Tabla de posiciones
            </CardTitle>
            <CardDescription>
              Descarga la tabla de posiciones actual de ESPN y la guarda en caché.
              El dashboard la muestra desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={standingsAction} className="space-y-4">
              {standingsState?.error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {standingsState.error}
                </p>
              )}
              {standingsState?.success && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {standingsState.success}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={standingsPending}>
                <RefreshCw aria-hidden="true" className={`h-4 w-4 mr-2 ${standingsPending ? "animate-spin" : ""}`} />
                {standingsPending ? "Sincronizando…" : "Sincronizar posiciones"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results sync */}
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap aria-hidden="true" className="h-4 w-4" />
              Resultados y puntos
            </CardTitle>
            <CardDescription>
              Descarga los resultados de hoy desde ESPN, actualiza marcadores,
              calcula puntos de predicciones y actualiza la clasificación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resultsAction} className="space-y-4">
              {resultsState?.error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {resultsState.error}
                </p>
              )}
              {resultsState?.success && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {resultsState.success}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={resultsPending}>
                <RefreshCw aria-hidden="true" className={`h-4 w-4 mr-2 ${resultsPending ? "animate-spin" : ""}`} />
                {resultsPending ? "Sincronizando…" : "Sincronizar resultados"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sincronizar jornada actual</CardTitle>
            <CardDescription>
              Indica el número de jornada, la fecha del primer partido y la hora
              de cierre. El sync recorre cada día del rango y trae todos los partidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="number" className="text-sm font-medium">
                  Número de jornada
                </label>
                <input
                  id="number"
                  name="number"
                  type="number"
                  min={1}
                  max={22}
                  placeholder="ej. 15"
                  className="w-full rounded-md border border-input bg-background px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="start_date" className="text-sm font-medium">
                  Fecha del primer partido
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  className="w-full rounded-md border border-input bg-background px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Día en que arranca la jornada (se buscará hasta la fecha de cierre).
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lock_datetime" className="text-sm font-medium">
                  Cierre de predicciones
                </label>
                <input
                  id="lock_datetime"
                  name="lock_datetime"
                  type="datetime-local"
                  className="w-full rounded-md border border-input bg-background px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Hora del primer partido — después no se aceptan predicciones.
                </p>
              </div>

              {state?.error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {state.error}
                </p>
              )}
              {state?.success && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {state.success}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                <RefreshCw aria-hidden="true" className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
                {isPending ? "Sincronizando…" : "Sincronizar desde ESPN"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
