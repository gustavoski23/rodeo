import { useState, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { DnaItem } from '@/lib/dna';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useAuth } from '@/stores/auth';
import { useLadder } from '@/stores/ladder';

/* PERFIL v1 (pedido de Gus, 2026-08-04, captura 5): fuera el "Pronto." — la
   pantalla enseña la CUENTA (el correo con el que iniciaste sesión y el nombre
   del onboarding) y una pestañita interna TU DNA con los últimos 20 ítems
   aprendidos (fallos corregidos, slang/phrasal verbs guardados, upgrades),
   para repasarlos sin salir del perfil. Es la versión primaria a propósito:
   20 y nada más, para testear cómo se ve y qué tan viable es.

   El dato NO se duplica: el DNA vivo viene de useLadder (copia suscrita a
   lib/dna, la misma que pinta la vista DNA) y "Repasar" lleva a esa vista
   completa, donde está el quiz. Mismo patrón canónico de pantalla interior
   que DNA/STORY: barra ← + título mono + Card como único scroller. */

const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** La versión primaria enseña los últimos 20, nada más (decisión de Gus). */
const ULTIMOS = 20;

type Pestana = 'cuenta' | 'dna';
const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'cuenta', label: 'Cuenta' },
  { id: 'dna', label: 'Tu DNA' },
];

