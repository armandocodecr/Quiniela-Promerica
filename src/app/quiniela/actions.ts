"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/owner";

export async function createQuiniela(
  _prevState: { error: string } | undefined,
  formData: FormData
) {
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 3) return { error: "El nombre debe tener al menos 3 caracteres." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  if (!isOwner(user.email)) return { error: "Solo el administrador puede crear quinielas." };

  // Generar UUID aquí para evitar .select() post-insert
  // (el SELECT fallaría porque el usuario aún no está en quiniela_members)
  const quinielaId = crypto.randomUUID();

  const { error: qErr } = await supabase
    .from("quinielas")
    .insert({ id: quinielaId, name, created_by: user.id });

  if (qErr) return { error: qErr.message };

  // Agregar al creador como miembro
  const { error: mErr } = await supabase
    .from("quiniela_members")
    .insert({ quiniela_id: quinielaId, user_id: user.id });

  if (mErr) return { error: mErr.message };

  redirect(`/quiniela/${quinielaId}`);
}

export async function deleteQuiniela(
  quinielaId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };
  if (!isOwner(user.email)) return { error: "Acceso denegado." };

  const { error } = await supabase
    .from("quinielas")
    .delete()
    .eq("id", quinielaId);

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function joinQuiniela(
  _prevState: { error: string } | undefined,
  formData: FormData
) {
  const code = (formData.get("code") as string)?.trim().toLowerCase();
  if (!code || code.length !== 8) return { error: "El código debe tener 8 caracteres." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  // Buscar la quiniela por código
  const { data: quiniela, error: qErr } = await supabase
    .from("quinielas")
    .select("id, name")
    .eq("invite_code", code)
    .single();

  if (qErr || !quiniela) return { error: "Código inválido. Verifica e intenta de nuevo." };

  // Verificar si ya es miembro
  const { data: existing } = await supabase
    .from("quiniela_members")
    .select("user_id")
    .eq("quiniela_id", quiniela.id)
    .eq("user_id", user.id)
    .single();

  if (existing) redirect(`/quiniela/${quiniela.id}`);

  // Unirse
  const { error: mErr } = await supabase
    .from("quiniela_members")
    .insert({ quiniela_id: quiniela.id, user_id: user.id });

  if (mErr) return { error: mErr.message };

  redirect(`/quiniela/${quiniela.id}`);
}
