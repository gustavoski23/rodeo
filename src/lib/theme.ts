/* Tema claro/oscuro — port de public/legacy.html:6806-6821. El barrido
   circular lo hace el AnimatedThemeToggler de Magic UI (componente verbatim
   en components/magicui/) en modo controlado: nosotros solo aplicamos
   data-theme + meta theme-color y persistimos rodeo_tema. */

export type Tema = 'claro' | 'oscuro';

export const REDUCED =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function temaActual(): Tema {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'claro' : 'oscuro';
}

export function aplicarTema(tema: Tema) {
  if (tema === 'claro') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  // La barra del navegador en Android sigue al tema; si no, queda un borde
  // negro sobre la app clara.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'claro' ? '#fbfaf7' : '#0a0a0e');
}

