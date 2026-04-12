"use server";

import { createClient } from "@/lib/supabase/server";

export async function upsertPredictions(
  quinielaId: string,
  jornadaId: string,
  predictions: { matchId: string; home: number; away: number }[]
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Verificar membresía
  const { data: member } = await supabase
    .from("quiniela_members")
    .select("user_id")
    .eq("quiniela_id", quinielaId)
    .eq("user_id", user.id)
    .single();

  if (!member) return { error: "No eres miembro de esta quiniela." };

  const matchIds = predictions.map((p) => p.matchId);

  // Excluir partidos que el usuario ya predijo (no se pueden modificar)
  const { data: existing } = await supabase
    .from("predictions")
    .select("match_id")
    .eq("quiniela_id", quinielaId)
    .eq("user_id", user.id)
    .in("match_id", matchIds);

  const alreadyPredictedIds = new Set((existing ?? []).map((e) => e.match_id));

  // Solo permitir predicciones para partidos que aún no han empezado y no fueron predichos
  const { data: validMatches } = await supabase
    .from("matches")
    .select("id")
    .in("id", matchIds)
    .eq("status", "upcoming")
    .gt("match_datetime", new Date().toISOString());

  const validIds = new Set(
    (validMatches ?? []).map((m) => m.id).filter((id) => !alreadyPredictedIds.has(id))
  );
  const validPredictions = predictions.filter((p) => validIds.has(p.matchId));

  if (validPredictions.length === 0)
    return { error: "No hay partidos disponibles para predecir." };

  // Insertar predicciones (insert, no upsert — ya no se permite editar)
  const rows = validPredictions.map((p) => ({
    user_id: user.id,
    quiniela_id: quinielaId,
    match_id: p.matchId,
    home_score_pred: p.home,
    away_score_pred: p.away,
  }));

  const { error } = await supabase
    .from("predictions")
    .insert(rows);

  if (error) return { error: error.message };
  return { success: "¡Predicciones guardadas!" };
}
