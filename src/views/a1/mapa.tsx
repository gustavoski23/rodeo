import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, LifeBuoy, Lock, Star } from 'lucide-react';

import { BorderBeam } from '@/components/magicui/border-beam';
import { Card } from '@/components/ui/card';
import type { A1Unit, JobPack } from '@/content/a1/tipos';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import {
  dominioUnidad,
  estaDesbloqueada,
  metricas,
  nuevos,
  puntoDeRetomar,
  totalChunks,
  unidadDominada,
  useA1,
  vencidos,
  TOPE_VENCIDOS,
} from '@/stores/a1';

import { AlfredBloque, Barra, Eyebrow } from './alfred';

/* MAPA DE UNIDADES — port de homeHTML/unitCardHTML/greetingHTML/metricHTML/
   ctaHTML/hookHTML (public/js/a1-office.js:255-460).

   El orden de la pantalla es una decisión, no una lista: primero lo que YA
   lográs (la métrica honesta), después Alfred diciéndote qué toca hoy, después
   UNA acción clara (repasar o seguir donde ibas) y solo al final el catálogo
   completo. Un principiante frente a siete unidades no elige: se paraliza.

   Métrica honesta = "ya te salen solas" (caja>=4). Cero XP, cero racha en
   rojo, cero "perdiste". Lo único que se cuenta es capacidad real.

   El saludo de acá es el del legacy (greetingHTML): habla del DÍA, no de la
   unidad. La presentación de cada situación —companionSetup_es— es de Alfred
   también, pero va donde tiene sentido: en la portada que se abre al tocar una
   unidad sin estrenar (./portada.tsx). Mezclarlas en el mapa haría que Alfred
   presente siete situaciones a la vez a alguien que todavía no eligió ninguna.

   SHELL AL PATRÓN CANÓNICO (el de src/views/slang/index.tsx y el de la sesión
   de charla): barra de sección con el ← redondo + título mono en --accent, y
   TODO el contenido dentro de una <Card> de 640 px que hace de scroller sin
   pintar barra. Se fue el héroe "TU PRIMERA SEMANA." con su blur aurora: el
   título de la vista ahora vive en la barra mono, como en el resto de la app.
   El orden y el contenido de adentro no cambian, ni la firma de <Mapa/>
   (a1/index.tsx lo monta igual). Los ← internos de portada/sesión/tarea siguen
   siendo suyos: llevan al mapa, no a la casa. */

/* Las mismas dos constantes que SLANG y CHARLA, redeclaradas acá a propósito
   (convención del repo): la vista es una COLUMNA, y el scroll funciona sin
   pintar barra. */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/** cardTheme del contenido → token de card. Nunca coral: en RODEO ese color
    significa error, y una situación de la oficina no es un castigo. */
const TEMA: Record<string, string> = {
  blue: 'var(--card-blue)',
  lavender: 'var(--card-lavender)',
  green: 'var(--card-green)',
  yellow: 'var(--card-yellow)',
  peach: 'var(--card-peach)',
  paper: 'var(--card-paper)',
};
export function tokenTema(nombre: string): string {
  return TEMA[nombre] ?? 'var(--card-paper)';
}

/* Ganchos del mapa: preguntas cortas que enrutan a la situación real. Es el
   equivalente A1 del rompehielos de TALK — pero sin API y en español, porque
   quien está en A1 no entra por una frase en inglés, entra por un miedo. */
const GANCHOS: { unit: string; q: string }[] = [
  { unit: 'u1-llegar', q: '¿Saludar sin quedar mudo?' },
  { unit: 'u2-supervivencia', q: '¿Y si no entendés nada?' },
  { unit: 'u5-ayuda', q: '¿Pedir un descanso o la hora?' },
  { unit: 'u3-presentarte', q: '¿Presentarte al equipo?' },
  { unit: 'u4-smalltalk', q: '¿Caer bien en el cafecito?' },
  { unit: 'u6-reunion', q: '¿Sobrevivir la reunión?' },
  { unit: 'u7-tareas', q: '¿Cerrar bien una tarea?' },
];

