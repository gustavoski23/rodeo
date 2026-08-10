/* <IconoTinta> — el icono de una escena, dibujado a tinta y aguada.

   CÓMO SE USA
     1. Montar <TintaDefs/> UNA vez donde vivan los iconos (hoy: views/a1/
        index.tsx, la raíz del módulo). Ahí están las tres manchas y el filtro de
        pluma; sin eso los <use> apuntan a la nada y los iconos salen sin aguada.
        Va en la raíz del MÓDULO y no en App.tsx a propósito: A1 es un chunk
        lazy, y meter los defs en App le pasaría el peso al arranque de quien
        nunca abre la ruta. Si algún día otra vista pinta iconos de tinta, sube.
     2. En sitio:  <IconoTinta emoji={s.icon} px={18} />
        Se le pasa el EMOJI que ya tiene el contenido. Si el concepto está
        dibujado (conceptos.ts) sale la tinta; si no, sale el emoji de siempre.

   POR QUÉ EL RESPALDO A EMOJI NO ES UNA CORTESÍA
     Hay 8 conceptos dibujados y ~115 emoji en el contenido. Sin respaldo, el
     94% del camino serían huecos hasta que alguien termine el set. Con
     respaldo, el set se puede llenar de a un emoji por vez y la app nunca está
     rota en el medio.

   POR QUÉ EL DIBUJO SE PASA COMO COMPONENTE Y NO COMO NOMBRE
     Para que el tree-shaking siga funcionando. Con `<IconoTinta nombre="coffee"/>`
     haría falta un mapa nombre→componente, y ese mapa referencia los 4014
     iconos de lucide: el bundle se lleva el paquete entero. Con el componente
     importado en conceptos.ts, rolldown solo mete los que se usan de verdad.
     Medido en el careo: 8 iconos = +1,95 kB gzip; 109 = +12,58 kB gzip. */

import { useId, type ReactNode } from 'react';

import { MANCHAS, PLUMA, PLUMA_DESDE_PX, VB, FACTOR_CAJA, grosor, sortear, transformMancha } from './aguada';
import { buscarConcepto, type Trazo } from './conceptos';
import './tinta.css';

/* ── Los defs, una sola vez por módulo ─────────────────────────────────────
   Las tres manchas se pagan una vez y las referencian todos los iconos con
   <use>. Si cada icono llevara su path inline, cincuenta nodos del mapa serían
   ~60 kB de DOM repetido y el navegador rasterizaría cincuenta paths distintos
   en vez de reutilizar uno. */
export function TintaDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {Object.entries(MANCHAS).map(([k, d]) => (
          <path key={k} id={`tinta-m-${k}`} d={d} />
        ))}
        <filter id="tinta-pluma" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={PLUMA.frecuencia}
            numOctaves={PLUMA.octavas}
            seed="7"
            result="ruido"
          />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale={PLUMA.desvio} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

