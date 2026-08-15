import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, CornerDownRight, LifeBuoy, Lock, MessageCircle, Star, WifiOff } from 'lucide-react';

import { BorderBeam } from '@/components/magicui/border-beam';
import { IconoTinta } from '@/components/rodeo/tinta/icono-tinta';
import { Card } from '@/components/ui/card';
import type { JobPack } from '@/content/a1/tipos';
import type { A1Tramo, A1TramoId } from '@/content/a1/tipos-ruta';
import { PENDIENTES, TRAMOS } from '@/content/a1/tramos';
import { tieneCoach } from '@/lib/coach-a1';
import { useEnLinea } from '@/lib/device';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { toast } from '@/stores/toast';
import {
  atajoDisponible,
  escenasHechas,
  estaDesbloqueada,
  metricas,
  nuevos,
  progresoDelTramo,
  puntoDeRetomar,
  tramoActivo,
  useA1,
  vencidos,
  TOPE_VENCIDOS,
} from '@/stores/a1';

import { AlfredBloque, Barra, Eyebrow } from './alfred';
import { LAMINA_MUNDO } from './mundo-laminas';
import './mundo.css';

/* MAPA DE OFICINA — el CAMINO SERPIENTE.

   Antes esto era una lista vertical de tarjetas de unidad. Una lista comunica
   "catálogo": todo pesa igual y no se sabe dónde estás parado. Un camino
   comunica "vas por acá y falta esto". La diferencia no es estética: es la
   razón por la que alguien vuelve mañana.

   Tres decisiones que sostienen el resto del archivo:

   1. UN NODO POR ESCENA, no por unidad. La unidad es el capítulo del contenido,
      pero la sesión que uno se sienta a hacer es la ESCENA. Contar paradas de
      verdad es lo que hace que el camino se sienta caminable.

   2. LOS CAPÍTULOS SALEN DE tramos.ts, no de acá. El mapa resuelve
      TRAMOS[].unitIds contra las unidades VIVAS del store y pinta solo lo que
      existe. El store arma su catálogo con el mismo recorrido, así que camino y
      currículo no se pueden desincronizar. Está probado dos veces: el Tramo 0
      apareció sin tocar este archivo, y el Tramo 3 —ocho paradas, 68 frases—
      apareció con un import en stores/a1.ts. Cero ids cableados acá.

   3. LO QUE NO EXISTE PERO VA A EXISTIR SE PINTA IGUAL (PENDIENTES → "pronto").
      Ver el camino completo motiva; descubrir que el camino se acaba, no.

   4. EL CAMINO TIENE UNA SALIDA. El Tramo 3 se puede abrir sin hacer la fila
      (ver `atajoDisponible` en stores/a1.ts) y eso se ofrece con una píldora
      dentro de su capítulo, no con un banner arriba. Ver PildoraAtajo.

   El ORDEN de la pantalla se mantiene: métrica → Alfred → UNA acción → el
   camino. Un principiante frente a treinta y tantos nodos no elige: se
   paraliza. Por eso el camino va al final y el CTA arriba.

   SE FUERON LOS GANCHOS ("¿Sabes decir…?"). Eran 7 chips que enrutaban a las
   mismas 7 unidades: con el camino abajo y el CTA arriba pasaban a ser una
   TERCERA forma de elegir lo mismo, que es exactamente la parálisis que esta
   pantalla intenta evitar. Las palabras que perdieron no se perdieron: las
   pusieron las cabeceras de tramo (título + promesa, contenido autorado) y el
   rótulo del nodo donde estás parado.

   SHELL AL PATRÓN CANÓNICO (el de src/views/slang/index.tsx): barra de sección
   con el ← redondo + título mono en --accent, y todo el contenido dentro de una
   <Card> de 640 px que hace de scroller sin pintar barra. La firma de <Mapa/>
   no cambia (a1/index.tsx lo monta igual). */

/* Las mismas dos constantes que SLANG y CHARLA, redeclaradas acá a propósito
   (convención del repo): la vista es una COLUMNA, y el scroll funciona sin
   pintar barra. */
const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* ── Geometría de la serpiente ────────────────────────────────────────────
   NODO 68 y PASO 76 son centro-a-centro: dos nodos consecutivos siempre están
   desfasados 58 px en horizontal, así que la distancia real entre centros es
   hypot(58, 76) = 95.6 px y quedan 27.6 px de carretera visible entre círculo y
   círculo. Con PASO como HUECO (144 de paso) el camino medía 5.300 px de scroll
   en el celular para las mismas paradas: el doble de pulgar por la misma
   información.

   AMPL 58 medido a 390 px (el iPhone de verdad, no un "móvil genérico"): el
   contenedor del camino mide 334 px de ancho útil, o sea 167 de eje a borde. El
   nodo más corrido llega a 58 + 34 = 92, y sobran 75 px de aire de ese lado.
   Nada se sale — verificado con desbordeHorizontal(), scrollWidth 390. */
const NODO = 68;
const PASO = 76;
const AMPL = 58;
const GROSOR = 4; // la carretera va DETRÁS de los nodos; solo asoma en las diagonales

/* Alto de la lámina de región, en px CSS. Es el mismo 240 con el que se hornean
   los WebP (390×240 CSS = 780×480 a dpr 2), y NO AGREGA SCROLL: ocupa los
   primeros 240 px del propio camino del tramo, o sea 3,16 nodos. Un tramo de N
   paradas sigue midiendo N × 76 px y punto. */
const LAMINA_ALTO = 240;

/* La tinta con la que se entinta el color del tramo. Se mezcla en OKLAB CONTRA
   UN GRIS NEUTRO y no contra --card-ink: --card-ink es azulado (hue 265) y
   mezclarlo con el verde del t0 daba un nodo turquesa, o sea el color de otro
   tramo. Un gris sin croma oscurece sin mover el tono. */
const TINTA_NEUTRA = 'oklch(38% 0 0)';

/** cardTheme del contenido → token de card. Nunca coral: en RODEO ese color
    significa error, y una parada del camino no es un castigo. */
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

/* ── El modelo del camino ─────────────────────────────────────────────── */

type EstadoNodo = 'hecho' | 'actual' | 'abierto' | 'bloqueado' | 'pendiente';

