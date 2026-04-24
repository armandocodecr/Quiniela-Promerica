import type { SupabaseClient } from "@supabase/supabase-js";
import { getFixtures } from "./api-football";
import { calcPoints } from "./scoring";

/**
 * Busca partidos que ya deberían haber terminado (match_datetime > 2h atrás) pero
 * siguen en "upcoming". Intenta recuperar el resultado de ESPN por fecha; si ESPN
 * no lo tiene, cierra el partido sin marcador para desbloquear la jornada.
 */
export async function syncStuckMatches(supabase: SupabaseClient): Promise<{
  recovered: number;
  forceClosed: number;
  jornadasCompleted: number;
}> {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: stuckMatches } = await supabase
    .from("matches")
    .select("id, espn_id, match_datetime, jornada_id")
    .neq("status", "finished")
    .lt("match_datetime", cutoff);

  if (!stuckMatches?.length) return { recovered: 0, forceClosed: 0, jornadasCompleted: 0 };

  // Agrupar por fecha YYYYMMDD para minimizar llamadas a ESPN
  const dateGroups = new Map<string, typeof stuckMatches>();
  for (const m of stuckMatches) {
    const dateKey = m.match_datetime.slice(0, 10).replace(/-/g, "");
    const group = dateGroups.get(dateKey) ?? [];
    group.push(m);
    dateGroups.set(dateKey, group);
  }

  let recovered = 0;
  let forceClosed = 0;

  for (const [dateKey, dayMatches] of dateGroups) {
    let dailyFixtures: Awaited<ReturnType<typeof getFixtures>> = [];
    try {
      dailyFixtures = await getFixtures(dateKey);
    } catch {
      // Si ESPN falla para esa fecha, cerramos sin score igualmente
    }

    for (const dbMatch of dayMatches) {
      const espnMatch = dailyFixtures.find(
        (f) => f.fixture.id === dbMatch.espn_id && f.goals.home != null && f.goals.away != null
      );

      if (espnMatch) {
        const homeScore = espnMatch.goals.home!;
        const awayScore = espnMatch.goals.away!;

        await supabase
          .from("matches")
          .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
          .eq("id", dbMatch.id);

        const { data: predictions } = await supabase
          .from("predictions")
          .select("id, user_id, quiniela_id, home_score_pred, away_score_pred")
          .eq("match_id", dbMatch.id);

        for (const pred of predictions ?? []) {
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
        }

        recovered++;
      } else {
        // ESPN no tiene el resultado — cerrar sin marcador para desbloquear la jornada
        await supabase.from("matches").update({ status: "finished" }).eq("id", dbMatch.id);
        forceClosed++;
      }
    }
  }

  // Marcar jornadas como completed si ya no quedan partidos pendientes
  const jornadaIds = [...new Set(stuckMatches.map((m) => m.jornada_id))];
  let jornadasCompleted = 0;

  for (const jornadaId of jornadaIds) {
    const { data: pending } = await supabase
      .from("matches")
      .select("id")
      .eq("jornada_id", jornadaId)
      .neq("status", "finished");

    if (pending?.length === 0) {
      await supabase.from("jornadas").update({ status: "completed" }).eq("id", jornadaId);
      jornadasCompleted++;
    }
  }

  return { recovered, forceClosed, jornadasCompleted };
}
