import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFixtures, getStandings } from "@/lib/api-football";
import { calcPoints } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Protección básica con secret header para Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // 1. Obtener resultados de ESPN
  let fixtures;
  try {
    fixtures = await getFixtures();
  } catch {
    return NextResponse.json({ error: "ESPN fetch failed" }, { status: 500 });
  }

  const finished = fixtures.filter((f) => f.fixture.status.short === "FT");

  // Cache standings unconditionally so dashboard never calls ESPN directly
  try {
    const standings = await getStandings();
    if (standings.length > 0) {
      await supabase
        .from("cache")
        .upsert(
          { key: "standings", data: standings, fetched_at: new Date().toISOString() },
          { onConflict: "key" }
        );
    }
  } catch {
    // Non-fatal: standings failure does not block match sync
  }

  if (!finished.length) {
    return NextResponse.json({ message: "No finished matches" });
  }

  // 2. Buscar matches en DB por espn_id
  const espnIds = finished.map((f) => f.fixture.id);
  const { data: dbMatches } = await supabase
    .from("matches")
    .select("id, espn_id, status")
    .in("espn_id", espnIds)
    .neq("status", "finished");

  if (!dbMatches?.length) {
    return NextResponse.json({ message: "No pending matches to update" });
  }

  let updatedCount = 0;
  let pointsCount = 0;

  for (const dbMatch of dbMatches) {
    const espnMatch = finished.find((f) => f.fixture.id === dbMatch.espn_id);
    if (!espnMatch || espnMatch.goals.home == null || espnMatch.goals.away == null)
      continue;

    const homeScore = espnMatch.goals.home;
    const awayScore = espnMatch.goals.away;

    // 3. Actualizar marcador y status del partido
    await supabase
      .from("matches")
      .update({ home_score: homeScore, away_score: awayScore, status: "finished" })
      .eq("id", dbMatch.id);

    updatedCount++;

    // 4. Calcular puntos para todas las predicciones de este partido
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

      await supabase
        .from("predictions")
        .update({ points_earned: pts })
        .eq("id", pred.id);

      // 5. Recalcular total_points del miembro en esa quiniela
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

  // 6. Marcar jornadas como completed si todos sus partidos terminaron
  const jornadaIds = [
    ...new Set(
      (
        await supabase
          .from("matches")
          .select("jornada_id")
          .in("id", dbMatches.map((m) => m.id))
      ).data?.map((m) => m.jornada_id) ?? []
    ),
  ];

  for (const jornadaId of jornadaIds) {
    const { data: pending } = await supabase
      .from("matches")
      .select("id")
      .eq("jornada_id", jornadaId)
      .neq("status", "finished");

    if (pending?.length === 0) {
      await supabase
        .from("jornadas")
        .update({ status: "completed" })
        .eq("id", jornadaId);
    }
  }

  return NextResponse.json({
    updated: updatedCount,
    predictionsScored: pointsCount,
    standingsCached: true,
  });
}
