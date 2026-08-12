/* LA MARCA — isotipo y lockup de HABLARTE.

   Vive aparte y no dentro de una vista porque lo consumen dos sitios con
   reglas distintas: el gate (la puerta de entrada, donde la marca SÍ se
   muestra) y header.tsx.

   ⚠ Regla 3 del contrato visual: dentro de la app NO hay header de marca en
   ninguna pantalla — la única cabecera es FilaSuperior (menú + tema), sin
   wordmark. Así que el lockup se ve en el GATE y en ningún otro lado. Si algún
   día vuelve un header de marca, la pieza ya está aquí y no hay que redibujarla. */

/* El isotipo reducido a vector.

   NO es el PNG de la marca, y no por comodidad: ese arte es pintado
   —degradados, biselado, textura— y medido en captura MUERE a tamaño chico. Se
   lee bien de 96px para arriba, aguanta a 60, y a 44/30 es un borrón naranja
   sin puerta reconocible. El PNG se queda para los iconos de instalación
   (icons/), donde sobran píxeles.

   De tres reducciones probadas a 30/40/56/80px, esta es la que aguanta: jamba
   a TRAZO + hoja RELLENA adentro. La silueta de una sola masa se lee como
   página, y la de dos tonos al 50% se desvanece: hace falta el contraste
   hueco/lleno para que el escorzo siga leyéndose como puerta abierta. */
export function MarcaHablarte({ size = 26 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      className="text-brand shrink-0"
    >
      {/* el marco de la jamba */}
      <rect x="12.8" y="4" width="14.2" height="24" rx="2.2" />
      {/* la hoja abierta hacia el espectador */}
      <path d="M12.8 4 L21.5 8.4 V23.6 L12.8 28 Z" fill="currentColor" stroke="none" />
      {/* la onda que sale por la puerta */}
      <rect x="8.3" y="11.6" width="2.4" height="8.8" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="4.6" y="13.9" width="2.4" height="4.2" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Isotipo + wordmark en una línea. El wordmark va en Cormorant Garamond
   (--font-wordmark): alto contraste y caja ancha, como la marca. El tracking
   ancho es parte del logotipo, no decoración — sin él la palabra se apelmaza y
   deja de parecerse a la marca. */
export function LockupHablarte({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2.5 ${className}`}>
      <MarcaHablarte size={size} />
      <span
        className="font-wordmark leading-none font-light tracking-[0.18em]"
        style={{ fontSize: `${size * 0.62}px` }}
      >
        HABLARTE
      </span>
    </div>
  );
}