type Nodo = {
  key: string;
  /** A dónde enruta el toque. null = parada sin contenido todavía (PENDIENTES). */
  unitId: string | null;
  sceneId: string | null;
  /** De qué tramo es. Lo necesita el "estás acá" para no señalar la oficina
      cuando el usuario se fue de viaje por el atajo. null = unidad huérfana. */
  tramo: A1TramoId | null;
  icono: string;
  estado: EstadoNodo;
  /** Nombre accesible. El círculo es mudo a propósito; el lector de pantalla no. */
  nombre: string;
  /** Solo el nodo donde estás parado lleva rótulo visible. */
  rotulo: { titulo: string; pie: string } | null;
  /** La conversación de esta parada, si ya se ganó. Cuelga AL COSTADO de este
      nodo; no es un eslabón del camino (ver SateliteCoach). */
  coach: { unitId: string; titulo: string } | null;
  /** Desplazamiento horizontal sobre el eje, en px. */
  dx: number;
};

type Capitulo = {
  key: string;
  /** null = unidades que no viven en ningún tramo; van al final SIN cabecera. */
  tramo: A1Tramo | null;
  titulo: string;
  promesa: string;
  color: string;
  hechas: number;
  totales: number;
  nodos: Nodo[];
  /** La salida opcional del camino. Solo la trae el tramo que HOY se puede
      saltar (ver atajoDisponible en stores/a1.ts); el resto va en null. */
  atajo: { texto: string; unitId: string } | null;
  /** Su región va apagada: ni una parada suya está abierta ni hecha. Es el
      corazón del mundo — ver que existen ocho sitios con nombre y que a la
      mayoría todavía no llegaste es lo que hace que avanzar se sienta. */
  niebla: boolean;
};

/* El desfase es senoidal con período 4: 0 → +58 → 0 → −58 → 0…
   La fase se REINICIA en cada capítulo a propósito: así toda cabecera de tramo
   entrega el camino sobre el eje, centrado bajo su título, en vez de arrancar
   en un costado al azar según cuántos nodos traía el capítulo anterior. */
function desfase(k: number): number {
  return Math.round(Math.sin((k * Math.PI) / 2) * AMPL);
}

/** El lado con aire: si el nodo se corrió a la derecha, el rótulo va a la
    izquierda. Medido a 390 px — con dx=+58 quedan 75 px de ese lado y 191 del
    otro, y un rótulo no entra en 75. */
function ladoLibre(dx: number): CSSProperties {
  const borde = NODO / 2 + 8;
  return dx > 0
    ? { right: `calc(50% - ${dx - borde}px)`, maxWidth: `calc(50% + ${dx - borde - 4}px)` }
    : { left: `calc(50% + ${dx + borde}px)`, maxWidth: `calc(50% - ${dx + borde + 4}px)` };
}

function Cabecera({ cap }: { cap: Capitulo }) {
  /* Pegajosa dentro del scroller de la Card, no de la ventana: el ancestro con
     overflow-y-auto es el <div> de adentro y es el más cercano, así que sticky
     se ancla ahí. El -mx-3/px-3 es para que el fondo llegue a los bordes del
     scroller y los nodos pasen POR DEBAJO en vez de asomar por las canaletas. */
  return (
    <div
      className="sticky top-0 z-20 -mx-3 flex items-start gap-2.5 px-3 pt-2.5 pb-2 sm:-mx-4 sm:px-4"
      style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--borde-sutil)' }}
    >
      {/* El azulejo del tramo es un pastel PLENO en los dos temas: mismo caso
          que el nodo `actual` (ver TINTA_NODO), así que lleva --card-ink y la
          clase `suelo-claro`. Sin eso el icono de línea heredaría el
          --text-primary del body y en tema oscuro saldría casi blanco sobre
          menta claro. */}
      <span
        aria-hidden="true"
        className="suelo-claro grid size-8 shrink-0 place-items-center rounded-[11px] text-[1rem]"
        style={{ background: cap.color, color: 'var(--card-ink)' }}
      >
        <IconoTinta emoji={cap.tramo?.icon} px={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display truncate text-[0.95rem] leading-[1.15] font-bold tracking-[-0.02em]">
          {cap.titulo}
        </span>
        <span className="text-[0.74rem] leading-[1.3]" style={{ color: 'var(--text-secondary)' }}>
          {cap.promesa}
        </span>
      </span>
      <span
        className="mt-1 shrink-0 font-mono text-[0.6rem] font-bold tracking-[0.1em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {cap.totales > 0 ? `${cap.hechas}/${cap.totales}` : 'pronto'}
      </span>
    </div>
  );
}

/* ── LA REGIÓN ────────────────────────────────────────────────────────────

   Cada tramo deja de ser una cabecera de capítulo y pasa a ser un SITIO: una
   lámina de tinta y aguada —una rebanada de maqueta vista desde arriba— pegada
   al comienzo de su capítulo, detrás del camino. Detalle completo en
   MUNDO-runbook; lo que hay que saber acá:

   · VA DETRÁS Y NO SE TOCA. Es el primer hijo del contenedor posicionado, así
     que los nodos y la carretera —que vienen después y también están
     posicionados— pintan encima sin necesidad de un solo z-index. Y
     `pointer-events: none` en el CSS: el mapa se sigue tocando igual.

   · NO AGREGA SCROLL. Ocupa los primeros 240 px del camino que ya existía.

   · SE RECORTA AL CAPÍTULO CORTO. El tramo 5 tiene 3 paradas = 228 px, menos
     que la lámina: sin el min() la región se derramaría sobre la cabecera del
     tramo siguiente.

   · EL BORDE DE ARRIBA NO SE VE NUNCA, y no es suerte. La lámina arranca justo
     debajo de la cabecera del tramo, que es `sticky` y OPACA: al scrollear, el
     canto recto del papel se mete por debajo de ella. Por eso el fundido
     horneado en el alfa (mundo.css) es solo por abajo y no hace falta arriba.

   · SIN CABECERA NO HAY REGIÓN. El capítulo 'sueltas' (unidades vivas que no
     caen en ningún tramo) no tiene tramo y por lo tanto no tiene sitio. */
function LaminaRegion({ cap }: { cap: Capitulo }) {
  const src = cap.tramo ? LAMINA_MUNDO[cap.tramo.id] : undefined;
  if (!src) return null;
  return (
    <div
      aria-hidden="true"
      className="mundo-lamina"
      data-region={cap.tramo!.id}
      data-niebla={cap.niebla ? 'si' : 'no'}
      style={{ height: Math.min(LAMINA_ALTO, cap.nodos.length * PASO) }}
    >
      <div className="mundo-lamina__papel" style={{ backgroundImage: `url(${src})` }} />
      <div className="mundo-lamina__niebla" />
    </div>
  );
}

