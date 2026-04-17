"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { updateUsernameAction, updatePasswordAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, { error: "Mínimo 3 caracteres" })
    .max(20, { error: "Máximo 20 caracteres" })
    .regex(/^[a-zA-Z0-9_]+$/, { error: "Solo letras, números y guión bajo" }),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Ingresa tu contraseña actual" }),
    password: z
      .string()
      .min(8, { error: "Mínimo 8 caracteres" })
      .regex(/\d/, { error: "Debe contener al menos un número" }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type UsernameValues = z.infer<typeof usernameSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfileForm({ currentUsername }: { currentUsername: string }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const usernameForm = useForm<UsernameValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: currentUsername },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  const onUsernameSubmit = async (values: UsernameValues) => {
    setUsernameSuccess(false);
    const result = await updateUsernameAction(values.username);
    if (result?.error) {
      usernameForm.setError("root", { message: result.error });
    } else {
      setUsernameSuccess(true);
    }
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    setPasswordSuccess(false);
    const result = await updatePasswordAction(values.currentPassword, values.password);
    if (result?.error) {
      passwordForm.setError("root", { message: result.error });
    } else {
      setPasswordSuccess(true);
      passwordForm.reset();
    }
  };

  return (
    <div className="space-y-6">
      {/* Username */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nombre de usuario</CardTitle>
          <CardDescription>
            Visible para otros miembros de tus quinielas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={usernameForm.handleSubmit(onUsernameSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                placeholder="ej. mi_usuario"
                className={inputClass}
                {...usernameForm.register("username")}
              />
              {usernameForm.formState.errors.username && (
                <p role="alert" className="text-xs text-red-500">
                  {usernameForm.formState.errors.username.message}
                </p>
              )}
            </div>

            {usernameForm.formState.errors.root && (
              <p
                role="alert"
                aria-live="polite"
                className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {usernameForm.formState.errors.root.message}
              </p>
            )}

            {usernameSuccess && (
              <p
                aria-live="polite"
                className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2"
              >
                Nombre de usuario actualizado.
              </p>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={usernameForm.formState.isSubmitting}
            >
              {usernameForm.formState.isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contraseña</CardTitle>
          <CardDescription>
            Mínimo 8 caracteres y al menos un número.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="currentPassword" className="text-sm font-medium">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...passwordForm.register("currentPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p role="alert" className="text-xs text-red-500">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...passwordForm.register("password")}
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
              {passwordForm.formState.errors.password && (
                <p role="alert" className="text-xs text-red-500">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...passwordForm.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordForm.formState.errors.confirmPassword && (
                <p role="alert" className="text-xs text-red-500">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {passwordForm.formState.errors.root && (
              <p
                role="alert"
                aria-live="polite"
                className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {passwordForm.formState.errors.root.message}
              </p>
            )}

            {passwordSuccess && (
              <p
                aria-live="polite"
                className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2"
              >
                Contraseña actualizada correctamente.
              </p>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
