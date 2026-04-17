import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary"
          >
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary-foreground" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-none">Mi perfil</h1>
            <p className="text-xs text-muted-foreground">
              {profile?.username ?? user.email}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8">
        <ProfileForm currentUsername={profile?.username ?? ""} />
      </div>
    </main>
  );
}
