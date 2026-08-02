/* Tema claro/oscuro/gradiente — port de public/legacy.html:6806-6821 ampliado.
   El barrido circular lo hace el AnimatedThemeToggler de Magic UI (componente
   verbatim en components/magicui/) en modo controlado: nosotros solo aplicamos
   data-theme + data-fondo + meta theme-color y persistimos rodeo_tema.

   TRES temas desde 2026-07-30 (pedido de Gus):
     · claro     → data-theme='light'      (papel)
     · oscuro    → sin atributos           (el shell negro de siempre)
     · gradiente → tokens OSCUROS + data-fondo='gradiente'

   `gradiente` NO es una tercera paleta de tokens: es el tema oscuro con un
   fondo animado (BubbleBackground) en el Home. Por eso NUNCA pone
   data-theme='light' — todo lo que cuelga de la variante `dark` de Tailwind
   (tokens.css:17) y el espejo data-theme→.dark del Orb (talk/orb-avatar.tsx)
   siguen viendo exactamente lo mismo que en oscuro, sin tocar una línea. */

import { MODO_LIGERO } from '@/lib/device';
import { store } from '@/lib/storage';

export type Tema = 'claro' | 'oscuro' | 'gradiente';

export const REDUCED =
  MODO_LIGERO ||
  (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Etiquetas de UI (toast del toggler, tarjetas del personalizador). */
export const ETIQUETA_TEMA: Record<Tema, string> = {
  claro: 'Día',
  oscuro: 'Noche',
  gradiente: 'Gradiente',
};

/** El ciclo del toggler: día → noche → gradiente → día. */
export const SIGUIENTE_TEMA: Record<Tema, Tema> = {
  claro: 'oscuro',
  oscuro: 'gradiente',
  gradiente: 'claro',
};

/** Cómo se DIBUJA cada tema en el AnimatedThemeToggler, que es binario y
    verbatim: gradiente se muestra como noche (luna), porque sus tokens son
    los oscuros. */
export function temaVisual(tema: Tema): 'light' | 'dark' {
  return tema === 'claro' ? 'light' : 'dark';
}

export function esTema(v: unknown): v is Tema {
  return v === 'claro' || v === 'oscuro' || v === 'gradiente';
}

export function temaActual(): Tema {
  const html = document.documentElement;
  if (html.getAttribute('data-fondo') === 'gradiente') return 'gradiente';
  return html.getAttribute('data-theme') === 'light' ? 'claro' : 'oscuro';
}

export function aplicarTema(tema: Tema) {
  const html = document.documentElement;
  if (tema === 'claro') html.setAttribute('data-theme', 'light');
  else html.removeAttribute('data-theme');
  // data-fondo es ORTOGONAL a data-theme: marca "este tema pide fondo
  // animado". Se quita en los otros dos para que nadie herede burbujas.
  if (tema === 'gradiente') html.setAttribute('data-fondo', 'gradiente');
  else html.removeAttribute('data-fondo');
  // La barra del navegador en Android sigue al tema; si no, queda un borde
  // negro sobre la app clara.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'claro' ? '#fbfaf7' : '#0a0a0e');
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
