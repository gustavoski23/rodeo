import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { useToast, type ToastItem } from '@/stores/toast';

/* Píldora glass de aviso. Estilo del viejo: glass, radio 100, sombra larga.

   ── POSICIÓN: ARRIBA, en TODAS las pantallas ──────────────────────────────
   Estuvo abajo (y arriba solo dentro de una sesión de charla) porque ahí está
   el pulgar y ahí vivía la tab bar. Medido a 390px en la RUTA, en el beat de
   palabra: el toast caía en y 681..748 y el CTA «Siguiente palabra →» —la
   ÚNICA salida de esa pantalla— en 708..760. Solape: 350×40 px, el 76.9% del
   área del botón.

   Y no era una rareza de esa vista: la excepción `enSesion` que había acá ya
   existía por LO MISMO (el mic héroe del dock de voz ocupa esa franja y un
   error de red tapaba el botón justo cuando hay que reintentar). O sea que la
   franja de abajo es donde esta app pone sus mandos principales, en sesión y
   fuera de ella. Mejor una regla que una excepción por vista: el aviso no vive
   ahí. Arriba lo que puede tapar es la fila Menu + toggler de tema (medido:
   14..62 y 18..58) — navegación, nunca el único camino para avanzar, y encima
   siguen tocables porque el aviso ya no recibe el puntero (ver abajo).

   Si alguien vuelve a moverlo: FirstTip (first-tip.tsx) fuera de sesión
   aterriza en --rd-tip-arriba, que TALK publica con el borde real de su barra
   —medido, 174px— así que con el toast en 14..60 no se pisan. Con offsets
   nuevos, volver a medirlo.

   LO QUE SE PIERDE, dicho de frente: con el menú ☰ ABIERTO el aviso le pinta
   encima los primeros ~46px (el panel del liquid-morph baja desde y=14 y es
   z-60 contra el z-200 de esta capa). Es una ventana estrecha —el menú lo abre
   el usuario a propósito y los avisos duran 1.5-6 s— y sigue siendo mucho más
   barato que dejar sin salida a la lección. No se pudo comprobar en captura:
   el morph es GSAP y en headless no se despliega.

   ── PUNTERO: el aviso NO recibe eventos ───────────────────────────────────
   Un `role="status"` es un aviso, no un mando. Medido con page.touchscreen
   (toque real, CDP) sobre el centro del CTA con el toast encima: la lección NO
   avanzaba — el tap se lo comía la píldora, que lo gastaba en cerrarse a sí
   misma. Por eso se fue el onClick de descartar y el pointer-events-auto: la
   píldora hereda el `pointer-events: none` del contenedor y el toque pasa de
   largo a lo que haya debajo. Un aviso que se cierra solo a los 2.6-6 s no
   necesita mando; el mando le costaba el toque a la pantalla entera. Si algún
   día un toast lleva acción propia, el `pointer-events-auto` va en ESE botón,
   nunca en la píldora. */

function Toast({ item }: { item: ToastItem }) {
  const dismiss = useToast((s) => s.dismiss);

  useEffect(() => {
    const h = setTimeout(() => dismiss(item.id), item.ms);
    return () => clearTimeout(h);
  }, [item.id, item.ms, dismiss]);

  return (
    <motion.div
      layout
      role="status"
      // Baja desde el borde por el que aparece, que ahora es siempre el de arriba.
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="max-w-[min(92vw,420px)] rounded-full border px-[22px] py-3 text-center text-[0.85rem] font-semibold backdrop-blur-xl"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--borde-sutil)',
        color: 'var(--text-primary)',
        boxShadow: '0 16px 40px oklch(0% 0 0 / 0.5)',
      }}
    >
      {item.msg}
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      /* pointer-events-none manda sobre toda la capa: es lo que hace que el
         toque llegue al CTA de abajo. La píldora ya no lo sobreescribe. */
      className="pointer-events-none fixed inset-x-0 top-[calc(14px+env(safe-area-inset-top))] z-[200] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Toast key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
