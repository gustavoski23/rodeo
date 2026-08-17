import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, LifeBuoy, SendHorizonal, UserRound } from 'lucide-react';

import { PencilLoader } from '@/components/rodeo/pencil-loader';
import type { A1UnitRuta } from '@/content/a1/tipos-ruta';
import { useCoach } from '@/stores/coach';

import { ENTRADA, Eyebrow } from './alfred';
import { CoachDebrief } from './coach-debrief';
import { coachTurno, cerrarCoach, salirCoach } from './coach-turno';
import { tokenTema } from './mapa';

/* LA CONVERSACIÓN — quien habla es EL PERSONAJE de la escena, no Alfred.

   Se ve en la pantalla, no solo en el prompt: el avatar del interlocutor es el
   emoji de la parada (🛂 migración, 🍽️ el restaurante), no la "A" durazno de
   Alfred. Alfred aparece una sola vez, al final, en la hoja de cierre. Si el
   que te enseña es el mismo que te señala, cambia cómo se siente equivocarse
   delante de él — y esta app se sostiene sobre que equivocarse no cueste.

   DOS SALIDAS y no son la misma:
     ←              me voy (se anota ABANDONADA: es una de las tres señales)
     "Ya está…"     terminamos (aparece recién al 2do intercambio, y da debrief)
   La escena además cierra sola después de 4-6 intercambios, que es lo normal:
   una conversación de verdad no termina porque alguien toque un botón. */

const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* El avatar del interlocutor: una PERSONA, en el color de la parada.

   Primera versión: el emoji de la parada, para que la conversación se atara
   visualmente a su nodo del mapa. Verificado en captura y no sirve — el emoji
   de t0-cognados es 🎁 y en el mostrador de información quedaba un regalo
   contestándote. La mitad de los emojis del catálogo son objetos (un diente,
   una serpiente, un avión) y ninguno se lee como alguien hablando.

   El color sigue diciendo de qué parada es; el glifo dice que es una persona.
   Y no es la "A" de Alfred, que es lo único que de verdad hay que distinguir:
   Alfred aparece una sola vez, al final, en la hoja de cierre. */
function Avatar({ unit, size = 30 }: { unit: A1UnitRuta; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: tokenTema(unit.cardTheme),
        color: 'var(--card-ink)',
        boxShadow: '0 2px 10px oklch(0% 0 0 / 0.28)',
      }}
    >
      <UserRound size={Math.round(size * 0.54)} strokeWidth={2.2} />
    </span>
  );
}

function BurbujaPersonaje({ unit, texto }: { unit: A1UnitRuta; texto: string }) {
  return (
    <motion.div {...ENTRADA} className="flex items-start gap-2.5">
      <Avatar unit={unit} />
      <div
        className="max-w-[80%] rounded-[4px_20px_20px_20px] border px-[17px] py-3 text-[0.98rem] leading-[1.58] break-words"
        style={{ background: 'var(--superficie-t)', borderColor: 'var(--borde-sutil)', color: 'var(--text-primary)' }}
      >
        {texto}
      </div>
    </motion.div>
  );
}

function BurbujaUsuario({ texto }: { texto: string }) {
  return (
    <motion.div {...ENTRADA} className="flex justify-end">
      <div
        className="max-w-[80%] rounded-[20px_4px_20px_20px] border px-[17px] py-3 text-[0.98rem] leading-[1.58] break-words"
        style={{
          background: 'var(--accent-dim)',
          borderColor: 'color-mix(in oklch, var(--accent) 34%, transparent)',
          color: 'var(--text-primary)',
        }}
      >
        {texto}
      </div>
    </motion.div>
  );
}

/** La situación y la meta, arriba del hilo. Se lee ANTES de la primera línea
    en inglés: entrar a una conversación sin saber qué se espera de uno es el
    motivo número uno por el que alguien se queda mudo. */
function Situacion({ unit }: { unit: A1UnitRuta }) {
  const c = unit.coach!;
  return (
    <motion.div
      {...ENTRADA}
      className="flex flex-col gap-2 rounded-[22px] border px-4 py-4"
      style={{
        borderColor: 'var(--borde-medio)',
        background: `linear-gradient(140deg, color-mix(in oklch, ${tokenTema(unit.cardTheme)} 16%, transparent), transparent 62%), var(--bg-elevated)`,
      }}
    >
      <Eyebrow acento>Dónde estás</Eyebrow>
      <p className="text-[0.95rem] leading-[1.4] font-semibold">{c.escenario_es}</p>
      <p className="text-[0.85rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
        {c.meta_es}
      </p>
      <p className="text-[0.8rem] leading-[1.45]" style={{ color: 'var(--text-muted)' }}>
        Habla como puedas. Si no te sale en inglés, dilo en español y seguimos.
      </p>
    </motion.div>
  );
}

