"use server";

import { createClient } from "@/lib/supabase/server";
import { getFixtures, getStandings } from "@/lib/api-football";
import { calcPoints } from "@/lib/scoring";
import { isOwner } from "@/lib/owner";
import { syncStuckMatches } from "@/lib/sync-stuck-matches";

export async function syncStandings(): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  if (!isOwner(user.email)) return { error: "Acceso denegado." };

  let standings;
  try {
    standings = await getStandings();
  } catch (e) {
    return { error: `ESPN error: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!standings.length) return { error: "ESPN no devolvió datos de posiciones." };

  const { error } = await supabase
    .from("cache")
    .upsert(
      { key: "standings", data: standings, fetched_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) return { error: `Error al guardar: ${error.message}` };

  return { success: `Tabla de posiciones actualizada (${standings.length} equipos).` };
}

export async function syncResults(): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  if (!isOwner(user.email)) return { error: "Acceso denegado." };

  let fixtures;
  try {
    fixtures = await getFixtures();
  } catch (e) {
    return { error: `ESPN error: ${e instanceof Error ? e.message : String(e)}` };
  }

  const finished = fixtures.filter((f) => f.fixture.status.short === "FT");

  // Cache standings while we're at it
  try {
    const standings = await getStandings();
    if (standings.length > 0) {
      await supabase.from("cache").upsert(
        { key: "standings", data: standings, fetched_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
  } catch { /* non-fatal */ }

  if (!finished.length) {
    // Aunque no haya partidos hoy, igualmente buscar partidos pasados atascados
    const stuck = await syncStuckMatches(supabase);
    const parts: string[] = ["No hay partidos finalizados hoy en ESPN."];
    if (stuck.recovered > 0) parts.push(`${stuck.recovered} partido(s) recuperado(s) de ESPN.`);
    if (stuck.forceClosed > 0) parts.push(`${stuck.forceClosed} partido(s) cerrado(s) sin marcador.`);
    if (stuck.jornadasCompleted > 0) parts.push(`${stuck.jornadasCompleted} jornada(s) completada(s).`);
    return { success: parts.join(" ") };
  }

  const espnIds = finished.map((f) => f.fixture.id);
  const { data: dbMatches } = await supabase
    .from("matches")
    .select("id, espn_id, status")
    .in("espn_id", espnIds)
    .neq("status", "finished");

  if (!dbMatches?.length) return { success: "Todos los partidos ya estaban actualizados." };

  let updatedCount = 0;
  let pointsCount = 0;

  for (const dbMatch of dbMatches) {
    const espnMatch = finished.find((f) => f.fixture.id === dbMatch.espn_id);
    if (!espnMatch || espnMatch.goals.home == null || espnMatch.goals.away == null) continue;

    const homeScore = espnMatch.goals.home;
    const awayScore = espnMatch.goals.away;

    await supabase
      .from("matches")
      .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
      .eq("id", dbMatch.id);

    updatedCount++;

    const { data: predictions } = await supabase
      .from("predictions")
      .select("id, user_id, quiniela_id, home_score_pred, away_score_pred")
      .eq("match_id", dbMatch.id);

    if (!predictions?.length) continue;

    for (const pred of predictions) {
      const pts = calcPoints(
        { home: pred.home_score_pred, away: pred.away_score_pred },
        { home: homeScore, away: awayScore }
      );

      await supabase.from("predictions").update({ points_earned: pts }).eq("id", pred.id);

      const { data: totalResult } = await supabase
        .from("predictions")
        .select("points_earned")
        .eq("user_id", pred.user_id)
        .eq("quiniela_id", pred.quiniela_id);

      const total = totalResult?.reduce((sum, r) => sum + (r.points_earned ?? 0), 0) ?? 0;

      await supabase
        .from("quiniela_members")
        .update({ total_points: total })
        .eq("user_id", pred.user_id)
        .eq("quiniela_id", pred.quiniela_id);

      pointsCount++;
    }
  }

  // Marcar jornadas como completed si todos sus partidos terminaron
  const jornadaIds = [
    ...new Set(
      (await supabase.from("matches").select("jornada_id").in("id", dbMatches.map((m) => m.id)))
        .data?.map((m) => m.jornada_id) ?? []
    ),
  ];

  for (const jornadaId of jornadaIds) {
    const { data: pending } = await supabase
      .from("matches").select("id").eq("jornada_id", jornadaId).neq("status", "finished");
    if (pending?.length === 0) {
      await supabase.from("jornadas").update({ status: "completed" }).eq("id", jornadaId);
    }
  }

  const stuck = await syncStuckMatches(supabase);

  const parts = [`${updatedCount} partido(s) actualizado(s), ${pointsCount} predicción(es) puntuadas.`];
  if (stuck.recovered > 0) parts.push(`${stuck.recovered} partido(s) atascado(s) recuperado(s) de ESPN.`);
  if (stuck.forceClosed > 0) parts.push(`${stuck.forceClosed} partido(s) cerrado(s) sin marcador.`);
  if (stuck.jornadasCompleted > 0) parts.push(`${stuck.jornadasCompleted} jornada(s) completada(s) automáticamente.`);

  return { success: parts.join(" ") };
}

export async function syncJornada(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  if (!isOwner(user.email)) return { error: "Acceso denegado." };

  const jornadaNumber = parseInt(formData.get("number") as string);
  const lockDatetime = formData.get("lock_datetime") as string;
  const startDate = formData.get("start_date") as string; // YYYY-MM-DD

  if (!jornadaNumber || jornadaNumber < 1)
    return { error: "Número de jornada inválido." };
  if (!lockDatetime)
    return { error: "Debes indicar la fecha/hora de cierre." };
  if (!startDate)
    return { error: "Debes indicar la fecha de inicio de la jornada." };

  // Buscar partidos en los 4 días desde start_date (cubre cualquier jornada)
  const start = new Date(startDate + "T00:00:00");
  const dates: string[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, "")); // YYYYMMDD
  }

  // Obtener fixtures de ESPN para cada día y combinar (dedup por espn_id)
  const fixturesMap = new Map<string, Awaited<ReturnType<typeof getFixtures>>[number]>();
  for (const date of dates) {
    try {
      const daily = await getFixtures(date);
      daily.forEach((f) => fixturesMap.set(f.fixture.id, f));
    } catch (e) {
      return { error: `ESPN error (${date}): ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  const fixtures = [...fixturesMap.values()];
  if (!fixtures.length) return { error: "ESPN no devolvió partidos para ese rango de fechas." };

  // Upsert jornada
  const { data: jornada, error: jErr } = await supabase
    .from("jornadas")
    .upsert(
      {
        number: jornadaNumber,
        season: "clausura-2026",
        lock_datetime: new Date(lockDatetime).toISOString(),
        status: "upcoming",
      },
      { onConflict: "number,season" }
    )
    .select("id")
    .single();

  if (jErr || !jornada) return { error: `Error al crear jornada: ${jErr?.message}` };

  // Upsert matches
  const rows = fixtures.map((f) => ({
    jornada_id: jornada.id,
    home_team: f.teams.home.name,
    away_team: f.teams.away.name,
    home_team_logo: f.teams.home.logo,
    away_team_logo: f.teams.away.logo,
    match_datetime: f.fixture.date,
    espn_id: f.fixture.id,
    status: f.fixture.status.short === "FT" ? "finished" : "upcoming",
    ...(f.goals.home !== null && { home_score: f.goals.home }),
    ...(f.goals.away !== null && { away_score: f.goals.away }),
  }));

  const { error: mErr } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "espn_id" });

  if (mErr) return { error: `Error al guardar partidos: ${mErr.message}` };

  return {
    success: `Jornada ${jornadaNumber} sincronizada con ${fixtures.length} partidos.`,
  };
}
