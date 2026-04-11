import { Trophy, Target, Users, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
            <Trophy aria-hidden="true" className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base flex-1 truncate">Quiniela Promerica</span>
          <nav className="flex items-center gap-2 shrink-0">
            {/* "Iniciar sesión" solo visible en sm+ para no apretar el header en 320px */}
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">Registrarse</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24 gap-6">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Trophy aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
        </div>

        <div className="space-y-3 max-w-xl">
          <h1 className="font-extrabold tracking-tight" style={{ fontSize: "clamp(1.75rem, 6vw, 2.5rem)" }}>
            Quinielas de la{" "}
            <span className="text-primary">Liga Promerica</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Predice los marcadores de cada jornada, compite con tus amigos y
            sigue la tabla en tiempo real.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16 grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Target aria-hidden="true" className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Predice el marcador</h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tu predicción antes del pitazo inicial. Marcador exacto
              vale 3 pts, empate acertado 1 pt.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Users aria-hidden="true" className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Quinielas privadas</h2>
            <p className="text-sm text-muted-foreground">
              Crea tu grupo o únete con un código de 8 caracteres. Solo tus
              amigos ven tus predicciones.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Resultados en vivo</h2>
            <p className="text-sm text-muted-foreground">
              Los puntos se calculan automáticamente al terminar cada partido.
              El leaderboard se actualiza en tiempo real.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Clausura 2026 · Liga Promerica de Costa Rica
      </footer>
    </main>
  );
}
