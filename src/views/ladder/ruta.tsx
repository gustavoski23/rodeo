import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Lightbulb, Lock, Play, Sparkles, Target } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import type { LadderXP } from '@/stores/ladder';

import type { Veta } from './prompts';

type Tramo = {
  id: string;
  numero: string;
  titulo: string;
  descripcion: string;
  foco: string;
  minutos: string;
  desde: number;
  hasta: number;
  veta: Veta;
  objetivo: string;
  regla: string;
  ejemplos: { antes: string; despues: string; nota: string }[];
  claves: string[];
  reto: string;
  habilidadJuez: string;
};

type Ejemplo = { antes: string; despues: string; nota: string };

const HABILIDADES_JUEZ: Record<string, string> = {
  precision: 'precision lexica: reemplazar verbos vagos por una eleccion exacta y nombrar el impacto',
  naturalidad: 'naturalidad lexica: demostrar collocations frecuentes y evitar traducciones literales',
  fluidez: 'fluidez discursiva: conectar ideas y hacer visible el contraste o la secuencia',
  registro: 'registro profesional: ser claro y firme con un tono colaborativo',
  criterio: 'criterio y hedging: calibrar certeza y distinguir evidencia de inferencia',
  'c1-vivo': 'sintesis C1: integrar precision, matiz, registro y proximo paso bajo presion',
};

function crearEjemplo(antes: string, despues: string, nota: string): Ejemplo {
  return { antes, despues, nota };
}

function crearTramo(
  id: string,
  numero: string,
  titulo: string,
  descripcion: string,
  foco: string,
  minutos: string,
  desde: number,
  hasta: number,
  veta: Veta,
  objetivo: string,
  regla: string,
  ejemplos: Ejemplo[],
  claves: string[],
  reto: string,
): Tramo {
  return {
    id,
    numero,
    titulo,
    descripcion,
    foco,
    minutos,
    desde,
    hasta,
    veta,
    objetivo,
    regla,
    ejemplos,
    claves,
    reto,
    habilidadJuez: HABILIDADES_JUEZ[id] ?? 'mejora C1 general',
  };
}

