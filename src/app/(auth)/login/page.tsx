"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.email({ error: "Ingresa un email válido" }),
  password: z.string().min(6, { error: "Mínimo 6 caracteres" }),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    const result = await loginAction(values);
    if (result?.error) {
      setError("root", { message: result.error });
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede a tus quinielas</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputClass}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
