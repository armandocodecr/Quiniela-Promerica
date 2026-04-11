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

  // Verificar lock en el servidor (doble capa junto con RLS)
  const { data: jornada } = await supabase
    .from("jornadas")
    .select("lock_datetime, status")
    .eq("id", jornadaId)
    .single();

  if (!jornada) return { error: "Jornada no encontrada." };
  if (new Date() >= new Date(jornada.lock_datetime))
    return { error: "El plazo para predecir ya cerró." };

  // Verificar membresía
  const { data: member } = await supabase
    .from("quiniela_members")
    .select("user_id")
    .eq("quiniela_id", quinielaId)
    .eq("user_id", user.id)
    .single();

  if (!member) return { error: "No eres miembro de esta quiniela." };

  const matchIds = predictions.map((p) => p.matchId);

  // Bloquear si el usuario ya tiene predicciones para esta jornada
  const { data: existing } = await supabase
    .from("predictions")
    .select("id")
    .eq("quiniela_id", quinielaId)
    .eq("user_id", user.id)
    .in("match_id", matchIds)
    .limit(1);

  if (existing && existing.length > 0)
    return { error: "Ya enviaste tus predicciones. No se pueden modificar." };

  // Solo permitir predicciones para partidos que aún no han empezado
  const { data: validMatches } = await supabase
    .from("matches")
    .select("id")
    .in("id", matchIds)
    .eq("status", "upcoming")
    .gt("match_datetime", new Date().toISOString());

  const validIds = new Set((validMatches ?? []).map((m) => m.id));
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