const TRAMOS: Tramo[] = [
  crearTramo('precision', '01', 'Precisión', 'De una frase correcta a una frase que dice exactamente lo que querés decir.', 'matiz y elección de palabras', '5 min', 0, 18, 'trabajo', 'Elegir la palabra que apunta al problema real, no la primera que se parece.', 'Un verbo preciso hace más trabajo que tres adverbios vagos.', [crearEjemplo('We need to fix this soon.', 'We need to address the bottleneck before it delays the launch.', 'address + bottleneck nombra la acción y el problema.'), crearEjemplo('The results were good.', 'The results were consistently strong across the three tests.', 'strong y consistently hacen la evaluación comprobable.')], ['cambiá verbos genéricos por verbos de acción', 'nombrá el impacto o la condición', 'quitá intensificadores que no agregan información'], 'Reescribí una frase de trabajo usando un verbo más exacto y un resultado observable.'),
  crearTramo('naturalidad', '02', 'Naturalidad', 'De traducir ideas a combinar las palabras como las combina un hablante experto.', 'collocations e idioms', '7 min', 18, 36, 'calle', 'Combinar palabras que suelen ir juntas para sonar natural sin traducir palabra por palabra.', 'En C1 no solo importa la palabra correcta: importa su pareja habitual.', [crearEjemplo('We need to arrive to an agreement.', 'We need to reach an agreement.', 'reach an agreement es la combinación natural.'), crearEjemplo('This is very unlikely to happen.', 'This is highly unlikely to happen.', 'highly modifica adjetivos de evaluación con más naturalidad.')], ['aprendé bloques, no palabras aisladas', 'escuchá qué verbo pide cada sustantivo', 'preferí combinaciones frecuentes sobre traducciones literales'], 'Elegí una idea que repetís mucho y convertíla en un bloque de dos o tres palabras.'),
  crearTramo('fluidez', '03', 'Fluidez', 'Conectá tus ideas sin frenar: el pensamiento también tiene ritmo.', 'phrasal verbs y conectores', '6 min', 36, 54, 'calle', 'Conectar ideas con ritmo para que tu respuesta avance sin sonar como una lista.', 'La fluidez no es hablar más rápido: es hacer visible la relación entre tus ideas.', [crearEjemplo('The launch was delayed. We worked on the docs.', 'The launch was delayed. In the meantime, we focused on the documentation.', 'in the meantime organiza la secuencia y evita el salto brusco.'), crearEjemplo('I agree with the idea, but it is risky.', 'I see the appeal of the idea. That said, the current timeline makes it risky.', 'That said introduce un giro sin borrar lo anterior.')], ['usá conectores que expliquen la relación', 'alterná frases cortas con una frase desarrollada', 'tené a mano una forma de ganar tiempo sin rellenar'], 'Uní dos frases cortas con un conector que explique causa, contraste o secuencia.'),
  crearTramo('registro', '04', 'Registro', 'Elegí el tono que pide la situación, desde un chat casual hasta una decisión difícil.', 'tono profesional y voz', '8 min', 54, 70, 'trabajo', 'Ajustar el tono para ser claro, firme y colaborativo en contextos profesionales.', 'El registro cambia la relación, no solo el vocabulario.', [crearEjemplo('Send me the numbers today.', 'Could you share the latest figures by the end of the day?', 'Could you + share suaviza la orden sin perder plazo.'), crearEjemplo('I disagree with this plan.', 'I am not convinced this plan addresses the main risk.', 'La desacuerdo se vuelve específico y abre conversación.')], ['pedí con could you cuando no estás dando una instrucción formal', 'elegí share, raise o clarify según la acción', 'criticá la idea o el riesgo, no a la persona'], 'Convertí una orden o desacuerdo directo en una frase profesional que conserve el límite.'),
  crearTramo('criterio', '05', 'Criterio', 'Suavizá, defendé o cuestioná una idea sin sonar rígido ni ambiguo.', 'hedging y postura', '8 min', 70, 86, 'own', 'Mostrar seguridad sin sonar absoluto: anticipar límites, evidencia y condiciones.', 'Hedging no es dudar de todo; es calibrar la fuerza de lo que afirmás.', [crearEjemplo('This will fail if we launch now.', 'This may fall short unless we resolve the onboarding issue first.', 'may + unless expresa riesgo y condición, no una sentencia.'), crearEjemplo('The data proves users want this.', 'The data suggests there is clear demand, although the sample is still small.', 'suggests y although hacen la afirmación más rigurosa.')], ['usá may, tends to o appears to para graduar certeza', 'agregá unless, provided that o although cuando importa la condición', 'separá lo que sabés de lo que inferís'], 'Defendé una propuesta con una condición explícita y una reserva honesta.'),
  crearTramo('c1-vivo', '06', 'C1 vivo', 'Juntá precisión, ritmo y criterio para responder bajo presión.', 'síntesis y soltura', '10 min', 86, 100, 'trabajo', 'Responder bajo presión integrando precisión, naturalidad, registro y criterio.', 'C1 vivo es elegir bien mientras pensás, no recitar frases difíciles.', [crearEjemplo('The plan is good but risky.', 'The direction is promising, although its success hinges on a tighter rollout plan.', 'promising + hinges on sintetiza evaluación y condición.'), crearEjemplo('We should do it because users asked for it.', 'The feedback supports moving forward, provided that we validate the retention impact first.', 'supports + provided that convierte opinión en decisión razonada.')], ['abrí con la conclusión o la postura', 'sumá un matiz que demuestre criterio', 'cerrá con una condición, consecuencia o próximo paso'], 'Respondé en dos frases: postura clara primero, matiz y siguiente paso después.'),
];

function estadoTramo(tramo: Tramo, pct: number): 'hecho' | 'actual' | 'bloqueado' {
  if (pct >= tramo.hasta) return 'hecho';
  if (pct >= tramo.desde) return 'actual';
  return 'bloqueado';
}

