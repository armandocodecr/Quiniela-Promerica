"use client";

import { useActionState } from "react";
import { joinQuiniela } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JoinQuinielaPage() {
  const [state, action, isPending] = useActionState(joinQuiniela, undefined);

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
            <CardTitle>Unirse a una quiniela</CardTitle>
            <CardDescription>
              Ingresa el código de 8 caracteres que te compartieron.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="code" className="text-sm font-medium">
                  Código de invitación
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="ej. a3f9b2c1"
                  maxLength={8}
                  autoComplete="off"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Buscando…" : "Unirse"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