/** Un tramo de carretera entre dos nodos: una barra vertical rotada hacia el
    siguiente centro. Nada de SVG: el eje es un `50%` del contenedor y un
    viewBox con ancho fijo obligaría a escalar el grosor. */
function Carretera({ desde, hasta, y, color }: { desde: number; hasta: number; y: number; color: string }) {
  const dx = hasta - desde;
  /* CSS rota en sentido horario y "abajo" gira hacia la IZQUIERDA, así que para
     apuntar a un dx positivo el ángulo va negado. */
  const ang = -(Math.atan2(dx, PASO) * 180) / Math.PI;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        top: y,
        left: `calc(50% + ${desde}px)`,
        marginLeft: -GROSOR / 2,
        width: GROSOR,
        height: Math.hypot(dx, PASO),
        transformOrigin: 'top center',
        transform: `rotate(${ang}deg)`,
        background: color,
        borderRadius: GROSOR,
      }}
    />
  );
}

/* ── EL NODO DEL COACH ────────────────────────────────────────────────────

   Cuelga al costado del último nodo de la parada, con una línea punteada. NO
   ocupa un eslabón del camino, y eso es la decisión entera:

   · Es una RECOMPENSA, no una obligación. Aparece recién cuando las escenas de
     la parada están cerradas, y quien no lo toca sigue de largo sin haberse
     perdido nada. Metido en la fila obligatoria dejaría de ser un premio y
     pasaría a ser un peaje — y la diferencia se paga en pantalla: quien ELIGE
     entrar aguanta una corrección; quien fue empujado, no.
   · Se ve DISTINTO de una parada. Las paradas son círculos de 68 con el emoji
     de la escena; esto es una píldora con texto y un globo de diálogo. Un
     círculo más en el camino se leería como "la siguiente lección".
   · Va en --accent y no en el color del capítulo. Los tokens card-* son pastel
     claro y viven pensados para llevar tinta oscura ENCIMA; usados como texto
     sobre --bg-surface no pasan contraste en tema claro. El acento sí, en los
     dos temas — y de paso el coach queda visualmente fuera del color del
     capítulo, que es exactamente lo que es.

   SIN CONEXIÓN NO SE ESCONDE. Se pinta apagado y DICE que le falta red. Es lo
   mismo que el mapa ya hace con las paradas futuras (candado + "pronto" en vez
   de desaparecerlas): un camino que cambia de forma según la señal se lee como
   que la app se rompió, y el usuario no tiene forma de saber que era el wifi. */
function SateliteCoach({
  n,
  centro,
  enLinea,
  onTocar,
}: {
  n: Nodo;
  centro: number;
  enLinea: boolean;
  onTocar: (unitId: string) => void;
}) {
  if (!n.coach) return null;
  const tono = enLinea ? 'var(--accent)' : 'var(--text-muted)';
  return (
    <div
      className="pointer-events-none absolute flex items-center"
      style={{
        top: centro - 24,
        height: 48,
        // El satélite va al lado con AIRE: si el nodo se corrió a la derecha,
        // esto se va a la izquierda. Mismo cálculo que el rótulo del "estás acá".
        ...ladoLibre(n.dx),
        flexDirection: n.dx > 0 ? 'row-reverse' : 'row',
      }}
    >
      <span
        aria-hidden="true"
        className="h-0 w-3 shrink-0 border-t-2 border-dashed"
        style={{ borderColor: tono }}
      />
      <button
        type="button"
        data-coach={n.coach.unitId}
        data-coach-red={enLinea ? 'si' : 'no'}
        onClick={() => onTocar(n.coach!.unitId)}
        aria-label={
          enLinea
            ? `Hablar la situación de ${n.coach.titulo}. Es opcional.`
            : `Hablar la situación de ${n.coach.titulo}. Necesita internet y ahora no hay.`
        }
        className="pointer-events-auto inline-flex min-h-11 min-w-0 cursor-pointer items-center gap-1.5 rounded-full border-2 px-3 transition-transform duration-150 active:scale-[0.94]"
        style={{
          borderColor: tono,
          background: enLinea ? 'var(--accent-dim)' : 'var(--chip-bg-fuerte)',
          color: tono,
        }}
      >
        {enLinea ? (
          <MessageCircle className="size-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <WifiOff className="size-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
        )}
        <span className="truncate text-[0.78rem] font-bold">{enLinea ? 'Hablarlo' : 'Sin red'}</span>
      </button>
    </div>
  );
}