function ProgresoRuta({ pct }: { pct: number }) {
  return (
    <div className="shrink-0">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
            Tu avance
          </p>
          <p className="mt-1 text-[0.86rem]" style={{ color: 'var(--text-secondary)' }}>
            {pct === 0 ? 'Arrancás desde el punto justo.' : `${pct}% del camino ya es tuyo.`}
          </p>
        </div>
        <span className="font-display text-[1.7rem] leading-none font-extrabold" style={{ color: 'var(--text-primary)' }}>
          {pct}%
        </span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full"
        style={{ background: 'var(--superficie-t)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la ruta B2 a C1"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent)' }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[0.58rem] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>
        <span>B2</span>
        <span>B2+</span>
        <span>C1</span>
      </div>
    </div>
  );
}

function TramoCard({ tramo, estado, onOpen }: { tramo: Tramo; estado: ReturnType<typeof estadoTramo>; onOpen: (tramo: Tramo) => void }) {
  const bloqueado = estado === 'bloqueado';
  const hecho = estado === 'hecho';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: bloqueado ? 1 : 0.985 }}
      onClick={() => !bloqueado && onOpen(tramo)}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-[22px] border p-3.5 text-left transition-colors',
        bloqueado ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
      style={{
        borderColor: estado === 'actual' ? 'color-mix(in oklch, var(--accent) 54%, transparent)' : 'var(--borde-sutil)',
        background: estado === 'actual' ? 'color-mix(in oklch, var(--accent-dim) 65%, var(--bg-surface))' : 'var(--bg-surface)',
        opacity: bloqueado ? 0.6 : 1,
      }}
      aria-label={bloqueado ? `${tramo.titulo}, bloqueado` : `Abrir lección de ${tramo.titulo}`}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-[14px] font-mono text-[0.7rem] font-bold"
        style={{
          background: hecho || estado === 'actual' ? 'var(--accent)' : 'var(--chip-bg-fuerte)',
          color: hecho || estado === 'actual' ? 'var(--accent-ink)' : 'var(--text-muted)',
        }}
      >
        {hecho ? <Check className="size-4" strokeWidth={2.6} aria-hidden="true" /> : tramo.numero}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-[1.02rem] leading-[1.15] font-bold tracking-[-0.02em]">{tramo.titulo}</span>
          {estado === 'actual' && (
            <span className="rounded-full px-2 py-1 font-mono text-[0.52rem] font-bold tracking-[0.12em] uppercase" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              ahora
            </span>
          )}
        </span>
        <span className="text-[0.8rem] leading-[1.35]" style={{ color: 'var(--text-secondary)' }}>
          {tramo.descripcion}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.58rem] tracking-[0.04em] uppercase" style={{ color: 'var(--text-muted)' }}>
          <span>{tramo.foco}</span>
          <span aria-hidden="true">·</span>
          <span>{tramo.minutos}</span>
        </span>
      </span>

      <span className="mt-1 shrink-0" style={{ color: hecho ? 'var(--accent)' : 'var(--text-muted)' }}>
        {bloqueado ? <Lock className="size-4" strokeWidth={2} aria-hidden="true" /> : <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />}
      </span>
    </motion.button>
  );
}

