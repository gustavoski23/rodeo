import { useEffect, useRef } from 'react';

/* Fondo "Orbit Sweep" — la gradiente Custom de 21st.dev que aprobó Gus, con
   SU receta de movimiento exacta (params del export: speed 81, amount 55,
   sin reverse):

     ph   = t * 0.81            (reloj en segundos por rAF)
     spin = ph * 1              (dir = 1)
     deg  = 0 + spin * 60 * 0.55   → barrido continuo, SIN Math.round
                                     (cuantizar el ángulo es lo que hace que
                                      el giro se vea a saltos)

   En ph = 0 la modulación es exactamente 0: el primer frame es el CSS
   estático (`from 0deg`), así que arrancar la animación no pega un salto. */

export const ORBITA_PALETA: readonly { hex: string; pos: number }[] = [
  { hex: '#FF5F6D', pos: 0 },   // Rose
  { hex: '#FFC371', pos: 25 },  // Amber
  { hex: '#6DD5FA', pos: 50 },  // Sky
  { hex: '#B06AB3', pos: 75 },  // Orchid
  { hex: '#FF5F6D', pos: 100 }, // Rose (cierra el barrido sin costura)
];

/** El ángulo del barrido en grados para un t en segundos. */
export function anguloOrbita(t: number): number {
  const ph = t * 0.81;
  const spin = ph * 1;
  return 0 + spin * 60 * 0.55;
}

function cssOrbita(deg: number): string {
  const stops = ORBITA_PALETA.map((c) => `${c.hex} ${c.pos}%`).join(', ');
  return `conic-gradient(from ${deg}deg at 50% 50%, ${stops})`;
}

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Full-bleed DOM. Con reduced-motion queda el frame 0 (estático). */
export function GradienteOrbita({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || REDUCED()) return;
    let raf = 0;
    const inicio = performance.now();
    const tick = (ahora: number) => {
      const t = (ahora - inicio) / 1000;
      el.style.backgroundImage = cssOrbita(anguloOrbita(t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ backgroundColor: '#FF5F6D', backgroundImage: cssOrbita(0) }}
    />
  );
}

/* La misma receta pintada en un canvas 2D: es lo que el lente del FluidGlass
   refracta (MeshTransmissionMaterial refracta la ESCENA interna, no el DOM de
   atrás — por eso la gradiente tiene que existir también dentro del canvas).
   La consume el plano de fondo de la escena del gate. */
export function pintarOrbita(ctx: CanvasRenderingContext2D, t: number): void {
  const { width: w, height: h } = ctx.canvas;
  const rad = (anguloOrbita(t) * Math.PI) / 180 - Math.PI / 2; // createConicGradient parte de las 3 en punto
  const g = ctx.createConicGradient(rad, w / 2, h / 2);
  for (const c of ORBITA_PALETA) g.addColorStop(c.pos / 100, c.hex);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export { REDUCED as orbitaReducida };