function NodoCamino({
  n,
  k,
  color,
  enLinea,
  onTocar,
  onCoach,
}: {
  n: Nodo;
  k: number;
  color: string;
  enLinea: boolean;
  onTocar: (n: Nodo) => void;
  onCoach: (unitId: string) => void;
}) {
  const centro = k * PASO + PASO / 2;
  const apagado = n.estado === 'bloqueado' || n.estado === 'pendiente';

  /* EL COLOR PLENO DEL TRAMO QUEDA PARA UN SOLO NODO: el actual. Con una región
     dibujada debajo, treinta y pico de discos a todo color eran treinta y pico
     de cosas gritando lo mismo y el "estás acá" dejaba de destacar. Lo hecho va
     con el mismo color ENTINTADO: se sigue leyendo de qué tramo es, pero se
     retira medio paso. */
  const relleno =
    n.estado === 'actual'
      ? color
      : n.estado === 'hecho'
        ? `color-mix(in oklab, ${color} 70%, ${TINTA_NEUTRA})`
        : apagado
          ? /* Antes acá iba --chip-bg-fuerte con `opacity: 0.5` encima. Ver
               TINTA_NODO: la opacidad se fue y este token la reemplaza. */
            'var(--chip-bg)'
          : 'var(--bg-surface)';

  /* ── LA TINTA DEL NODO — la deuda que trajo el icono de línea ─────────────

     Con emoji daba igual: el emoji trae su propio color. Con un dibujo de una
     sola tinta que hereda currentColor, un nodo que no fija `color` hereda el
     del body — y el nodo `actual`, que va con el pastel PLENO del tramo, le
     pondría tinta casi blanca sobre durazno claro. El icono desaparece.

     La regla es del SUELO, no del estado: si el disco es pastel claro (pasa en
     los DOS temas, porque los tokens --card-* son pastel en ambos) la tinta es
     --card-ink; si el disco es una superficie del shell, la tinta sigue al
     tema.

     CONTRASTE WCAG MEDIDO SOBRE EL PÍXEL PINTADO, no calculado desde los
     tokens: se recorta la caja del icono de la captura a dpr 3, el suelo es la
     mediana de esa caja (o sea con la aguada y la lámina adentro) y el trazo es
     el percentil 2/98, el que quede más lejos. Oscuro / claro:
       hecho     6,82 / 8,02      actual    11,32 / 13,68
       abierto  17,09 / 17,26     bloqueado  6,62 /  5,54
       pendiente 6,68 /  7,08
     Los cinco pasan AA (4,5:1) en los dos temas; el más flojo es la parada
     cerrada sobre la lámina en tema claro.

     Y LA OPACIDAD DEL 0,5 SE FUE, que es la mitad no obvia del arreglo. Sobre
     papel blanco, un `opacity: 0.5` en el contenedor compone la tinta contra el
     blanco: la luminancia del trazo nunca baja de 0,5 por más oscuro que uno lo
     pinte, así que el máximo alcanzable contra el disco eran 2,7:1 — no hay
     color que lo arregle, hay que sacar la opacidad. Lo apagado ahora se dice
     con los tokens, y NO se ve distinto: --chip-bg tiene casi exactamente el
     alfa que tenía --chip-bg-fuerte al 50% (0,045 contra 0,040 en claro), y lo
     mismo --borde-sutil contra --borde-medio al 50% (0,13 contra 0,12). */
  const sueloPastel = n.estado === 'actual' || n.estado === 'hecho';
  const TINTA_NODO = sueloPastel
    ? 'var(--card-ink)'
    : apagado
      ? /* --text-secondary y NO --text-muted, que es lo que pedía el instinto
           para algo apagado. Motivo medido: el fondo de la parada cerrada
           (--chip-bg) es casi transparente, así que el suelo real es LA LÁMINA
           DE LA REGIÓN que pasa por debajo — papel, no la superficie de la
           tarjeta. Contra ese papel, --text-muted daba 3,94:1 en tema claro (no
           pasa AA); --text-secondary da 5,6:1. La diferencia entre los dos
           tokens es de 8 puntos de L: no se ve como "menos apagado", se ve
           como que se lee. */
        'var(--text-secondary)'
      : 'var(--text-primary)';

  /* ANILLO DE TINTA DE 1 px EN TODO NODO. Sin él, el nodo `abierto` —fondo
     --bg-surface, que en tema claro es blanco puro— desaparece sobre el papel
     de la lámina: blanco sobre papel da ~1,05:1. El borde de 2 px del color del
     tramo no alcanza, porque los pasteles claros sobre papel tampoco contrastan.
     Va como box-shadow y no como outline para que no se lleve el hueco del
     BorderBeam del nodo actual. */
  const anillo = '0 0 0 1px color-mix(in oklch, var(--card-ink) 30%, transparent)';

  return (
    <>
      <button
        type="button"
        data-nodo={n.key}
        data-estado={n.estado}
        aria-label={n.nombre}
        title={n.nombre}
        onClick={() => onTocar(n)}
        className="absolute cursor-pointer rounded-full transition-transform duration-150 active:scale-[0.92]"
        style={{ top: centro - NODO / 2, left: `calc(50% + ${n.dx}px)`, marginLeft: -NODO / 2, width: NODO, height: NODO }}
      >
        <span
          /* `suelo-claro` solo donde el disco es pastel: le dice a la aguada
             que multiplique aunque el tema sea oscuro (tinta.css). Sobre el
             shell la aguada va en `screen` y esta clase la arruinaría. */
          className={cn('relative grid size-full place-items-center rounded-full border-2', sueloPastel && 'suelo-claro')}
          style={{
            borderColor: apagado ? 'var(--borde-sutil)' : color,
            borderStyle: n.estado === 'pendiente' ? 'dashed' : 'solid',
            background: relleno,
            color: TINTA_NODO,
            /* La escala del nodo actual va en el span y no en el botón para que
               el active:scale del toque siga funcionando encima. */
            transform: n.estado === 'actual' ? 'scale(1.06)' : undefined,
            /* Solo el nodo actual se levanta del papel. En tema claro un 0.30
               se veía como una mancha gris alrededor del círculo; 0.20 lo
               levanta igual sin ensuciar. El anillo va en la misma propiedad
               (una sombra de 0 px de desenfoque) porque box-shadow no se
               acumula entre reglas: o van las dos juntas o gana la última. */
            boxShadow: n.estado === 'actual' ? `${anillo}, 0 5px 16px oklch(0% 0 0 / 0.20)` : anillo,
          }}
        >
          {n.estado === 'pendiente' ? (
            /* Sin `style` de color: el candado hereda TINTA_NODO como todo lo
               demás del disco, y así hay un solo sitio que decide la tinta. */
            <Lock className="size-5" strokeWidth={2} aria-hidden="true" />
          ) : (
            /* 26 px de DIBUJO en un disco de 68 (la caja mide 35: la aguada
               desborda el contorno, ver aguada.ts). El concepto que todavía no
               está dibujado cae al emoji de siempre, en la misma caja.

               LA PARADA CERRADA VA SIN AGUADA, y no por gusto: MEDIDO. Con
               aguada, en tema claro el suelo debajo del trazo caía de 0,91 a
               0,66 de luminancia (el pigmento multiplicando) y el contraste del
               icono se hundía a 3,69:1 — debajo de AA. Sin ella sube a 5,0:1.
               Y encima es lo correcto en el dibujo: la parada cerrada se apaga
               justamente para sacarle el color, así que pintar un lavado para
               después grisearlo solo dejaba un manchón. De paso se ahorran dos
               <use> en cada uno de los ~64 nodos apagados del camino.

               `apagado` es lo que reemplaza al viejo `opacity: 0.5` del disco:
               el componente lo aplica SOLO si salió emoji (que trae color
               propio), nunca a la tinta (que ya viene apagada por TINTA_NODO y
               a la que una opacidad le rompería el contraste). Comparado contra
               una captura del árbol anterior: el emoji queda igual que estaba. */
            <IconoTinta emoji={n.icono} px={26} sinAguada={apagado} apagado={apagado} />
          )}

          {/* Insignia: check en lo hecho, candado en lo cerrado. */}
          {n.estado === 'hecho' && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full"
              style={{ background: 'var(--accent)', color: 'var(--bg-surface)' }}
            >
              <Check className="size-3" strokeWidth={3.4} />
            </span>
          )}
          {n.estado === 'bloqueado' && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full border"
              style={{
                background: 'var(--bg-elevated)',
                borderColor: 'var(--borde-sutil)',
                color: 'var(--text-muted)',
              }}
            >
              <Lock className="size-2.5" strokeWidth={2.6} />
            </span>
          )}

          {/* El ÚNICO nodo animado. Treinta y pico de haces a la vez tiran los
              cuadros en un Android de gama media, y además dejarían de señalar
              nada: si todo brilla, nada brilla. */}
          {n.estado === 'actual' && (
            <BorderBeam size={54} duration={5} borderWidth={2.4} colorFrom="var(--aurora-1)" colorTo="var(--aurora-2)" />
          )}
        </span>
      </button>

      {/* Rótulo del nodo donde estás parado: el camino es de círculos mudos a
          propósito, pero "estás acá" sin nombre no dice nada. */}
      {n.rotulo && (
        <span
          /* Alto = el del nodo y centrado por flex: así el rótulo queda a la
             altura del círculo tanto si el título entra en una línea como si
             se va a dos. */
          className="pointer-events-none absolute flex flex-col justify-center gap-0.5"
          style={{ top: centro - NODO / 2, height: NODO, ...ladoLibre(n.dx) }}
        >
          {/* Dos líneas, no elipsis: con dx=0 el rótulo tiene 116 px medidos a
              390, y "Te falta una palabra" necesita 130. Cortarlo dejaba
              "Te falta una palab…", que es peor que un renglón de más. */}
          <span className="line-clamp-2 text-[0.8rem] leading-[1.2] font-bold">{n.rotulo.titulo}</span>
          <span
            className="truncate font-mono text-[0.58rem] font-bold tracking-[0.12em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            {n.rotulo.pie}
          </span>
        </span>
      )}

      <SateliteCoach n={n} centro={centro} enLinea={enLinea} onTocar={onCoach} />

      {/* "pronto": la parada existe en el plan pero todavía no tiene contenido. */}
      {n.estado === 'pendiente' && (
        <span
          className="pointer-events-none absolute flex items-center font-mono text-[0.56rem] font-bold tracking-[0.14em] uppercase"
          style={{ top: centro - NODO / 2, height: NODO, color: 'var(--text-muted)', ...ladoLibre(n.dx) }}
        >
          pronto
        </span>
      )}
    </>
  );
}

