import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SESSION_MAX_AGE = 86400; // 1 day in seconds

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, maxAge: SESSION_MAX_AGE })
            );
          } catch {
            // setAll desde un Server Component — ignorar,
            // el middleware se encarga de refrescar la sesión
          }
        },
      },
    }
  );
}