export default function PerfilView() {
  const setView = useApp((s) => s.setView);
  const [pestana, setPestana] = useState<Pestana>('cuenta');

  /* Mismo patrón de tabs accesibles que TALK/SLANG: ←/→ mueven, solo la
     activa entra en el orden de Tab. */
  function porTeclado(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = PESTANAS.findIndex((p) => p.id === pestana);
    const destino = PESTANAS[(idx + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % PESTANAS.length]!;
    setPestana(destino.id);
    document.getElementById(`rd-perfil-tab-${destino.id}`)?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{
            borderColor: 'var(--borde-sutil)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Perfil
        </span>
      </div>

      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3.5 py-4 sm:px-5', SIN_BARRA)}>
          {/* ── La pestañita ─────────────────────────────────────────────── */}
          <div
            role="tablist"
            aria-label="Secciones del perfil"
            onKeyDown={porTeclado}
            className="flex shrink-0 items-center gap-1.5"
          >
            {PESTANAS.map(({ id, label }) => {
              const activa = pestana === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`rd-perfil-tab-${id}`}
                  aria-selected={activa}
                  aria-controls={activa ? 'rd-perfil-panel' : undefined}
                  tabIndex={activa ? 0 : -1}
                  onClick={() => setPestana(id)}
                  className="cursor-pointer rounded-full border px-3.5 py-1.5 font-mono text-[0.62rem] font-bold tracking-[0.14em] uppercase"
                  style={
                    activa
                      ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-ink)' }
                      : { background: 'var(--chip-bg)', borderColor: 'var(--borde-sutil)', color: 'var(--text-secondary)' }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div id="rd-perfil-panel" role="tabpanel" className="flex min-h-0 flex-col gap-4">
            {pestana === 'cuenta' ? <PanelCuenta /> : <PanelDna />}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── CUENTA: con qué correo entraste y cómo te llamas ────────────────────── */

function PanelCuenta() {
  const usuario = useAuth((s) => s.usuario);
  const mostrarGate = useAuth((s) => s.mostrarGate);
  const nombre = useApp((s) => s.nombre);
  const nivel = useApp((s) => s.nivel);

  /* El nombre manda el del onboarding (rodeo_nombre); si no lo dio, el de la
     cuenta de Google. El correo es el de la sesión de Supabase — sin sesión
     (entró con Skip) se dice claro y se ofrece la puerta. */
  const nombreCuenta =
    (nombre || '').trim() ||
    String((usuario?.user_metadata as { full_name?: string } | undefined)?.full_name || '').trim();
  const inicial = (nombreCuenta || usuario?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <>
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="font-display flex size-14 shrink-0 items-center justify-center rounded-full text-[1.35rem] font-extrabold"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          {inicial}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[1.05rem] font-bold" style={{ color: 'var(--text-primary)' }}>
            {nombreCuenta || 'Sin nombre todavía'}
          </div>
          {nivel && (
            <div className="mt-0.5 font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Nivel {nivel}
            </div>
          )}
        </div>
      </div>

      <div
        className="flex flex-col gap-1 rounded-2xl border px-4 py-3"
        style={{ background: 'var(--chip-bg)', borderColor: 'var(--borde-sutil)' }}
      >
        <span className="font-mono text-[0.56rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
          Correo de la sesión
        </span>
        {usuario?.email ? (
          <span className="text-[0.92rem] break-all" style={{ color: 'var(--text-primary)' }}>
            {usuario.email}
          </span>
        ) : (
          <>
            <span className="text-[0.92rem]" style={{ color: 'var(--text-secondary)' }}>
              No has iniciado sesión.
            </span>
            <button
              type="button"
              onClick={mostrarGate}
              className="mt-1.5 inline-flex w-fit cursor-pointer items-center rounded-full border-0 px-3.5 py-2 text-[0.78rem] font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              Iniciar sesión
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ── TU DNA: los últimos 20, para repasar ────────────────────────────────── */

const TIPO: Record<DnaItem['type'], { label: string; color: string }> = {
  error: { label: 'Fallo', color: 'var(--texto-mal)' },
  slang: { label: 'Slang', color: 'var(--accent)' },
  upgrade: { label: 'Upgrade', color: 'var(--warn)' },
};

function PanelDna() {
  const dna = useLadder((s) => s.dna);
  const setView = useApp((s) => s.setView);
  const ultimos = dna.slice(0, ULTIMOS);

  return (
    <>
      <p className="shrink-0 text-[0.85rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
        Lo último que has aprendido — fallos corregidos, slang y phrasal verbs que guardaste, y tus upgrades.
        {dna.length > 0 && (
          <span style={{ color: 'var(--text-muted)' }}>
            {' '}
            ({Math.min(dna.length, ULTIMOS)} de {dna.length})
          </span>
        )}
      </p>

      {!ultimos.length ? (
        <p className="text-[0.88rem]" style={{ color: 'var(--text-muted)' }}>
          Todavía no hay nada aquí. Habla con tu coach y toca «＋ guardar» en las palabras subrayadas — van cayendo
          solas.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {ultimos.map((d, i) => (
            <FilaDna key={`${d.ts}-${i}`} d={d} />
          ))}
        </div>
      )}

      {/* El repaso de verdad (quiz incluido) vive en la vista DNA completa. */}
      <button
        type="button"
        onClick={() => setView('dna')}
        className="mt-1 flex shrink-0 cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left"
        style={{ background: 'var(--chip-bg)', borderColor: 'var(--borde-sutil)' }}
      >
        <span className="text-[0.85rem] font-bold" style={{ color: 'var(--text-primary)' }}>
          Repasar en TU DNA
          <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>
            quiz y lista completa
          </span>
        </span>
        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
      </button>
    </>
  );
}

function FilaDna({ d }: { d: DnaItem }) {
  const tipo = TIPO[d.type];
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--superficie-t)' }}
    >
      <span
        className="mb-1 block font-mono text-[0.54rem] font-bold tracking-[0.14em] uppercase"
        style={{ color: tipo.color }}
      >
        {tipo.label}
      </span>
      {d.type === 'error' ? (
        <>
          <div className="text-[0.88rem]">
            {d.quote && (
              <>
                <span className="line-through" style={{ color: 'var(--texto-mal)' }}>
                  {d.quote}
                </span>{' '}
                →{' '}
              </>
            )}
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              {d.fix}
            </span>
          </div>
          {d.why && (
            <div className="mt-[3px] text-[0.78rem]" style={{ color: 'var(--text-secondary)' }}>
              {d.why}
            </div>
          )}
        </>
      ) : d.type === 'upgrade' ? (
        <>
          <div className="text-[0.88rem]">
            {d.b2 && (
              <>
                <span className="line-through" style={{ color: 'var(--text-muted)' }}>
                  {d.b2}
                </span>{' '}
                →{' '}
              </>
            )}
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              {d.fix}
            </span>
          </div>
          {(d.dominado || d.why) && (
            <div className="mt-[3px] text-[0.78rem]" style={{ color: 'var(--text-secondary)' }}>
              {d.dominado && (
                <>
                  <span className="font-bold" style={{ color: 'var(--warn)' }}>
                    clavado ✓
                  </span>
                  {d.why ? ' · ' : ''}
                </>
              )}
              {d.why || ''}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-[0.92rem] font-bold" style={{ color: 'var(--text-primary)' }}>
            {d.term}
            {d.meaning && (
              <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
                {' '}
                — {d.meaning}
              </span>
            )}
          </div>
          {d.example && (
            <div className="mt-[3px] text-[0.78rem] italic" style={{ color: 'var(--text-secondary)' }}>
              "{d.example}"
            </div>
          )}
        </>
      )}
    </div>
  );
}
