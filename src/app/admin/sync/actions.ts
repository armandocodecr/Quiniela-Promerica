"use server";

import { createClient } from "@/lib/supabase/server";
import { getFixtures } from "@/lib/api-football";
import { isOwner } from "@/lib/owner";

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