export function Coach({ unit, onSalir, onPanico }: { unit: A1UnitRuta; onSalir: () => void; onPanico: () => void }) {
  const hilo = useCoach((s) => s.hilo);
  const inputOn = useCoach((s) => s.inputOn);
  const cerrando = useCoach((s) => s.cerrando);
  const cierre = useCoach((s) => s.cierre);
  const errorCierre = useCoach((s) => s.errorCierre);
  const devuelto = useCoach((s) => s.devuelto);
  const intercambios = useCoach((s) => s.sesion?.intercambios ?? 0);

  const [texto, setTexto] = useState('');
  const fondo = useRef<HTMLDivElement | null>(null);

  /* Un turno que falla devuelve la línea al campo: su frase no se pierde por un
     rate-limit. Escribir es caro para un principiante. */
  useEffect(() => {
    if (!devuelto) return;
    setTexto(devuelto);
    useCoach.getState().tomarDevuelto();
  }, [devuelto]);

  // Pegado al fondo: lo último dicho es lo que importa.
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' });
  }, [hilo.length, cerrando]);

  function enviar() {
    const t = texto.trim();
    if (!t || !inputOn) return;
    setTexto('');
    void coachTurno(t);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra: me voy · dónde estoy · el salvavidas ── */}
      <div className="flex shrink-0 items-center gap-2.5 pb-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            salirCoach();
            onSalir();
          }}
          aria-label="Salir de la conversación"
          className="rd-toque-44 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.62rem] font-bold tracking-[0.14em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Hablando · {unit.title_es}
        </span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onPanico}
          aria-label="Frases de emergencia"
          className="rd-toque-44 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{
            borderColor: 'color-mix(in oklch, var(--accent) 35%, transparent)',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
          }}
        >
          <LifeBuoy size={17} strokeWidth={2.2} />
        </motion.button>
      </div>

      {/* ── El hilo ── */}
      <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2 ${SIN_BARRA}`} data-coach-hilo>
        <Situacion unit={unit} />

        {hilo.map((m) =>
          m.tipo === 'personaje' ? (
            <BurbujaPersonaje key={m.id} unit={unit} texto={m.texto} />
          ) : m.tipo === 'usuario' ? (
            <BurbujaUsuario key={m.id} texto={m.texto} />
          ) : (
            <div key={m.id} className="flex items-center gap-2.5 py-1">
              <Avatar unit={unit} />
              <PencilLoader size={3.4} />
            </div>
          ),
        )}

        {cerrando && (
          /* Indicador PERSISTENTE, no un toast de 4 s para una espera de 15-25.
             Y lo firma Alfred, que es quien entra ahora. */
          <div className="flex flex-col items-center gap-2 py-4">
            <PencilLoader size={4.2} label="Alfred está mirando cómo te fue" />
          </div>
        )}

        <div ref={fondo} />
      </div>

      {/* ── Escribir ── */}
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        {intercambios >= 2 && !cerrando && !cierre && (
          <button
            type="button"
            onClick={() => void cerrarCoach()}
            className="self-center rounded-full px-4 py-1.5 text-[0.78rem] font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            Ya está — ciérrala
          </button>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            disabled={!inputOn}
            rows={1}
            placeholder="Escribe como puedas…"
            aria-label="Tu respuesta"
            /* 16px clavado: por debajo de eso iOS hace zoom al enfocar el campo
               y saca al usuario de la conversación. */
            className="max-h-28 min-h-12 flex-1 resize-none rounded-[20px] border px-4 py-3 text-[16px] leading-[1.4] outline-none disabled:opacity-50"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--borde-sutil)',
              color: 'var(--text-primary)',
            }}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={enviar}
            disabled={!inputOn || !texto.trim()}
            aria-label="Enviar"
            className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:opacity-40"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            <SendHorizonal size={19} strokeWidth={2.2} />
          </motion.button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!inputOn) return;
            /* R5: el bilingüe existe pa' que NUNCA haya silencio muerto. Esto
               es literalmente lo que diría alguien trabado, y el personaje ya
               sabe qué hacer con eso: le da la frase y sigue. */
            void coachTurno('No sé qué decir');
          }}
          disabled={!inputOn}
          className="self-center rounded-full px-4 py-1.5 text-[0.78rem] font-semibold disabled:opacity-40"
          style={{ color: 'var(--text-muted)' }}
        >
          No sé qué decir
        </button>
      </div>

      <CoachDebrief
        cierre={cierre}
        error={errorCierre}
        unit={unit}
        onListo={() => {
          onSalir();
        }}
      />
    </div>
  );
}
