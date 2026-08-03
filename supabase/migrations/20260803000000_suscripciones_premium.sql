-- ═══════════════════════════════════════════════════════════════════════
-- RODEO — suscripciones Premium pagadas en cripto, atadas a la cuenta
-- ---------------------------------------------------------------------
-- Una fila por PAGO confirmado on-chain, atada al usuario que lo hizo
-- (login con Google / enlace mágico via Supabase Auth). Es la FUENTE DE
-- VERDAD del Premium: el localStorage del navegador es solo un espejo.
--
-- Por qué existe (el problema que resuelve): el receptor de cobros (Pangea)
-- es SIN CUENTAS a propósito — sabe que ALGUIEN pagó tal monto, no QUIÉN.
-- Así que atar el pago a un correo se hace aquí, del lado de RODEO: el
-- servidor re-confirma el pago contra la cadena y escribe esta fila para el
-- usuario autenticado que lo reclama.
--
-- IDEMPOTENCIA: `tx_id` es la PRIMARY KEY. Una transacción de cadena acredita
-- A LO SUMO UNA fila: si el mismo pago se reclama dos veces (el navegador
-- sondea cada pocos segundos) o desde otra cuenta, el segundo INSERT choca
-- con la PK y se ignora — gana quien la reclamó primero.
--
-- Se aplica sola al mergear a main (integración GitHub de Supabase) o
-- pegándola en el SQL Editor del dashboard (ver SUPABASE-runbook.md).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.suscripciones_premium (
  -- Hash de la transacción on-chain. PK = un pago acredita una sola vez.
  tx_id             text primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  -- Correo con el que el usuario está logueado, para saludar y para el recibo.
  email             text,
  chain             text not null check (chain in ('solana', 'stellar')),
  plan              text not null,
  -- Micro-USDC como TEXTO (regla bigint→string del proyecto): nunca un float.
  amount_base_units text not null,
  -- Referencia/memo del cobro, para trazar contra el receptor si hace falta.
  reference         text,
  paid_at           timestamptz,
  -- Vencimiento = paid_at + período del plan (mensual 30d, anual 365d). NULL
  -- para la prueba, que no tiene período fijo.
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

-- El Premium de un usuario se consulta por user_id (login en otro aparato).
create index if not exists suscripciones_premium_user_idx
  on public.suscripciones_premium (user_id);

-- RLS: cada usuario LEE solo sus propias suscripciones. NO hay policy de
-- insert/update/delete a propósito — solo la service_role key (el servidor,
-- que ya re-verificó el pago contra la cadena) escribe. Un cliente con la key
-- pública jamás puede acreditarse Premium solo.
alter table public.suscripciones_premium enable row level security;

drop policy if exists "suscripciones_premium_select_own" on public.suscripciones_premium;
create policy "suscripciones_premium_select_own" on public.suscripciones_premium
  for select using ((select auth.uid()) = user_id);
