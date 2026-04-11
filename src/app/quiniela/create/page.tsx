"use client";

import { useActionState } from "react";
import { createQuiniela } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateQuinielaPage() {
  const [state, action, isPending] = useActionState(createQuiniela, undefined);

  return (
    <main className="min-h-dvh bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver al dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Crear quiniela</CardTitle>
            <CardDescription>
              Se generará un código de invitación para compartir con tus amigos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                  Nombre del grupo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="ej. Los Cracks del Trabajo"
                  maxLength={50}
                  className="w-full rounded-md border border-input bg-background px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creando…" : "Crear quiniela"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