/* ── LA PÍLDORA DEL ATAJO ─────────────────────────────────────────────────

   Píldora, no banner, y la diferencia importa. Un banner ocupa el ancho, se
   pone arriba de todo y ANUNCIA: convierte una salida opcional en la cosa más
   grande de la pantalla y empuja a saltarse el camino a quien no viaja a
   ninguna parte. Esto es lo contrario: vive DENTRO del capítulo, debajo de su
   cabecera, del ancho de su propio texto, y solo lo ve quien scrolleó hasta
   acá. Quien no viaja pasa de largo sin haber leído un aviso.

   La línea punteada que baja hasta el primer nodo es lo que lo hace legible
   como DESVÍO. Sin ella la píldora flota y parece un chip de estado; con ella
   se ve entrar al camino por un costado. Punteada y no sólida porque la
   carretera sólida es el orden obligatorio.

   Color: el de la propia tarjeta del tramo (--card-yellow para el viaje) con
   --card-ink encima. Es el mismo par que ya usan los nodos llenos del camino,
   así que la píldora se lee como "esto es el Tramo 3" sin decirlo, y los tokens
   card-* son pastel claro con tinta oscura en los DOS temas — no hay que
   recalcular contraste por tema. */
function PildoraAtajo({ cap, onTocar }: { cap: Capitulo; onTocar: (unitId: string) => void }) {
  if (!cap.atajo) return null;
  return (
    <div className="flex flex-col items-center pt-3">
      <button
        type="button"
        data-atajo={cap.key}
        onClick={() => onTocar(cap.atajo!.unitId)}
        aria-label={`${cap.atajo.texto} Abre ${cap.titulo} sin terminar lo anterior.`}
        className="inline-flex max-w-[286px] cursor-pointer items-center gap-2.5 rounded-[22px] px-4 py-2.5 text-left transition-transform duration-150 active:scale-[0.95]"
        style={{
          minHeight: 44, // el mínimo táctil del repo; el texto solo llega a ~40
          background: cap.color,
          color: 'var(--card-ink)',
          boxShadow: '0 6px 18px oklch(0% 0 0 / 0.20)',
        }}
      >
        <span className="text-[0.8rem] leading-[1.25] font-semibold">{cap.atajo.texto}</span>
        <CornerDownRight className="size-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
      </button>
      <span
        aria-hidden="true"
        className="block h-3 w-0 border-l-2 border-dashed"
        style={{ borderColor: cap.color }}
      />
    </div>
  );
}

