import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PredictForm } from "./predict-form";

interface Props {
  params: Promise<{ id: string; jornada_id: string }>;
}

export default async function PredictPage({ params }: Props) {
  const { id: quinielaId, jornada_id: jornadaId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  if (!jornada) notFound();

  const hasSubmitted = (preds ?? []).length > 0;
  const isLocked = hasSubmitted || new Date() >= new Date(jornada.lock_datetime);

  return (
    <PredictForm
      quinielaId={quinielaId}
      jornadaId={jornadaId}
      jornada={jornada}
      matches={matchRows ?? []}
      predictions={preds ?? []}
      isLocked={isLocked}
      hasSubmitted={hasSubmitted}
    />
  );
}
