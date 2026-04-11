@AGENTS.md

# Quiniela Promerica

App web de quinielas para la **Liga Promerica de Costa Rica** entre amigos. Los usuarios se registran, crean una quiniela privada o se unen por código, predicen los marcadores de cada jornada antes de que empiece, y acumulan puntos automáticamente al terminar cada partido.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Server Components) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Auth + DB | Supabase (Auth, PostgreSQL, Realtime) |
| Datos de liga | API no oficial de ESPN (sin API key, gratis) |
| Deploy | Vercel + Vercel Cron Jobs |

---

## Fuente de datos de Liga Promerica

Se usa la **API interna de ESPN**, no API-Football (se descartó porque el plan gratuito no da acceso a la temporada actual).

```
GET https://site.api.espn.com/apis/v2/sports/soccer/crc.1/standings  → tabla de posiciones
GET https://site.api.espn.com/apis/v2/sports/soccer/crc.1/scoreboard  → partidos/fixtures
```

- `crc.1` = código ESPN de la Primera División de Costa Rica
- No requiere API key ni autenticación
- Datos en tiempo real del Clausura 2026
- Caché de 5 minutos con `next: { revalidate: 300 }`
- Cliente en `src/lib/api-football.ts` (exporta `getStandings()` y `getFixtures()`)

---

## Sistema de puntos

| Resultado | Puntos |
|-----------|--------|
| Marcador exacto (ej: predijo 2-1, fue 2-1) | 3 pts |
| Empate acertado (predijo cualquier empate, fue empate) | 1 pt |
| Incorrecto | 0 pts |

---

## Schema de base de datos (Supabase — AÚN NO CREADO)

```sql
profiles          -- extiende auth.users (id, username, avatar_url)
quinielas         -- id, name, created_by, invite_code (8 chars único), season
quiniela_members  -- quiniela_id, user_id, total_points
jornadas          -- id, number, season, lock_datetime, status (upcoming|active|completed)
matches           -- id, jornada_id, home_team, away_team, match_datetime, home_score, away_score, status, espn_id
predictions       -- id, user_id, quiniela_id, match_id, home_score_pred, away_score_pred, points_earned
```

---

## Estructura de archivos actual

```
src/
├── app/
│   ├── layout.tsx                  ✅ Layout base con metadata
│   └── page.tsx                    ✅ Home con tabla de posiciones (ESPN, Server Component)
├── components/
│   ├── standings-table.tsx         ✅ Tabla de posiciones con logos, forma, puntos
│   └── ui/                         ✅ shadcn: button, card, table, badge
└── lib/
    ├── api-football.ts             ✅ Cliente ESPN (getStandings, getFixtures)
    └── utils.ts                    ✅ cn() helper de shadcn
```

---

## Lo que falta por desarrollar

### 1. Supabase — Migración inicial
- Archivo: `supabase/migrations/001_initial.sql`
- Crear todas las tablas del schema
- RLS policies (perfiles públicos, quinielas solo para miembros, predicciones con lock guard en DB)
- Trigger: al insertar en `auth.users` → auto-crear fila en `profiles`

### 2. Supabase client setup
- `src/lib/supabase/client.ts` → `createBrowserClient` para componentes cliente
- `src/lib/supabase/server.ts` → `createServerClient` para Server Components y Actions
- `src/middleware.ts` → refresh de sesión en cada request

### 3. Auth (login + registro)
- Ruta: `src/app/(auth)/login/page.tsx` y `register/page.tsx`
- Email + password con Supabase Auth
- Redirect a `/dashboard` tras autenticarse

### 4. Dashboard (`/dashboard`)
- Lista de quinielas del usuario (via `quiniela_members`)
- Botones: "Crear quiniela" y "Unirse con código"
- Card por quiniela: nombre, posición del usuario, jornada activa

### 5. Quinielas
- `src/app/quiniela/create/page.tsx` → Server Action `createQuiniela()`
  - Inserta en `quinielas` + agrega al creador en `quiniela_members`
  - Genera `invite_code` de 8 chars (puede usarse `substr(md5(random()::text), 1, 8)` en SQL)
- `src/app/quiniela/join/page.tsx` → Server Action `joinQuiniela(code)`
  - Busca por `invite_code`, inserta en `quiniela_members`
- `src/app/quiniela/[id]/page.tsx`
  - Leaderboard de la quiniela (tabla de miembros + puntos)
  - Jornada actual con partidos
  - Supabase Realtime para actualización automática de puntos

### 6. Predicciones
- `src/app/quiniela/[id]/predict/[jornada_id]/page.tsx`
- Formulario con todos los partidos de la jornada (marcador local y visitante por partido)
- **Guard de lock:** si `now() >= jornada.lock_datetime` → solo lectura, no se puede editar
- Server Action `upsertPrediction()` → verifica lock antes de insertar/actualizar
- La validación del lock también debe estar en RLS a nivel de DB

### 7. Admin + Sync de jornadas
- `src/app/admin/sync/page.tsx` → panel protegido solo para admins
- Leer fixtures de ESPN (`getFixtures()`) y poblar `jornadas` + `matches` en Supabase
- Botón "Sincronizar jornada actual"

### 8. Cron — Sync de resultados y cálculo de puntos
- `src/app/api/cron/sync-results/route.ts`
  - Fetch fixtures terminados de ESPN
  - Actualiza `matches.home_score` / `away_score` / `status = 'finished'`
  - Llama a `calculatePoints()` para cada predicción del partido
  - Recalcula `quiniela_members.total_points` con SUM
- `src/app/api/cron/sync-fixtures/route.ts` (opcional, puede hacerse manual desde admin)
- `vercel.json` → Cron cada hora para sync-results

### 9. Scoring (`src/lib/scoring.ts`)
```typescript
function calcPoints(pred: {home: number, away: number}, actual: {home: number, away: number}): number {
  if (pred.home === actual.home && pred.away === actual.away) return 3; // marcador exacto
  if (pred.home === pred.away && actual.home === actual.away) return 1; // empate acertado
  return 0;
}
```

### 10. Leaderboard con Realtime
- Componente cliente con `useEffect` + Supabase `channel().on('postgres_changes', ...)`
- Escucha cambios en `quiniela_members` filtrado por `quiniela_id`
- Actualiza tabla de posiciones sin reload

---

## Variables de entorno necesarias

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# ESPN no requiere ninguna key
```

---

## Rutas de la app

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/` | ✅ Hecho | Tabla de posiciones Liga Promerica (ESPN) |
| `/login` | Pendiente | Login email/password |
| `/register` | Pendiente | Registro de usuario |
| `/dashboard` | Pendiente | Mis quinielas |
| `/quiniela/create` | Pendiente | Crear nueva quiniela |
| `/quiniela/join` | Pendiente | Unirse por código |
| `/quiniela/[id]` | Pendiente | Leaderboard + jornada actual |
| `/quiniela/[id]/predict/[jornada_id]` | Pendiente | Formulario de predicciones |
| `/admin/sync` | Pendiente | Sync manual de jornadas/resultados |
| `/api/cron/sync-results` | Pendiente | Vercel Cron — calcular puntos |

---

## Decisiones técnicas tomadas

- **ESPN en vez de API-Football:** API-Football gratuito no da acceso a la temporada 2025/2026. ESPN no requiere key y tiene datos en tiempo real.
- **Sin backend separado:** Solo Next.js + Supabase. Server Actions reemplazan los endpoints de NestJS.
- **Lock de predicciones en dos capas:** Validación en Server Action + RLS policy en Supabase para mayor seguridad.
- **Realtime con Supabase:** Para leaderboard en vivo en lugar de polling.
