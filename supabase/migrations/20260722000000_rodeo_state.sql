-- ═══════════════════════════════════════════════════════════════════════
-- RODEO — estado sincronizado entre dispositivos
-- ---------------------------------------------------------------------
-- Una fila por usuario (login con Google via Supabase Auth). El cliente
-- hace merge local↔nube ANTES de escribir, así que aquí solo guardamos el
-- resultado ya fusionado. Shapes idénticos a los de localStorage:
--   dna       → rodeo_dna        [{type:'error'|'slang'|'upgrade', ..., ts}]
--   intereses → rodeo_intereses  ["Cripto/Web3", ...]
--   progress  → { cost, sessions, stories, ladderXP, streak, seenSlang, seenLadder }
--
-- Se aplica sola al mergear a main (integración GitHub de Supabase) o
-- pegándola en el SQL Editor del dashboard (ver SUPABASE-runbook.md).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.rodeo_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  dna        jsonb not null default '[]'::jsonb,
  intereses  jsonb not null default '[]'::jsonb,
  progress   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS: cada usuario ve y toca SOLO su propia fila. (El proyecto tiene
-- "automatic RLS" activado, pero lo declaramos explícito por si acaso.)
alter table public.rodeo_state enable row level security;

drop policy if exists "rodeo_state_select_own" on public.rodeo_state;
create policy "rodeo_state_select_own" on public.rodeo_state
  for select using ((select auth.uid()) = user_id);

drop policy if exists "rodeo_state_insert_own" on public.rodeo_state;
create policy "rodeo_state_insert_own" on public.rodeo_state
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "rodeo_state_update_own" on public.rodeo_state;
create policy "rodeo_state_update_own" on public.rodeo_state
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sin policy de DELETE a propósito: la app nunca borra la fila; si el
-- usuario borra su cuenta, el ON DELETE CASCADE la limpia.
