/* Curvas de easing que esperan los componentes de motion pegados de librerías
   (beui.dev importa `@/lib/ease`). Son los cubic-bezier estándar de easings.net
   — si otro componente pegado pide una curva nueva, se agrega aquí. */

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_IN: [number, number, number, number] = [0.7, 0, 0.84, 0];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];
