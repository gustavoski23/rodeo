import { useEffect } from 'react';
import { motion } from 'motion/react';

import { Transcripto } from '@/components/rodeo/transcripto';
import type { A1Chunk } from '@/content/a1/tipos';
import { useTts } from '@/lib/speech';
import { useA1 } from '@/stores/a1';
import { toast } from '@/stores/toast';
import { Sheet } from '@/views/talk/sheet';

import { Eyebrow } from './alfred';
import { BotonAudio, BotonEstrella, FraseCard, Molde } from './frase-card';

/* HOJAS — port de openA1Panic (§5.7), openA1Saved y openA1ChunkDetail (§5.6)
   de public/js/a1-office.js:508-544 y 1472-1559.

   Reusan la hoja modal de TALK (foco atrapado, Escape, clic en el backdrop):
   es la misma app, no hay motivo para tener dos modales distintos.

   El 🆘 es la pieza más importante del módulo y por eso está SIEMPRE, incluso
   sin haber llegado a la unidad 2: alguien que se traba en una reunión real
   necesita las cinco frases hoy, no cuando le toquen en el currículo. */

function TituloHoja({ id, eyebrow, titulo, sub }: { id: string; eyebrow: string; titulo: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2.5 pb-5">
      <Eyebrow acento>{eyebrow}</Eyebrow>
      <p id={id} className="font-display text-[clamp(1.7rem,8vw,2.3rem)] leading-[0.95] font-extrabold tracking-[-0.035em]">
        {titulo}
        <span style={{ color: 'var(--accent)' }}>.</span>
      </p>
      <p className="text-[0.9rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
        {sub}
      </p>
    </div>
  );
}

function BotonListo({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="mt-5 inline-flex min-h-13 w-full cursor-pointer items-center justify-center rounded-full text-[0.95rem] font-bold"
      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
    >
      Listo
    </motion.button>
  );
}

/** 🆘 Las cinco de supervivencia. Frasebook de consulta: acá sí conviven varias
    frases en inglés en pantalla, porque no se está aprendiendo — se está
    saliendo de un apuro. */
export function HojaPanico({ abierta, onClose }: { abierta: boolean; onClose: () => void }) {
  const supervivencia = useA1((s) => s.indice.supervivencia);
  const { ttsOn } = useTts();

  return (
    <Sheet abierta={abierta} onClose={onClose} labelledBy="a1-panico-titulo">
      <TituloHoja
        id="a1-panico-titulo"
        eyebrow="🆘 Tus salvavidas"
        titulo="SI TE TRABAS"
        sub="Estas cinco te sacan de cualquier lío en la vida real. Nadie se enoja si las dices."
      />

      <div className="flex flex-col gap-2.5">
        {supervivencia.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-[20px] border px-4 py-3.5"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)' }}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-display text-[1.08rem] leading-[1.2] font-bold tracking-[-0.02em] break-words">
                {c.en}
              </span>
              <span className="text-[0.85rem]" style={{ color: 'var(--text-secondary)' }}>
                {c.es}
              </span>
              <span className="font-mono text-[0.68rem]" style={{ color: 'var(--text-muted)' }}>
                suena: {c.sounds_es}
              </span>
            </div>
            <BotonAudio en={c.en} tamano={40} tono="claro" />
          </div>
        ))}
      </div>

      {!ttsOn && (
        <p className="mt-3 text-[0.82rem] leading-[1.45]" style={{ color: 'var(--text-muted)' }}>
          Tu celu acá no las dice en voz alta, pero léelas como están en "suena:". Igual funciona, tranquilo.
        </p>
      )}

      <BotonListo onClick={onClose} />
    </Sheet>
  );
}

/** ★ Mis frases (rodeo_a1_saved). Mini-DNA propio del módulo: nunca toca el
    DNA de Gus ni su lista de sync. */
