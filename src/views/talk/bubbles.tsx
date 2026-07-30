import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';

import { Message, MessageContent } from '@/components/elevenlabs/message';
import { TextAnimate } from '@/components/magicui/text-animate';
import { GlossText } from '@/components/rodeo/gloss-text';
import { PencilLoader } from '@/components/rodeo/pencil-loader';
import { parseChunks } from '@/lib/gloss';
import { REDUCED } from '@/lib/theme';
import type { Burbuja } from '@/stores/talk';

import { OrbAvatar } from './orb-avatar';
import type { Maquina } from './typewriter';

/* Burbujas del chat — REDISEÑO sobre el kit de ElevenLabs (imagen 2 de Gus):
   el usuario a la DERECHA en píldora oscura con texto claro, el coach a la
   IZQUIERDA sobre superficie suave con el AVATAR ORB al lado, y aire generoso
   entre mensajes (el py-4 del <Message> verbatim).

   Lo que NO cambia: la geometría de esquina cuadrada del lado de quien habla,
   las dos fases del coach (stream en texto plano → final glosado) y las glosas
   ⟦en||es⟧, que son la firma de la app.

   TOKENS de la píldora oscura. La imagen 2 es un mockup en claro: allí "oscuro"
   es --card-ink (la tinta de las cards, oscura en los dos temas) sobre papel.
   En el tema oscuro de RODEO esa tinta (L21) quedaría MÁS CLARA que la Card del
   chat (--bg-surface, L17) y la píldora se leería como un gris levantado, no
   como una píldora negra: por eso en oscuro baja a --bg-void (L9), el negro del
   shell. Se resuelve con la variante `dark:` (definida en tokens.css como
   :root sin data-theme='light'), no con JS, para que el toggle de tema no tenga
   que repintar nada. */

const entrada = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
};

/* Contador de la espera larga (L4133-4146): a partir de los 3 s aparecen los
   segundos y a partir de los 25 s el "· pensando". */
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

/* Máquina de escribir (escribirMaquina, L4073) sobre TextAnimate — por carácter,
   con los mismos valores del CSS viejo (@keyframes rd-char): cada pieza entra
   desde translateY(30px) rotate(45deg) scale(.5) en .4s. Sigue siendo la fase 1
   de las respuestas que llegan de golpe (sin stream). */
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

/* ── El texto del coach ────────────────────────────────────────────────────
   CÓMO CONVIVEN blurInUp Y LAS GLOSAS (decisión declarada):

   TextAnimate solo acepta `children: string` — no puede envolver los <span> de
   <GlossText>. Así que el remate es en DOS tiempos, que además es el ritmo que
   ya tenía la app ("el subrayado aparece como remate"):

     1. Al llegar el FINAL se pinta el texto LIMPIO (parseChunks: sin los ⟦||⟧)
        dentro de <TextAnimate animation="blurInUp" by="character">.
     2. Cuando termina el barrido se cambia por <GlossText> con el reply crudo.
        El texto visible es EXACTAMENTE el mismo (GlossText pinta ese mismo
        `clean`), así que no hay salto: lo único que aparece son los subrayados
        punteados, ya tocables.

   No se anima dos veces: si la burbuja YA se tecleó con la máquina (respuesta
   sin stream) o si el usuario pidió menos movimiento, va directa a GlossText. */

/* 12 ms por carácter con techo de 1,1 s. Menos que la máquina de escribir
   (18 ms/carácter, sin techo) a propósito: aquí el texto ya se leyó mientras
   streameaba, esto es un barrido de remate, no un tecleo. Los 450 ms de cola
   son la animación de la última pieza (0,4 s) más un respiro. */
function medirBarrido(n: number) {
  const duracion = Math.min(1.1, Math.max(0.3, n * 0.012));
  return { duracion, swapMs: duracion * 1000 + 450 };
}

