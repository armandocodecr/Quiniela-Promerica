"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { registerAction } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const schema = z.object({
  username: z
    .string()
    .min(3, { error: "Mínimo 3 caracteres" })
    .max(20, { error: "Máximo 20 caracteres" })
    .regex(/^[a-zA-Z0-9_]+$/, { error: "Solo letras, números y guión bajo" }),
  email: z.email({ error: "Ingresa un email válido" }),
  password: z
    .string()
    .min(8, { error: "Mínimo 8 caracteres" })
    .regex(/[0-9]/, { error: "Debe incluir al menos un número" }),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const result = await registerAction(values);
    if (result?.error) {
      setError("root", { message: result.error });
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Únete y empieza a competir</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Nombre de usuario
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              spellCheck={false}
              placeholder="ej. golazo_tico"
              className={inputClass}
              {...register("username")}
            />
            {errors.username && (
              <p role="alert" className="text-xs text-red-500">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="ej. tu@email.com"
              className={inputClass}
              {...register("email")}
            />
            {errors.email && (
              <p role="alert" className="text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass}
              {...register("password")}
            />
            {errors.password && (
              <p role="alert" className="text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p
              role="alert"
              aria-live="polite"
              className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {errors.root.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
