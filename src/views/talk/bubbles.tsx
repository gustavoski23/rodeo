import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

import { GlossText } from '@/components/rodeo/gloss-text';
import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { TextAnimate } from '@/components/magicui/text-animate';
import type { Burbuja } from '@/stores/talk';
import type { Maquina } from './typewriter';

/* Burbujas del chat — port de las clases .bubble-coach / .bubble-user /
   .correction-card / .bubble-idea y de la burbuja de espera con el lápiz
   (public/legacy.html CSS L802-833, L551-562; markup en addBubble L4012).

   La geometría es la del viejo (esquina cuadrada del lado de quien habla,
   85 % de ancho, radios 20/4). Lo que cambia es el relleno: el coach pasa a
   superficie translúcida --superficie-t sobre el shell, en vez de un
   --bg-surface opaco, para que la conversación flote sobre el fondo en vez de
   parecer una lista de tarjetas. Los tokens hacen que en tema claro se dé
   vuelta solo.

   La ENTRADA se anima (era animateIn con GSAP); el TEXTO solo cuando NO hubo
   stream: mientras streamea la burbuja se repinta decenas de veces por segundo
   y animar cada delta por carácter sería un tartamudeo, no una máquina de
   escribir. Cuando la respuesta llega de golpe (fallback sin stream, reintento
   por 'length') vuelve el tecleo del viejo (§3.2) — ver <Maquina>. */

const entrada = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
};

/* Contador de la espera larga (L4133-4146): a partir de los 3 s aparecen los
   segundos y a partir de los 25 s el "· pensando". Antes eran un setInterval
   que inyectaba un <span> en la burbuja; aquí vive dentro del componente que
   ya está en pantalla, así que muere con él. */
function Espera({ desde }: { desde: number }) {
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    const h = setInterval(() => setSeg(Math.round((Date.now() - desde) / 1000)), 1000);
    return () => clearInterval(h);
  }, [desde]);

  return (
    <PencilLoader size={4.4}>
      {seg >= 3 && <span className="rd-wait">{seg < 25 ? `${seg}s` : `${seg}s · pensando`}</span>}
    </PencilLoader>
  );
}

/* Máquina de escribir (escribirMaquina, L4073) sobre TextAnimate — el snippet 5
   elegido por el dueño, por carácter, con los mismos valores del CSS viejo
   (@keyframes rd-char, L1632-1642): cada pieza entra desde translateY(30px)
   rotate(45deg) scale(.5) en .4s con cubic-bezier(.2,1.4,.4,1).

   El `by` y la duración vienen medidos (typewriter.ts) para que el swap a la
   versión glosada, que dispara el turno, caiga justo cuando termina el barrido.
   startOnView=false: la burbuja nace al fondo del scroll y el observer de
   viewport podía dejarla sin arrancar. */
const PIEZA = {
  hidden: { opacity: 0, y: 30, rotate: 45, scale: 0.5 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.2, 1.4, 0.4, 1] as const },
  },
  exit: { opacity: 0 },
};

function MaquinaTexto({ texto, tw }: { texto: string; tw: Maquina }) {
  return (
    <TextAnimate as="span" by={tw.por} duration={tw.duracion} variants={PIEZA} startOnView={false}>
      {texto}
    </TextAnimate>
  );
}

export function BurbujaChat({ b }: { b: Burbuja }) {
  if (b.tipo === 'user') {
    return (
      <motion.div
        {...entrada}
        className="ml-auto max-w-[85%] rounded-[20px_4px_20px_20px] border px-[18px] py-3.5 text-[1rem] leading-[1.6]"
        style={{
          background: 'var(--accent-dim)',
          borderColor: 'color-mix(in oklch, var(--accent) 28%, transparent)',
          color: 'var(--text-primary)',
        }}
      >
        {b.texto}
      </motion.div>
    );
  }

  if (b.tipo === 'pensando') {
    // La apertura desde el Home aurora: cápsula oscura con el texto exacto
    // `Pensando` (brief del Home). Los estilos viven en aurora.css, que ya
    // llega al bundle vía el AuroraPillButton del propio Home.
    return (
      <motion.div {...entrada} aria-live="polite" className="assistant-thinking">
        Pensando
      </motion.div>
    );
  }

  if (b.tipo === 'espera') {
    return (
      <motion.div
        {...entrada}
        aria-live="polite"
        className="max-w-[85%] self-start rounded-[4px_20px_20px_20px] border px-[18px] py-3.5"
        style={{ background: 'var(--superficie-t)', borderColor: 'var(--borde-sutil)' }}
      >
        <Espera desde={b.desde} />
      </motion.div>
    );
  }

  if (b.tipo === 'coach') {
    return (
      <motion.div
        {...entrada}
        className="max-w-[85%] self-start rounded-[4px_20px_20px_20px] border px-[18px] py-3.5 text-[1rem] leading-[1.6] break-words"
        style={{
          background: 'var(--superficie-t)',
          borderColor: 'var(--borde-sutil)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Fase 1: texto plano tal cual llega del stream, o tecleado si no hubo
            stream (nunca HTML: es texto del modelo sin escapar).
            Fase 2: swap a la versión glosada. */}
        {b.final ? (
          <GlossText reply={b.texto} glosses={b.glosses} />
        ) : b.tw ? (
          <MaquinaTexto texto={b.texto} tw={b.tw} />
        ) : (
          b.texto
        )}
      </motion.div>
    );
  }

  if (b.tipo === 'correccion') {
    return (
      <motion.div
        {...entrada}
        /* break-words: el `quote` es literalmente lo que Gus dictó o pegó —
           una URL o un token larguísimo se salía de la tarjeta y se recortaba. */
        className="ml-auto max-w-[85%] rounded-[16px_16px_4px_16px] border px-[15px] py-3 text-[0.85rem] [overflow-wrap:anywhere]"
        style={{ background: 'var(--danger-dim)', borderColor: 'color-mix(in oklch, var(--danger) 32%, transparent)' }}
      >
        <div className="leading-[1.5]">
          <span className="line-through decoration-[1.5px]" style={{ color: 'var(--texto-mal)' }}>
            {b.quote}
          </span>
          {' → '}
          {/* --texto-bien y no --accent: en claro la lima de acento sobre el
              coral de la tarjeta se queda en 4,4:1 y esto son 13,6 px negrita. */}
          <span className="font-bold" style={{ color: 'var(--texto-bien)' }}>
            {b.fix}
          </span>
        </div>
        {b.why && (
          <div className="mt-1 text-[0.8rem]" style={{ color: 'var(--text-secondary)' }}>
            {b.why}
          </div>
        )}
      </motion.div>
    );
  }

  // Idea (bombilla): lavanda, como en el viejo. No es un turno, es meta-ayuda.
  return (
    <motion.div
      {...entrada}
      className="max-w-[88%] self-start rounded-[18px] px-4 py-3 text-[0.92rem] leading-[1.5]"
      style={{ background: 'var(--card-lavender)', color: 'var(--card-ink)' }}
    >
      <span
        className="mb-1 block font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase"
        style={{ color: 'var(--card-ink-soft)' }}
      >
        💡 podrías decir
      </span>
      {b.texto}
    </motion.div>
  );
}