function TextoCoach({ b }: { b: Extract<Burbuja, { tipo: 'coach' }> }) {
  // Si en algún momento hubo tecleo, ya animó: no se vuelve a animar al final.
  const huboMaquina = useRef(false);
  if (b.tw) huboMaquina.current = true;

  const clean = useMemo(() => (b.final ? parseChunks(b.texto).clean : ''), [b.final, b.texto]);
  const { duracion, swapMs } = useMemo(() => medirBarrido(clean.length), [clean.length]);

  const [glosado, setGlosado] = useState(false);
  const animar = b.final && !glosado && !huboMaquina.current && !REDUCED && !!clean;

  useEffect(() => {
    if (!animar) return;
    const h = setTimeout(() => setGlosado(true), swapMs);
    return () => clearTimeout(h);
  }, [animar, swapMs]);

  if (!b.final) {
    // Fase 1: texto plano tal cual llega del stream, o tecleado si no hubo
    // stream (nunca HTML: es texto del modelo sin escapar).
    return b.tw ? <MaquinaTexto texto={b.texto} tw={b.tw} /> : <>{b.texto}</>;
  }

  if (animar) {
    return (
      <TextAnimate as="span" animation="blurInUp" by="character" duration={duracion} startOnView={false} once>
        {clean}
      </TextAnimate>
    );
  }

  return <GlossText reply={b.texto} glosses={b.glosses} />;
}

export function BurbujaChat({ b, orbVivo = false }: { b: Burbuja; orbVivo?: boolean }) {
  if (b.tipo === 'user') {
    return (
      <motion.div {...entrada}>
        <Message from="user">
          <MessageContent
            className={[
              'max-w-[85%] rounded-[20px] rounded-br-[6px] px-[15px] py-2.5 text-[0.97rem] leading-[1.55] [overflow-wrap:anywhere]',
              // Píldora oscura en los DOS temas (ver nota de tokens arriba).
              'group-[.is-user]:bg-[var(--card-ink)] group-[.is-user]:text-[var(--card-paper)]',
              'dark:group-[.is-user]:bg-[var(--bg-void)] dark:group-[.is-user]:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {b.texto}
          </MessageContent>
        </Message>
      </motion.div>
    );
  }

  if (b.tipo === 'pensando') {
    // Apertura desde el Home aurora — cápsula "Pensando" 1:1 de la referencia
    // (addAssistantThinking, index.html:3691-3701). Estilos en aurora.css.
    return (
      <motion.div {...entrada} role="status" aria-live="polite" className="assistant-thinking my-3 ml-10 self-start">
        <span className="assistant-thinking__surface">Pensando</span>
      </motion.div>
    );
  }

  if (b.tipo === 'espera') {
    // Misma fila que el coach (avatar + burbuja): el lápiz ocupa el sitio en el
    // que va a nacer la respuesta, así la conversación no da un salto.
    return (
      <motion.div {...entrada} aria-live="polite">
        <Message from="assistant">
          <MessageContent className="rounded-[20px] rounded-bl-[6px] bg-secondary px-4 py-3">
            <Espera desde={b.desde} />
          </MessageContent>
          <OrbAvatar estado="thinking" />
        </Message>
      </motion.div>
    );
  }

  if (b.tipo === 'coach') {
    return (
      <motion.div {...entrada}>
        <Message from="assistant">
          <MessageContent className="max-w-[85%] rounded-[20px] rounded-bl-[6px] bg-secondary px-4 py-3 text-[0.97rem] leading-[1.6] break-words">
            <TextoCoach b={b} />
          </MessageContent>
          {/* 'talking' mientras streamea o habla; en reposo, null. */}
          <OrbAvatar estado={b.final ? null : 'talking'} vivo={orbVivo} />
        </Message>
      </motion.div>
    );
  }

  if (b.tipo === 'correccion') {
    return (
      <motion.div
        {...entrada}
        /* Del lado del usuario (es SU error), sangrada bajo su píldora.
           break-words: el `quote` es literalmente lo que Gus dictó o pegó. */
        className="ml-auto max-w-[85%] rounded-[16px_16px_6px_16px] border px-[15px] py-3 text-[0.85rem] [overflow-wrap:anywhere]"
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

  // Idea (bombilla): lavanda, como en el viejo. No es un turno, es meta-ayuda,
  // así que va sangrada al carril del coach pero SIN avatar: no la dijo él.
  return (
    <motion.div
      {...entrada}
      className="mr-auto ml-10 max-w-[85%] rounded-[18px] px-4 py-3 text-[0.92rem] leading-[1.5]"
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
