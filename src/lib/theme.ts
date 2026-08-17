/* Tema claro/oscuro/gradiente — port de public/legacy.html:6806-6821 ampliado.
   El barrido circular lo hace el AnimatedThemeToggler de Magic UI (componente
   verbatim en components/magicui/) en modo controlado: nosotros solo aplicamos
   data-theme + data-fondo + meta theme-color y persistimos rodeo_tema.

   CUATRO temas desde 2026-08-17 (los tres primeros son de 2026-07-30):
     · claro     → data-theme='light'      (papel)
     · oscuro    → sin atributos           (el shell negro de siempre)
     · gradiente → tokens OSCUROS + data-fondo='gradiente'
     · amanecer  → tokens CLAROS + data-fondo='amanecer'

   Ninguno de los dos fondos es una paleta de tokens propia: los dos son
   `data-fondo`, un atributo ORTOGONAL a `data-theme` que dice "este tema pide
   fondo animado". `gradiente` es el tema oscuro con las burbujas goo;
   `amanecer` es el tema claro con el MISMO gradiente de manchas del gate —el
   de la pantalla "Get started", que Gus pidió poder elegir— y por eso sí pone
   data-theme='light': su papel es claro y su tinta oscura, igual que el gate.

   Así, todo lo que cuelga de la variante `dark` de Tailwind (tokens.css:17) y
   el espejo data-theme→.dark del Orb (talk/orb-avatar.tsx) sigue funcionando
   solo: gradiente ve lo mismo que oscuro, amanecer lo mismo que claro. */

import { MODO_LIGERO } from '@/lib/device';
import { store } from '@/lib/storage';

export type Tema = 'claro' | 'oscuro' | 'gradiente' | 'amanecer';

export const REDUCED =
  MODO_LIGERO ||
  (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Etiquetas de UI (toast del toggler, tarjetas del personalizador). */
export const ETIQUETA_TEMA: Record<Tema, string> = {
  claro: 'Día',
  oscuro: 'Noche',
  gradiente: 'Gradiente',
  amanecer: 'Amanecer',
};

/** El ciclo del toggler: día → noche → gradiente → amanecer → día. */
export const SIGUIENTE_TEMA: Record<Tema, Tema> = {
  claro: 'oscuro',
  oscuro: 'gradiente',
  gradiente: 'amanecer',
  amanecer: 'claro',
};

/** ¿Este tema se pinta sobre PAPEL CLARO? Es la pregunta que se hacen el
    toggler (qué icono), los tokens (qué paleta) y los componentes con variante
    light/dark (border beam, orb, TryMe). Una sola función para que añadir un
    tema no obligue a cazar diez ternarios `=== 'claro'` por el repo. */
export function esTemaClaro(tema: Tema): boolean {
  return tema === 'claro' || tema === 'amanecer';
}

/** Cómo se DIBUJA cada tema en el AnimatedThemeToggler, que es binario y
    verbatim: gradiente se muestra como noche (luna) porque sus tokens son los
    oscuros, y amanecer como día porque los suyos son los claros. */
export function temaVisual(tema: Tema): 'light' | 'dark' {
  return esTemaClaro(tema) ? 'light' : 'dark';
}

export function esTema(v: unknown): v is Tema {
  return v === 'claro' || v === 'oscuro' || v === 'gradiente' || v === 'amanecer';
}

export function temaActual(): Tema {
  const html = document.documentElement;
  const fondo = html.getAttribute('data-fondo');
  if (fondo === 'gradiente') return 'gradiente';
  if (fondo === 'amanecer') return 'amanecer';
  return html.getAttribute('data-theme') === 'light' ? 'claro' : 'oscuro';
}

export function aplicarTema(tema: Tema) {
  const html = document.documentElement;
  if (esTemaClaro(tema)) html.setAttribute('data-theme', 'light');
  else html.removeAttribute('data-theme');
  // data-fondo es ORTOGONAL a data-theme: marca "este tema pide fondo
  // animado" y CUÁL. Se quita en los planos para que nadie herede una capa.
  if (tema === 'gradiente' || tema === 'amanecer') html.setAttribute('data-fondo', tema);
  else html.removeAttribute('data-fondo');
  /* La barra del navegador en Android sigue al tema; si no, queda un borde
     negro sobre la app clara. Amanecer lleva el papel del gate
     —oklch(97.5% 0.012 85)— y no el papel del tema claro: es un crema más
     cálido, y con el #fbfaf7 de Día se veía la costura contra el fondo. */
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      'content',
      tema === 'amanecer' ? '#faf6ec' : tema === 'claro' ? '#fbfaf7' : '#0a0a0e',
    );
  }
}

/* El anti-flash del <head> (index.html) solo entiende 'claro'/'oscuro': con
   'gradiente' guardado cae a la preferencia del sistema y podría dejar el
   data-theme='light' puesto. Esto lo reconcilia en el arranque del módulo de
   estado (stores/app.ts), ANTES del primer render de React — la ventana entre
   el script del head y esta llamada no pinta nada (el #root está vacío), así
   que no hay fogonazo. Valores viejos ('claro'/'oscuro') pasan intactos: la
   migración es no-op para quien ya tenía tema elegido. */
export function hidratarTema(): Tema {
  const guardado = store.get<unknown>('rodeo_tema', null);
  // Sin elección previa el default es GRADIENTE (pedido de Gus: el Home se
  // abre en gradiente para todo el mundo). Quien ya eligió tema conserva el
  // suyo — la migración es no-op para valores 'claro'/'oscuro'/'gradiente'.
  const tema: Tema = esTema(guardado) ? guardado : 'gradiente';
  aplicarTema(tema);
  return tema;
}