function CapituloCamino({
  cap,
  enLinea,
  onTocar,
  onAtajo,
  onCoach,
  onRef,
}: {
  cap: Capitulo;
  enLinea: boolean;
  onTocar: (n: Nodo) => void;
  onAtajo: (unitId: string) => void;
  onCoach: (unitId: string) => void;
  /** Para poder abrir el mapa en el tramo donde estaba el usuario. */
  onRef: (key: string, el: HTMLElement | null) => void;
}) {
  return (
    <section
      className="shrink-0"
      /* Llaves y no arrow-expresión: en React 19 lo que devuelve un ref
         callback se interpreta como su función de limpieza. */
      ref={(el) => {
        onRef(cap.key, el);
      }}
    >
      {cap.tramo && <Cabecera cap={cap} />}
      <PildoraAtajo cap={cap} onTocar={onAtajo} />
      <div className="relative" style={{ height: cap.nodos.length * PASO }}>
        <LaminaRegion cap={cap} />
        {cap.nodos.map((n, k) => {
          if (k === 0) return null;
          const prev = cap.nodos[k - 1]!;
          /* El color de la carretera cuenta el avance: llena hasta donde ya
             llegaste, apagada de ahí en adelante. Un tramo que entra a un nodo
             bloqueado o pendiente va en --borde-sutil.

             LA CARRETERA VA ENTINTADA desde que hay región debajo. Los tokens
             --card-* son pasteles CLAROS en los dos temas (L76–95 en oscuro,
             L84–97 en claro) y la carretera tiene que leerse sobre TRES fondos
             distintos: el papel de la lámina en tema claro (L≈98), la penumbra
             de esa misma lámina en oscuro (L≈40) y --bg-surface debajo de los
             240 px de región (L17 en oscuro, L100 en claro). Un pastel pleno se
             pierde sobre el papel; la tinta pura del runbook §A.7 se perdía
             sobre --bg-surface en oscuro, que es donde vive la mayor parte del
             camino ahora que la región no llega hasta abajo. Entintar el color
             del tramo contra un gris neutro lo deja a media luz: se ve sobre
             los tres, y sigue diciendo de qué tramo es. */
          const color =
            n.estado === 'hecho' || n.estado === 'actual'
              ? `color-mix(in oklab, ${cap.color} 55%, ${TINTA_NEUTRA})`
              : n.estado === 'abierto'
                ? `color-mix(in oklab, ${cap.color} 30%, ${TINTA_NEUTRA})`
                : 'var(--borde-sutil)';
          return (
            <Carretera key={`c-${n.key}`} desde={prev.dx} hasta={n.dx} y={(k - 1) * PASO + PASO / 2} color={color} />
          );
        })}
        {cap.nodos.map((n, k) => (
          <NodoCamino
            key={n.key}
            n={n}
            k={k}
            color={cap.color}
            enLinea={enLinea}
            onTocar={onTocar}
            onCoach={onCoach}
          />
        ))}
      </div>
    </section>
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
  onCoach,
  onRepaso,
  onSeguir,
  onGuardadas,
  onPanico,
}: {
  /** Pack de trabajo activo (A1.2). Sus unidades son el tramo 'job' del camino. */
  pack: JobPack | null;
  onUnidad: (id: string) => void;
  /** Abrir la conversación de una parada. Opcional: nadie llega acá empujado. */
  onCoach: (unitId: string) => void;
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
  const nGuardadas = useA1((s) => s.guardadas.length);
  /* Suscripción explícita también al tramo recordado: manda en el denominador
     de la barra (tramoActivo) y en dónde cae el "estás acá". */
  const tramoVisto = useA1((s) => s.tramoVisto);
  const setView = useApp((s) => s.setView);
  /* En vivo, no al arrancar: el nodo del coach se apaga y se prende con la
     señal sin que nadie recargue nada. */
  const enLinea = useEnLinea();

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
      /* La barra se mide contra el TRAMO ACTIVO, no contra el catálogo entero.
         Medido: con el Tramo 0 adentro el catálogo pasa de 63 frases a 158, y
         las mismas 12 frases dominadas caían de 19% a 8% — la barra diría que
         retrocediste por haber agregado contenido. */
      tramo: progresoDelTramo(),
      retomar: puntoDeRetomar(),
    }),
    [srs, progreso, unidades, tramoVisto],
  );

  /* ── El camino ──────────────────────────────────────────────────────────
     Se arma resolviendo TRAMOS contra las unidades VIVAS. Tres casos por cada
     id de tramos.ts:
       · la unidad existe en el store  → un nodo por escena suya
       · el id está en PENDIENTES      → un nodo "pronto" (no abre nada)
       · ninguna de las dos            → todavía no llegó al catálogo; no se
                                         pinta (hoy no queda ninguno así: lo que
                                         falta está todo en PENDIENTES)
     Un capítulo que se queda sin nodos no se pinta: una cabecera sola no es un
     capítulo, es un hueco. */
  const camino = useMemo(() => {
    const vivas = new Map(unidades.map((u) => [u.id, u]));
    const enAlgunTramo = new Set(TRAMOS.flatMap((t) => t.unitIds));
    /* Las unidades que no aparecen en ningún `unitIds` de tramos.ts: hoy, las
       del pack de trabajo. El tramo 'job' se declara con `unitIds: []` y el
       comentario "lo llena el pack activo", así que resolver TRAMOS a secas
       nunca las encuentra y hay que adoptarlas acá.
       El store ya las pone en la MISMA posición (construirCatalogo mete el pack
       en el hueco del Tramo 5), o sea que camino y currículo coinciden: el
       trabajo va después de "Viaje de trabajo" y antes de "Tu vida afuera", no
       al final de todo. Si algún día tramos.ts listara los ids del pack, esta
       rama deja de correr sola. */
    const huerfanas = unidades.filter((u) => !enAlgunTramo.has(u.id));
    let adoptadas = false;

    const hechas = new Set(progreso.doneScenes);
    const caps: Capitulo[] = [];

    const nodosDe = (ids: readonly string[], tramo: A1TramoId | null): Nodo[] => {
      const out: Nodo[] = [];
      for (const id of ids) {
        const u = vivas.get(id);
        if (u) {
          const abierta = estaDesbloqueada(u.id);
          u.scenes.forEach((s, i) => {
            out.push({
              key: s.id,
              unitId: u.id,
              sceneId: s.id,
              tramo,
              icono: s.icon || u.icon || u.emoji,
              estado: !abierta ? 'bloqueado' : hechas.has(s.id) ? 'hecho' : 'abierto',
              nombre: `${u.title_es} · ${s.title_es} (escena ${i + 1} de ${u.scenes.length})`,
              rotulo: null,
              coach: null,
              dx: 0,
            });
          });
          /* La conversación se GANA: cuelga del último nodo de la parada y solo
             cuando sus escenas están todas cerradas. Antes de eso no existe —
             ofrecer hablar una situación que todavía no se enseñó es pedirle a
             alguien que adivine. */
          const ultimo = out[out.length - 1];
          if (ultimo && ultimo.unitId === u.id && tieneCoach(u) && escenasHechas(u)) {
            ultimo.coach = { unitId: u.id, titulo: u.title_es };
          }
        } else if (PENDIENTES.has(id)) {
          /* PENDIENTES son ids pelados: el contenido todavía no existe, así que
             no hay título que mostrar. El chip "pronto" y la cabecera del tramo
             dicen lo suficiente; inventarle un nombre sería inventar contenido. */
          out.push({
            key: id,
            unitId: null,
            sceneId: null,
            tramo,
            icono: '',
            estado: 'pendiente',
            nombre: 'Parada que todavía no está lista',
            rotulo: null,
            coach: null,
            dx: 0,
          });
        }
      }
      return out;
    };

    const empujar = (
      key: string,
      tramo: A1Tramo | null,
      titulo: string,
      promesa: string,
      color: string,
      nodos: Nodo[],
      atajo: Capitulo['atajo'] = null,
    ) => {
      if (!nodos.length) return;
      nodos.forEach((n, k) => (n.dx = desfase(k)));
      const reales = nodos.filter((n) => n.sceneId);
      caps.push({
        key,
        tramo,
        titulo,
        promesa,
        color,
        hechas: reales.filter((n) => n.estado === 'hecho').length,
        totales: reales.length,
        nodos,
        atajo,
        /* Se mira 'abierto' y no 'actual' porque el nodo actual todavía no
           existe: se elige más abajo, y sale justamente de los abiertos. */
        niebla: !nodos.some((n) => n.estado === 'hecho' || n.estado === 'abierto'),
      });
    };

    for (const t of TRAMOS) {
      let ids: readonly string[] = t.unitIds;
      if (t.branch === 'job' && ids.length === 0 && huerfanas.length) {
        ids = huerfanas.map((u) => u.id);
        adoptadas = true;
      }
      /* El pack sabe mejor que el tramo genérico de qué va TU trabajo. */
      const esJob = t.branch === 'job' && !!pack;
      /* El atajo salta a la PRIMERA parada viva del tramo, no a una elegida a
         dedo: el orden del contenido es el orden del viaje (aeropuerto primero,
         migración segunda) y mandar a otra parte sería reordenarlo por la
         puerta de atrás. `atajo_es` puede no estar aunque el tramo sea 'viaje',
         y sin texto no hay píldora: el copy es del contenido, no de la vista. */
      const destino = t.atajo_es && atajoDisponible(t.id) ? ids.find((id) => vivas.has(id)) : undefined;
      empujar(
        t.id,
        t,
        esJob ? `${t.title_es} · ${pack!.nombre_es}` : t.title_es,
        esJob ? pack!.promesa_es : t.promesa_es,
        tokenTema(t.cardTheme),
        nodosDe(ids, t.id),
        destino ? { texto: t.atajo_es!, unitId: destino } : null,
      );
    }

    // Red de seguridad: una unidad viva que no cayó en ningún tramo se pinta
    // igual, al final y sin cabecera. Esconderla sería perder progreso a la vista.
    if (!adoptadas && huerfanas.length) {
      empujar(
        'sueltas',
        null,
        '',
        '',
        tokenTema(huerfanas[0]!.cardTheme),
        nodosDe(huerfanas.map((u) => u.id), null),
      );
    }

    /* Dónde estás parado, en este orden: la escena que dejaste a medias (así el
       camino y el CTA "Seguí donde ibas" señalan lo mismo) → la primera abierta
       del TRAMO donde estabas → la primera abierta de todo el camino. Uno solo,
       siempre.

       El escalón del medio lo trajo el atajo. Quien se salta la fila deja los
       tramos 1 y 2 abiertos y sin hacer, y como van ANTES en el camino,
       `abiertos[0]` señalaba "estás acá" en el pasillo de la oficina mientras la
       persona estaba estudiando migración. El marcador tiene que estar donde
       está el usuario, no donde lo dejó el orden del array. */
    const abiertos = caps.flatMap((c) => c.nodos).filter((n) => n.estado === 'abierto');
    const medias = puntoDeRetomar()?.scene.id;
    const enSuTramo = tramoActivo();
    const actual =
      (medias && abiertos.find((n) => n.sceneId === medias)) ||
      (enSuTramo && abiertos.find((n) => n.tramo === enSuTramo)) ||
      abiertos[0];
    if (actual) {
      actual.estado = 'actual';
      const u = vivas.get(actual.unitId!);
      const i = u ? u.scenes.findIndex((s) => s.id === actual.sceneId) : -1;
      /* El rótulo lleva el título de la ESCENA, no el de la unidad: el nodo ES
         la escena, y los títulos de unidad ("Tu primer día: llegar y saludar")
         no entran en los 180 px de rótulo — se cortaban con elipsis. */
      actual.rotulo = {
        titulo: (i >= 0 ? u!.scenes[i]!.title_es : '') || 'Sigue por acá',
        pie: u && i >= 0 ? `estás acá · ${i + 1}/${u.scenes.length}` : 'estás acá',
      };
    }

    const nodos = caps.reduce((a, c) => a + c.nodos.length, 0);
    return { caps, nodos, paradas: caps.reduce((a, c) => a + c.totales, 0) };
  }, [unidades, progreso, pack, tramoVisto]);

  const n = Math.min(datos.due, TOPE_VENCIDOS);

  const saludo =
    datos.due > 0
      ? 'Buenas. Hoy toca repaso de pasillo: ' +
        n +
        (n === 1 ? ' frase' : ' frases') +
        ' para refrescar' +
        (datos.hayNuevos ? ' y algo nuevo.' : '.') +
        ' ¿Le entramos?'
      : datos.hayNuevos
        ? 'Todo al día. Nada que repasar hoy — arranquemos algo nuevo, sin prisa.'
        : 'Vas al día. Cuando quieras repasamos lo que ya tienes, sin prisa.';

  const pct = datos.tramo.pct;

  /* Toque en un nodo. Las unidades cerradas NO se filtran acá: abrirUnidad()
     (a1/index.tsx) ya avisa con su toast y no navega, y tener el aviso en un
     solo lugar evita que el mapa y la raíz digan cosas distintas.

     El tramo se anota ANTES de navegar y solo cuando la parada existe: tocar un
     candado no es "mudarse" a ese tramo, es chocarse con él. */
  function tocarNodo(nodo: Nodo) {
    if (nodo.estado === 'pendiente' || !nodo.unitId) {
      toast('Esa parada todavía no está lista. Va en camino.');
      return;
    }
    if (nodo.tramo) useA1.getState().verTramo(nodo.tramo);
    onUnidad(nodo.unitId);
  }

  /** Tomar el atajo es exactamente tocar la primera parada del tramo: mismo
      camino, misma navegación. Lo único que agrega es mudar el tramo activo —
      si no, la barra seguiría midiendo la oficina en el viaje. */
  function tocarAtajo(cap: Capitulo, unitId: string) {
    if (cap.tramo) useA1.getState().verTramo(cap.tramo.id);
    onUnidad(unitId);
  }

  /* Sin red el nodo NO desaparece: se toca y dice qué le falta. El resto de la
     ruta —las escenas, el repaso, el salvavidas— funciona sin señal, así que el
     aviso tiene que decir que lo que falla es ESTO y no la app entera; si no,
     el usuario cierra y no vuelve a intentar en el bus. */
  function tocarCoach(unitId: string) {
    if (!enLinea) {
      toast('Esta conversación necesita internet. El resto de la ruta funciona sin señal.', 4200);
      return;
    }
    onCoach(unitId);
  }

  /* ── ABRIR DONDE ESTABA ──────────────────────────────────────────────────
     Con el Tramo 3 adentro el camino son 52 nodos. Volver del viaje y tener que
     arrastrar el pulgar por toda la oficina hasta el aeropuerto es la clase de
     fricción que se paga en una apertura menos por día.

     useLayoutEffect y no useEffect: se posiciona antes del primer pintado, si
     no se ve el salto. Y una sola vez por montaje (`yaUbico`), porque el memo
     del camino se recalcula y no se puede estar arrastrando al usuario cada vez
     que cambia algo.

     DOS CASOS EN LOS QUE NO CORRE, los dos a propósito:
       · sin tramo recordado (nadie entró nunca a una parada) — esa persona
         tiene que ver el CTA del día y a Alfred arriba, que es todo el orden de
         esta pantalla.
       · si el destino ya es el primer capítulo — no hay nada que recuperar y el
         scroll solo escondería el CTA.

     El DESTINO no es `tramoVisto` pelado sino el tramo activo (que arranca
     siendo el recordado y se corre solo cuando ese tramo se termina). Si se
     usara el recordado a secas, alguien que cerró el viaje entero abriría el
     mapa clavado en un capítulo con todos los checks puestos mientras la barra
     de arriba ya está midiendo otro. `tramoVisto` sigue siendo la LLAVE —quién
     merece el scroll— y `tramoActivo` es el DESTINO. */
  const scroller = useRef<HTMLDivElement | null>(null);
  const secciones = useRef(new Map<string, HTMLElement>());
  const yaUbico = useRef(false);
  const destino = tramoVisto ? datos.tramo.tramo?.id : undefined;

  useLayoutEffect(() => {
    if (yaUbico.current || !destino || camino.caps[0]?.key === destino) return;
    const cont = scroller.current;
    const sec = secciones.current.get(destino);
    if (!cont || !sec) return;
    yaUbico.current = true;
    /* Por rects y no por offsetTop: el scroller no es el offsetParent (la Card
       sí, que es la que tiene `relative`), así que offsetTop mediría contra otra
       caja. La diferencia de rects es exacta sin importar quién posiciona. */
    cont.scrollTop += sec.getBoundingClientRect().top - cont.getBoundingClientRect().top;
  }, [camino, destino]);

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
          Ruta · con Alfred
        </span>
      </div>

      {/* ── La tarjeta: un solo scroller para todo el mapa ── */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        {/* pt-0 y el respiro de arriba movido al primer hijo: medido con el
            arnés, Chrome ancla las cabeceras `sticky` al borde del CONTENT box
            del scroller, no al del padding box. Con `pt-4` acá, `top: 0` las
            clavaba 16 px más abajo y por esa franja se veían pasar los nodos
            por encima de la cabecera. */}
        <div
          ref={scroller}
          tabIndex={0}
          className={cn('flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 pt-0 pb-4 sm:px-4', SIN_BARRA)}
        >
          {/* ── Métrica estrella: capacidad, no puntos ── */}
          <div className="flex shrink-0 flex-col gap-2 pt-4">
            {/* El rótulo del tramo no es decoración: es lo que hace honesta a la
                barra. Sin él, un 8% sin escala se lee como "vas mal" en vez de
                "vas por acá en este tramo". Una sola cifra en pantalla — la
                fracción del tramo se omite a propósito para no competir con el
                "ya te salen solas" de abajo, que es el número que importa. */}
            {datos.tramo.tramo && (
              <span
                className="font-mono text-[0.58rem] font-bold tracking-[0.16em] uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                <span aria-hidden="true">{datos.tramo.tramo.icon}</span> {datos.tramo.tramo.title_es}
              </span>
            )}
            <Barra pct={pct} />
            <p className="text-[0.82rem]" style={{ color: 'var(--text-secondary)' }}>
              {datos.m.salen > 0 ? (
                <>
                  Ya te salen solas: <strong style={{ color: 'var(--text-primary)' }}>{datos.m.salen}</strong>
                </>
              ) : (
                'Apenas arrancas — pronto se te van saliendo solas.'
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
                principal={`${n}${n === 1 ? ' frase lista' : ' frases listas'} para refrescar`}
                accion="Repasar →"
                onClick={onRepaso}
              />
            ) : datos.hayNuevos ? (
              <CtaGrande
                conHaz
                eyebrow="Todo al día"
                principal="Nada que repasar — arranquemos algo nuevo"
                accion="Arrancar →"
                onClick={onRepaso}
              />
            ) : null}

            {datos.retomar && (
              <CtaGrande
                eyebrow="Sigue donde ibas"
                principal={`${datos.retomar.unit.title_es} · escena ${datos.retomar.sceneNum}/${datos.retomar.sceneTotal}`}
                accion="Seguir →"
                onClick={onSeguir}
              />
            )}
          </div>

          {/* ── EL CAMINO ── */}
          {/* data-nodos: el arnés de QA cuenta los nodos pintados contra las
              escenas del catálogo sin tener que adivinar por selectores. */}
          <div className="flex shrink-0 flex-col" data-camino data-nodos={camino.nodos}>
            <div className="pb-1">
              <Eyebrow>Tu camino · {camino.paradas} paradas</Eyebrow>
            </div>
            {camino.caps.map((cap) => (
              <CapituloCamino
                key={cap.key}
                cap={cap}
                enLinea={enLinea}
                onTocar={tocarNodo}
                onAtajo={(unitId) => tocarAtajo(cap, unitId)}
                onCoach={tocarCoach}
                onRef={(k, el) => {
                  if (el) secciones.current.set(k, el);
                  else secciones.current.delete(k);
                }}
              />
            ))}
          </div>

          {/* ── Pie: lo guardado y el salvavidas ── */}
          <div className="flex shrink-0 flex-col gap-2.5 pt-1 pb-2">
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