export function HojaGuardadas({
  abierta,
  onClose,
  onDetalle,
}: {
  abierta: boolean;
  onClose: () => void;
  onDetalle: (id: string) => void;
}) {
  const guardadas = useA1((s) => s.guardadas);

  return (
    <Sheet abierta={abierta} onClose={onClose} labelledBy="a1-guardadas-titulo">
      <TituloHoja
        id="a1-guardadas-titulo"
        eyebrow="★ Mis frases"
        titulo="LAS TUYAS"
        sub="Las que marcaste pa' tenerlas a la mano. Toca una pa' verla completa."
      />

      {guardadas.length === 0 ? (
        <p className="text-[0.9rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Todavía no guardaste ninguna. Toca la ★ en las frases que te gusten y acá te quedan a la mano.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {/* La última guardada arriba: es la que se está buscando. */}
          {guardadas
            .slice()
            .reverse()
            .map((it) => (
              <motion.button
                key={it.id}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => onDetalle(it.id)}
                className="flex w-full cursor-pointer flex-col gap-1 rounded-[20px] border px-4 py-3.5 text-left"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)' }}
              >
                <span className="font-display text-[1.02rem] leading-[1.2] font-bold tracking-[-0.02em] break-words">
                  {it.en}
                </span>
                {it.es && (
                  <span className="text-[0.83rem]" style={{ color: 'var(--text-secondary)' }}>
                    {it.es}
                  </span>
                )}
              </motion.button>
            ))}
        </div>
      )}

      <BotonListo onClick={onClose} />
    </Sheet>
  );
}

function Seccion({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="font-mono text-[0.58rem] font-bold tracking-[0.16em] uppercase"
        style={{ color: 'var(--text-muted)' }}
      >
        {titulo}
      </span>
      <p className="text-[0.92rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
        {texto}
      </p>
    </div>
  );
}

/** Detalle de una frase: todo lo que el loop enseñó, junto y consultable. */
export function HojaDetalle({ id, onClose }: { id: string | null; onClose: () => void }) {
  const indice = useA1((s) => s.indice);
  const guardadas = useA1((s) => s.guardadas);

  let chunk: A1Chunk | null = id ? (indice.chunk[id] ?? null) : null;
  if (!chunk && id) {
    // Respaldo: si el contenido ya no la tiene, se pinta lo que quedó guardado.
    const sv = guardadas.find((x) => x && x.id === id);
    if (sv) {
      chunk = {
        id: sv.id,
        en: sv.en,
        es: sv.es,
        sounds_es: '',
        why_es: sv.why,
        sayWhen_es: '',
        who_es: '',
        frame: null,
        swaps: null,
        distractors_es: [],
        cognateHook_es: null,
        forms: null,
        audio: null,
        survival: false,
      };
    }
  }

  /* Ni en el contenido ni en lo guardado: la frase se fue de verdad (contenido
     que cambió entre versiones). Se avisa y se cierra, no se deja una hoja
     vacía abierta. */
  useEffect(() => {
    if (id && !chunk) {
      toast('Esa frase ya no está.');
      onClose();
    }
  }, [id, chunk, onClose]);

  return (
    <Sheet abierta={!!id && !!chunk} onClose={onClose}>
      {chunk && (
        <div className="flex flex-col gap-4">
          <FraseCard chunk={chunk} completa etiqueta="La frase" />
          {/* Karaoke de la frase: el TranscriptViewer resalta palabra por
              palabra mientras suena el audio de Aura-2. */}
          <Transcripto texto={chunk.en} className="rounded-2xl border border-[var(--superficie-t)] bg-[var(--bg-surface)] p-3.5" />
          <Seccion titulo="Por qué" texto={chunk.why_es} />
          <Molde chunk={chunk} />
          <Seccion titulo="¿A quién?" texto={chunk.who_es} />
          <Seccion titulo="¿Cuándo?" texto={chunk.sayWhen_es} />
          <div className="flex items-center gap-2.5">
            <BotonEstrella chunk={chunk} tamano={48} tono="claro" />
            <BotonAudio en={chunk.en} tamano={48} tono="claro" />
            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-full border text-[0.9rem] font-semibold"
              style={{ borderColor: 'var(--borde-medio)', color: 'var(--text-primary)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
