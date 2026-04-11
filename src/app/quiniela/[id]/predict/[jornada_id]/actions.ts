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

  // Upsert predicciones
  const rows = predictions.map((p) => ({
    user_id: user.id,
    quiniela_id: quinielaId,
    match_id: p.matchId,
    home_score_pred: p.home,
    away_score_pred: p.away,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("predictions")
    .upsert(rows, { onConflict: "user_id,quiniela_id,match_id" });

  if (error) return { error: error.message };
  return { success: "¡Predicciones guardadas!" };
}