function UnidadCard({ u, onAbrir }: { u: A1Unit; onAbrir: (id: string) => void }) {
  const abierta = estaDesbloqueada(u.id);
  const m = dominioUnidad(u);
  const dominada = abierta && unidadDominada(m);
  const tema = tokenTema(u.cardTheme);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={() => onAbrir(u.id)}
      className="relative flex w-full cursor-pointer items-center gap-3.5 overflow-hidden rounded-[24px] border px-4 py-4 text-left"
      style={{
        borderColor: 'var(--borde-sutil)',
        background: abierta
          ? `linear-gradient(105deg, color-mix(in oklch, ${tema} 13%, transparent), transparent 46%), var(--bg-surface)`
          : 'var(--bg-surface)',
        opacity: abierta ? 1 : 0.58,
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-[16px] text-[1.35rem]"
        style={{ background: abierta ? tema : 'var(--chip-bg-fuerte)' }}
      >
        {u.icon || u.emoji}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-[1.02rem] leading-[1.2] font-bold tracking-[-0.02em]">{u.title_es}</span>
        <span className="text-[0.82rem] leading-[1.35]" style={{ color: 'var(--text-secondary)' }}>
          {u.subtitle_es}
        </span>

        {u.survival && (
          <span
            className="mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.56rem] font-bold tracking-[0.12em] uppercase"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <LifeBuoy className="size-3" strokeWidth={2.4} aria-hidden="true" />
            supervivencia
          </span>
        )}

        {/* Progreso honesto: solo cuando ya tocó algo y todavía no la domina. */}
        {abierta && m.total > 0 && m.tocados > 0 && !dominada && (
          <span className="mt-1.5 flex flex-col gap-1">
            <Barra pct={Math.round((m.box3 / m.total) * 100)} />
            <span className="font-mono text-[0.6rem] tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
              {m.box3}/{m.total} ya tuyas
            </span>
          </span>
        )}
      </span>

      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: dominada ? 'var(--accent-dim)' : 'transparent',
          color: dominada ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        {!abierta ? (
          <Lock className="size-4" strokeWidth={2} />
        ) : dominada ? (
          <Check className="size-4" strokeWidth={3} />
        ) : (
          <ArrowRight className="size-4" strokeWidth={2.2} />
        )}
      </span>
    </motion.button>
  );
}

function CtaGrande({
  eyebrow,
  principal,
  accion,
  onClick,
  conHaz,
}: {
  eyebrow: string;
  principal: string;
  accion: string;
  onClick: () => void;
  /** El haz de luz solo va en la acción del día: dos haces no destacan nada. */
  conHaz?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-[24px] border px-5 py-4 text-left"
      style={{ borderColor: 'var(--borde-medio)', background: 'var(--bg-elevated)' }}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className="font-mono text-[0.58rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          {eyebrow}
        </span>
        <span className="text-[0.98rem] leading-[1.3] font-semibold">{principal}</span>
      </span>
      <span className="shrink-0 text-[0.85rem] font-bold" style={{ color: 'var(--accent)' }}>
        {accion}
      </span>
      {conHaz && (
        <BorderBeam
          size={90}
          duration={7}
          borderWidth={1.4}
          colorFrom="var(--aurora-1)"
          colorTo="var(--aurora-2)"
        />
      )}
    </motion.button>
  );
}

export function Mapa({
  pack,
  onUnidad,
  onRepaso,
  onSeguir,
  onGuardadas,
  onPanico,
}: {
  /** Pack de trabajo activo (A1.2). Sus unidades van DESPUÉS del tronco. */
  pack: JobPack | null;
  onUnidad: (id: string) => void;
  onRepaso: () => void;
  onSeguir: () => void;
  onGuardadas: () => void;
  onPanico: () => void;
}) {
  // Suscripción explícita: los cálculos leen getState(), así que la vista tiene
  // que despertar cuando cambia lo que miran (SRS, progreso, catálogo).
  const srs = useA1((s) => s.srs);
  const progreso = useA1((s) => s.progreso);
  const unidades = useA1((s) => s.unidades);
  const tronco = useA1((s) => s.tronco);
  const nGuardadas = useA1((s) => s.guardadas.length);
  const setView = useApp((s) => s.setView);

  /* Los cálculos leen el store por getState(), no por argumento: las deps son
     los datos que MIRAN (SRS, progreso, catálogo), aunque no aparezcan dentro.
     `hayNuevos` pregunta si queda ALGO por aprender, no si el repaso de hoy
     trae frases nuevas — con el backlog alto la cola no mete nuevas, y aun así
     el mapa tiene que poder ofrecer arrancar algo. */
  const datos = useMemo(
    () => ({
      due: vencidos().length,
      hayNuevos: nuevos(1).length > 0,
      m: metricas(),
      total: totalChunks() || 1,
      retomar: puntoDeRetomar(),
    }),
    [srs, progreso, unidades],
  );

  const n = Math.min(datos.due, TOPE_VENCIDOS);

  const saludo =
    datos.due > 0
      ? 'Buenas, parce. Hoy toca repaso de pasillo: ' +
        n +
        (n === 1 ? ' frase' : ' frases') +
        " pa' refrescar" +
        (datos.hayNuevos ? ' y algo nuevo.' : '.') +
        ' ¿Le entramos?'
      : datos.hayNuevos
        ? 'Todo fresco, parce. Nada que repasar hoy — arranquemos algo nuevo, suave.'
        : 'Vas al día. Cuando querás repasamos lo que ya tenés, sin afán.';

  const pct = Math.round((datos.m.salen / datos.total) * 100);
  const delTronco = unidades.slice(0, tronco);
  const delPack = unidades.slice(tronco);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección: el ← de la vista y su nombre en mono ── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Oficina · con Alfred
        </span>
      </div>

      {/* ── La tarjeta: un solo scroller para todo el mapa ── */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div
          tabIndex={0}
          className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 sm:px-4', SIN_BARRA)}
        >
          {/* ── Métrica estrella: capacidad, no puntos ── */}
          <div className="flex shrink-0 flex-col gap-2">
            <Barra pct={pct} />
            <p className="text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
              {datos.m.salen > 0 ? (
                <>
                  Ya te salen solas: <strong style={{ color: 'var(--text-primary)' }}>{datos.m.salen}</strong>
                </>
              ) : (
                'Apenas arrancás — pronto se te van saliendo solas.'
              )}
            </p>
          </div>

          <AlfredBloque lineas={[saludo]} />

          {/* ── UNA acción del día ── */}
          <div className="flex shrink-0 flex-col gap-2.5">
            {datos.due > 0 ? (
              <CtaGrande
                conHaz
                eyebrow="Repaso de pasillo"
                principal={`${n}${n === 1 ? ' frase lista' : ' frases listas'} pa' refrescar`}
                accion="Repasar →"
                onClick={onRepaso}
              />
            ) : datos.hayNuevos ? (
              <CtaGrande
                conHaz
                eyebrow="Todo fresco"
                principal="Nada que repasar — arranquemos algo nuevo"
                accion="Arrancar →"
                onClick={onRepaso}
              />
            ) : null}

            {datos.retomar && (
              <CtaGrande
                eyebrow="Seguí donde ibas"
                principal={`${datos.retomar.unit.title_es} · escena ${datos.retomar.sceneNum}/${datos.retomar.sceneTotal}`}
                accion="Seguir →"
                onClick={onSeguir}
              />
            )}
          </div>

          {/* ── Ganchos ── */}
          <div className="flex shrink-0 flex-col gap-2.5">
            <Eyebrow>¿Sabés decir…?</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {GANCHOS.filter((g) => unidades.some((u) => u.id === g.unit)).map((g) => {
                const abierta = estaDesbloqueada(g.unit);
                return (
                  <motion.button
                    key={g.unit}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onUnidad(g.unit)}
                    className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[0.82rem]"
                    style={{
                      borderColor: 'var(--borde-sutil)',
                      background: 'var(--chip-bg)',
                      color: abierta ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {g.q}
                    {!abierta && <Lock className="size-3" strokeWidth={2} aria-hidden="true" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Catálogo ── */}
          <div className="flex shrink-0 flex-col gap-2.5">
            <Eyebrow>Elegí por dónde arrancar</Eyebrow>
            {delTronco.map((u) => (
              <UnidadCard key={u.id} u={u} onAbrir={onUnidad} />
            ))}
          </div>

          {/* ── Lo del trabajo elegido (A1.2). Va después del tronco a propósito:
              primero sobrevivís la oficina, después hablás de lo tuyo. ── */}
          {delPack.length > 0 && (
            <div className="flex shrink-0 flex-col gap-2.5">
              <Eyebrow acento>{pack ? `Lo tuyo · ${pack.nombre_es}` : 'Lo tuyo'}</Eyebrow>
              {pack && (
                <p className="text-[0.85rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
                  {pack.promesa_es}
                </p>
              )}
              {delPack.map((u) => (
                <UnidadCard key={u.id} u={u} onAbrir={onUnidad} />
              ))}
            </div>
          )}

          {/* ── Pie: lo guardado y el salvavidas ── */}
          <div className="flex shrink-0 flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={onGuardadas}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border text-[0.88rem] font-semibold"
              style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-secondary)' }}
            >
              <Star className="size-4" strokeWidth={2} aria-hidden="true" />
              Mis frases{nGuardadas ? ` · ${nGuardadas}` : ''}
            </button>
            <button
              type="button"
              onClick={onPanico}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-[0.88rem] font-semibold"
              style={{
                borderColor: 'color-mix(in oklch, var(--accent) 40%, transparent)',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
              }}
            >
              <LifeBuoy className="size-4" strokeWidth={2.2} aria-hidden="true" />
              No entiendo — las frases que me salvan
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