function LeccionB2C1({ tramo, onBack, onPractice }: { tramo: Tramo; onBack: () => void; onPractice: (veta: Veta, habilidad: string) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[640px] shrink-0 items-center gap-2 pb-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onBack}
          aria-label="Volver al recorrido"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          Lección {tramo.numero} · B2 → C1
        </span>
      </div>

      <Card className="mx-auto min-h-0 w-full max-w-[640px] flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
          <div className="shrink-0">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-[15px]" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <BookOpen className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[0.6rem] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--text-secondary)' }}>
                  Tramo {tramo.numero} · {tramo.foco}
                </p>
                <h1 className="mt-1 font-display text-[2.15rem] leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-[2.55rem]">
                  {tramo.titulo}<span style={{ color: 'var(--accent)' }}>.</span>
                </h1>
              </div>
            </div>
            <p className="mt-3 text-[0.95rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
              {tramo.objetivo}
            </p>
          </div>

          <div className="flex shrink-0 gap-3 rounded-[18px] border px-3.5 py-3.5" style={{ borderColor: 'color-mix(in oklch, var(--accent) 35%, transparent)', background: 'var(--accent-dim)' }}>
            <Lightbulb className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <div>
              <p className="font-mono text-[0.58rem] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--accent)' }}>
                La idea clave
              </p>
              <p className="mt-1 text-[0.86rem] leading-[1.45]" style={{ color: 'var(--text-primary)' }}>
                {tramo.regla}
              </p>
            </div>
          </div>

          <section className="flex shrink-0 flex-col gap-2.5" aria-labelledby={`ejemplos-${tramo.id}`}>
            <div>
              <p className="font-mono text-[0.6rem] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--accent)' }}>
                Mira la diferencia
              </p>
              <h2 id={`ejemplos-${tramo.id}`} className="mt-1 font-display text-[1.25rem] font-bold tracking-[-0.02em]">
                Correcto no siempre es suficiente.
              </h2>
            </div>
            <div className="flex flex-col gap-2.5">
              {tramo.ejemplos.map((ejemplo) => (
                <div key={ejemplo.antes} className="rounded-[18px] border p-3.5" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="font-mono text-[0.56rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>B2 · funciona</p>
                      <p className="mt-1 text-[0.9rem] leading-[1.4]" style={{ color: 'var(--text-secondary)' }}>{ejemplo.antes}</p>
                    </div>
                    <div className="h-px" style={{ background: 'var(--borde-sutil)' }} />
                    <div>
                      <p className="font-mono text-[0.56rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--accent)' }}>C1 · apunta mejor</p>
                      <p className="mt-1 text-[0.94rem] leading-[1.4] font-semibold" style={{ color: 'var(--text-primary)' }}>{ejemplo.despues}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[0.78rem] leading-[1.4]" style={{ color: 'var(--text-secondary)' }}>{ejemplo.nota}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="shrink-0" aria-labelledby={`objetivo-${tramo.id}`}>
            <p className="font-mono text-[0.6rem] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--accent)' }}>
              Al terminar
            </p>
            <h2 id={`objetivo-${tramo.id}`} className="mt-1 font-display text-[1.25rem] font-bold tracking-[-0.02em]">
              Vas a poder...
            </h2>
            <ul className="mt-2.5 flex flex-col gap-2">
              {tramo.claves.map((clave) => (
                <li key={clave} className="flex items-start gap-2.5 text-[0.84rem] leading-[1.4]" style={{ color: 'var(--text-secondary)' }}>
                  <Check className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={2.4} aria-hidden="true" />
                  <span>{clave}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="shrink-0 rounded-[18px] border px-3.5 py-3.5" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-elevated)' }}>
            <p className="font-mono text-[0.58rem] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--accent)' }}>
              Tu misión · {tramo.minutos}
            </p>
            <p className="mt-1.5 text-[0.88rem] leading-[1.45]" style={{ color: 'var(--text-primary)' }}>
              {tramo.reto}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 pb-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => onPractice(tramo.veta, tramo.habilidadJuez)}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-5 font-mono text-[0.68rem] font-bold tracking-[0.1em] uppercase"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              <Play className="size-4" fill="currentColor" strokeWidth={2} aria-hidden="true" />
              Practicar este tramo
            </motion.button>
            <button
              type="button"
              onClick={onBack}
              className="min-h-11 cursor-pointer rounded-full border px-4 font-mono text-[0.62rem] font-bold tracking-[0.1em] uppercase"
              style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-secondary)' }}
            >
              Volver al recorrido
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function RutaB2C1({ xp, onStart }: { xp: LadderXP; onStart: (veta: Veta, habilidad: string) => void }) {
  const setView = useApp((s) => s.setView);
  const pct = Math.min(100, Math.max(0, Math.round(xp.pct)));
  const actual = TRAMOS.find((tramo) => estadoTramo(tramo, pct) === 'actual') ?? TRAMOS[TRAMOS.length - 1];
  const [leccion, setLeccion] = useState<Tramo | null>(null);

  if (leccion) {
    return <LeccionB2C1 tramo={leccion} onBack={() => setLeccion(null)} onPractice={onStart} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[640px] shrink-0 items-center gap-2 pb-3">
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
        <span className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          Tu ruta · B2 → C1
        </span>
      </div>

      <Card className="mx-auto min-h-0 w-full max-w-[640px] flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
          <div className="shrink-0">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-[15px]" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <Target className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--text-secondary)' }}>
                  Level up
                </p>
                <h1 className="mt-1 font-display text-[2.15rem] leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-[2.55rem]">
                  No empezás de cero<span style={{ color: 'var(--accent)' }}>.</span>
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-[510px] text-[0.92rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
              Esta ruta convierte tu inglés correcto en un inglés preciso, natural y difícil de olvidar.
            </p>
          </div>

          <ProgresoRuta pct={pct} />

          <div className="flex shrink-0 items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-elevated)' }}>
            <div className="flex min-w-0 items-center gap-2.5">
              <Sparkles className="size-4 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <span className="min-w-0 text-[0.84rem] leading-[1.3]">
                <strong>Tu siguiente tramo:</strong> {actual.titulo}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLeccion(actual)}
              className="shrink-0 cursor-pointer rounded-full border-0 px-3.5 py-2.5 font-mono text-[0.6rem] font-bold tracking-[0.1em] uppercase"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              Entrenar
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[0.6rem] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--accent)' }}>
                  El recorrido
                </p>
                <p className="mt-1 text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
                  Cada tramo te pide producir, no reconocer.
                </p>
              </div>
              <span className="font-mono text-[0.58rem] tracking-[0.08em] uppercase" style={{ color: 'var(--text-muted)' }}>
                {TRAMOS.filter((tramo) => estadoTramo(tramo, pct) === 'hecho').length}/{TRAMOS.length} hechos
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {TRAMOS.map((tramo) => (
                <TramoCard key={tramo.id} tramo={tramo} estado={estadoTramo(tramo, pct)} onOpen={setLeccion} />
              ))}
            </div>
          </div>

          <div className="shrink-0 rounded-[18px] border px-3.5 py-3.5" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
            <p className="font-mono text-[0.58rem] font-bold tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Cómo funciona
            </p>
            <p className="mt-1.5 text-[0.84rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
              La app te da una frase B2. Vos la subís. El juez te muestra qué cambia cuando el idioma gana precisión.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
