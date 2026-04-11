"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(data: { email: string; password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function registerAction(data: {
  email: string;
  password: string;
  username: string;
}) {
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { username: data.username },
    },
  });

  if (error) return { error: error.message };

  // Actualizar perfil con el username elegido (el trigger puede haber usado el email)
  if (authData.user) {
    await supabase
      .from("profiles")
      .update({ username: data.username })
      .eq("id", authData.user.id);
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
