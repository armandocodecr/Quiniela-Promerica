"use client";

import { useState, useTransition } from "react";
import { leaveQuiniela } from "@/app/quiniela/actions";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  quinielaId: string;
  quinielaName: string;
}

export function LeaveQuinielaButton({ quinielaId, quinielaName }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await leaveQuiniela(quinielaId);
      if (result?.error) {
        setError(result.error);
        setOpen(false);
      }
    });
  };

  return (
    <>
      <div className="relative group">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground p-2 hover:text-destructive hover:bg-destructive/10"
          onClick={() => setOpen(true)}
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </Button>
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 group-hover:opacity-100 transition-opacity">
          Salir de la quiniela
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isPending && setOpen(false)}
          />

          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <LogOut aria-hidden="true" className="h-5 w-5 text-destructive" />
              </span>
              <div>
                <h2 id="leave-dialog-title" className="text-sm font-semibold leading-none">
                  Salir de la quiniela
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  ¿Seguro que quieres salir de{" "}
                  <span className="font-semibold text-foreground">{quinielaName}</span>?
                  Perderás tu historial de predicciones y puntos en esta quiniela.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleConfirm}
              >
                {isPending ? "Saliendo…" : "Sí, salir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
