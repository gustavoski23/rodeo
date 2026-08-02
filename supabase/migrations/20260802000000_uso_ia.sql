-- ═══════════════════════════════════════════════════════════════════════
-- RODEO — registro de consumo de IA y voz (para el panel /uso)
-- ---------------------------------------------------------------------
-- Una fila por LLAMADA a un proveedor de pago. Lo escriben SOLO las
-- funciones serverless (api/chat.js, api/tts.js, api/stt.js) usando la
-- service_role key, que vive en Vercel y nunca toca el navegador.
--
-- Por qué existe: hasta ahora el costo volvía al cliente y se acumulaba en
-- su localStorage, así que no había forma de ver cuánto consume el conjunto
-- de testers. Esta tabla es esa fuente de verdad.
--
--   servicio   'opencode' | 'deepgram_tts' | 'deepgram_stt'
--   modelo     claude-haiku-4-5 | kimi-k2.7-code | aura-2-helena-en | nova-3
--   modo       'chat' | 'creative' (solo opencode)
--   usuario    etiqueta del tester (cabecera x-rodeo-user); 'anónimo' si no manda
--   unidades   caracteres (TTS) o segundos de audio (STT)
--   costo_usd  el que devuelve OpenCode; en Deepgram es ESTIMADO por tarifa
--
-- Se aplica sola al mergear a main (integración GitHub de Supabase) o
-- pegándola en el SQL Editor del dashboard (ver SUPABASE-runbook.md).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.uso_ia (
  id         bigint generated always as identity primary key,
  ts         timestamptz not null default now(),
  servicio   text not null,
  modelo     text,
  modo       text,
  usuario    text not null default 'anónimo',
  tokens_in  integer not null default 0,
  tokens_out integer not null default 0,
  unidades   numeric  not null default 0,
  costo_usd  numeric  not null default 0,
  ok         boolean  not null default true,
  ms         integer  not null default 0
);

-- El panel consulta "lo último" y agrega por usuario: ambos caminos por ts.
create index if not exists uso_ia_ts_idx on public.uso_ia (ts desc);
create index if not exists uso_ia_usuario_idx on public.uso_ia (usuario, ts desc);

-- RLS ENCENDIDA Y SIN POLICIES: esto es deliberado, no un olvido.
-- Nadie con la anon/publishable key puede leer ni escribir esta tabla; la
-- service_role key la salta por diseño, y es la única que usan las funciones
-- serverless. Así el gasto no queda expuesto a quien abra la app.
alter table public.uso_ia enable row level security;
