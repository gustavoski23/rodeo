import { motion } from 'motion/react';
import { ArrowLeft, Lightbulb } from 'lucide-react';

import { GlassButton, GlassStyles } from '@/components/ui/sign-up';

import { AlfredAvatar, Puntos } from './alfred';

/* Cromo del loop — port de paintEscenaShell (public/js/a1-office.js:620-641).
   Es el MISMO en la escena, en el repaso y en la misión TBLT a propósito: el
   usuario tiene que sentir que sigue en el mismo lugar aunque cambie el
   ejercicio. Cuatro cosas y ninguna más: salir, dónde voy, el salvavidas y
   Alfred ahí, mirando. */

export function Cabecera({
  activo,
  total,
  sub,
  onSalir,
  onPanico,
}: {
  activo: number;
  total: number;
  /** Línea chica bajo los puntos (el "PASO 3/6"). */
  sub?: string;
  onSalir: () => void;
  onPanico: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 pb-4">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={onSalir}
        /* Dice MAPA porque va al mapa (onSalir={alMapa} en views/a1/index.tsx),
           no al Home. Decía "Volver al inicio" y mentía: quien lo tocaba
           esperando salir del módulo se quedaba a medio camino, y en teléfono
           —sin navbar dentro de la feature— ese ← es lo único que se oye. */
        aria-label="Volver al mapa de la ruta"
        className="rd-toque-44 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
      >
        <ArrowLeft size={17} strokeWidth={2} />
      </motion.button>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <Puntos activo={activo} total={total} />
        {sub && (
          <span className="font-mono text-[0.56rem] tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </span>
        )}
      </div>

      {/* El salvavidas vive DENTRO del loop: el momento de necesitarlo es justo
          este. Era un aro salvavidas y pasó a ser la BOMBILLA de vidrio de
          CHARLA — el mismo mando, el mismo lenguaje visual en las dos partes de
          la app. Y el bombillo dice mejor lo que hace: no es una emergencia
          náutica, es "dame una idea de qué decir".

          `vidrio-tema` + <GlassStyles/> van acotados a este botón y no a la
          pantalla: la clase declara --background/--foreground CRUDAS, y soltarla
          en la raíz del módulo se las filtraría a todo lo que hay debajo. */}
      <span className="vidrio-tema relative inline-flex shrink-0 items-center justify-center">
        <GlassStyles />

        {/* EL "ENCENDIDO". Un halo cálido que respira, por OPACIDAD y no por
            escala: en el teléfono MODO_LIGERO fuerza reducedMotion:'always'
            (App.tsx), que apaga las animaciones de transformada pero deja vivas
            las de opacidad y color. Un latido por `scale` sencillamente no
            existiría en el dispositivo para el que se hizo. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: '0 0 0 1px oklch(85% 0.16 85 / 0.35), 0 0 16px 2px oklch(85% 0.16 85 / 0.45)' }}
          animate={{ opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <GlassButton
          type="button"
          size="icon"
          onClick={onPanico}
          aria-label="Dame una idea de qué decir"
          /* El filamento en ámbar: es lo que lo lee como PRENDIDO y no como un
             icono más. El color va en el contenido, no en el vidrio, para no
             pelearse con el <style> que inyecta GlassStyles. */
          contentClassName="text-[oklch(88%_0.15_85)]!"
        >
          <Lightbulb className="size-4" />
        </GlassButton>
      </span>
      <AlfredAvatar size={34} />
    </div>
  );
}