export function IconoTinta({
  emoji,
  px = 18,
  /* Apaga la aguada y deja la tinta sola. Para sitios donde el icono ya vive
     encima de algo con color propio y una mancha más sería ruido. */
  sinAguada = false,
  /** "Este icono está apagado" (una parada cerrada, por ejemplo).
      SE APAGA DISTINTO SEGÚN QUÉ SALIÓ, y por eso es una prop y no algo que
      resuelva quien llama: la TINTA hereda currentColor, así que el contenedor
      ya la apagó eligiendo el color y tocarla de nuevo solo le rompería el
      contraste. El EMOJI del respaldo trae color propio y no se entera de
      nada — sin esto es lo más vivo de una parada cerrada. Medido comparando
      capturas contra el árbol anterior: el emoji iba a `grayscale(1)` con
      `opacity: 0.5` heredada del disco, y estos dos valores lo dejan idéntico
      a como estaba. */
  apagado = false,
  /** Dibujo puesto a mano, para un sitio suelto que no quiere pasar por el
      mapa de conceptos. Gana sobre lo que diga conceptos.ts. */
  trazo: trazoForzado,
  className,
  style,
}: {
  /** El icono tal cual lo guarda el contenido. Puede ser cualquier emoji. */
  emoji: string | undefined | null;
  /** Tamaño del DIBUJO. La caja que ocupa es un tercio mayor (ver abajo). */
  px?: number;
  sinAguada?: boolean;
  apagado?: boolean;
  trazo?: Trazo;
  className?: string;
  style?: React.CSSProperties;
}) {
  /* useId ANTES de cualquier salida temprana: el respaldo a emoji no puede
     saltarse un hook o React se queja al cambiar de rama (un emoji sin dibujar
     que después se dibuja es exactamente eso). */
  const uid = useId();

  const concepto = buscarConcepto(emoji);
  const Trazo = trazoForzado ?? concepto?.trazo;
  const propio: ReactNode = trazoForzado ? undefined : concepto?.propio;

  /* La CAJA es un tercio más grande que la TINTA. No es un descuido: la aguada
     tiene que desbordar el dibujo y el viewBox de 24 la recortaba en recto, que
     es lo que la volvía una calcomanía. Ver el comentario de VB en aguada.ts. */
  const caja = Math.round(px * FACTOR_CAJA);

  /* ── EL RESPALDO ──
     Mismo hueco que ocuparía la tinta, para que el día que el concepto se
     dibuje la fila no se mueva ni un píxel. `leading-none` porque el emoji trae
     interlineado propio y sin esto el glifo se va del centro del disco. */
  if (!Trazo && !propio) {
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: caja,
          height: caja,
          fontSize: px,
          lineHeight: 1,
          ...(apagado ? { filter: 'grayscale(1)', opacity: 0.5 } : null),
          ...style,
        }}
        data-tinta="respaldo"
      >
        {emoji}
      </span>
    );
  }

  const s = sortear(concepto?.clave ?? emoji ?? 'sin-nombre');
  const g = grosor(px);
  const conPluma = px >= PLUMA_DESDE_PX;

  return (
    <svg
      className={className}
      width={caja}
      height={caja}
      viewBox={`${VB.min} ${VB.min} ${VB.lado} ${VB.lado}`}
      fill="none"
      aria-hidden="true"
      /* `isolation` acota el mix-blend-mode de la aguada a este SVG. Sin esto,
         multiply se lleva por delante lo que haya detrás en la página (la
         sombra del nodo, el borde del BorderBeam) y se ven halos sucios. */
      style={{ isolation: 'isolate', ...style }}
      /* El QA cuenta iconos entintados contra respaldos sin adivinar por
         selectores; `uid` de paso garantiza que dos iconos del mismo concepto en
         la misma pantalla (pasa: el mapa detrás de una portada) no compartan
         identidad en el DOM. */
      data-tinta={uid}
    >
      {!sinAguada && (
        <g className="tinta-agua">
          <use
            href={`#tinta-m-${s.mancha}`}
            transform={transformMancha(s, 'sangrado')}
            className={`tinta-lav tinta-${s.tono} tinta-sangrado`}
          />
          <use
            href={`#tinta-m-${s.mancha}`}
            transform={transformMancha(s, 'charco')}
            className={`tinta-lav tinta-${s.tono} tinta-charco`}
          />
        </g>
      )}

      <g transform={`rotate(${s.giroTinta.toFixed(2)} 12 12)`} filter={conPluma ? 'url(#tinta-pluma)' : undefined}>
        {/* El dibujo se renderiza a 24 dentro del viewBox de 32, así que queda
            centrado en 12,12 igual que la mancha. width/height van en unidades
            de usuario, no en píxeles de pantalla. El color NO se fija acá: es
            currentColor y lo decide el contenedor, que es lo que hace que el
            mismo icono sirva sobre el shell oscuro y sobre un disco pastel. */}
        {Trazo ? (
          <Trazo className="tinta-trazo" width={24} height={24} x={0} y={0} strokeWidth={g} />
        ) : (
          <g className="tinta-trazo" strokeWidth={g}>
            {propio}
          </g>
        )}
      </g>
    </svg>
  );
}
