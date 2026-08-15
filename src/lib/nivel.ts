/* EL NIVEL, LEÍDO CON TOLERANCIA — un solo lugar.

   `rodeo_nivel` se escribe desde el onboarding con el literal 'A1' (el tipo
   Nivel de stores/onboarding.ts lo garantiza HOY), pero el valor viaja por
   localStorage, por el sync de Supabase y por dispositivos con datos de
   versiones viejas de la app. Ahí ya no lo garantiza nadie: puede llegar
   'a1', 'A1 Básico', con espacios, o directamente null.

   Y cada comparación suelta contra === 'A1' era una forma distinta de romperse
   en silencio. Pasó de verdad: el script de arranque de index.html comparaba
   contra 'a1' MINÚSCULA, así que la clase `nivel-a1` no se aplicó nunca.

   Regla: nadie compara el nivel a mano. Se pregunta acá. */

/** ¿Este valor —venga de donde venga— significa "principiante A1"? */
export function esNivelA1(nivel: unknown): boolean {
  if (typeof nivel !== 'string') return false;
  const limpio = nivel.trim().toUpperCase();
  /* `startsWith` y no `=== 'A1'`: cubre 'A1 Básico' y cualquier sufijo
     descriptivo que alguna versión haya guardado. Y no se usa `includes`
     porque 'B2-C1' no tiene 'A1' pero un futuro 'PRE-A1' sí, y ese NO es
     este nivel. */
  return limpio === 'A1' || limpio.startsWith('A1 ');
}

/** La forma canónica en disco. Devuelve el valor tal cual si no es A1. */
export function normalizarNivel(nivel: unknown): string | null {
  if (typeof nivel !== 'string') return null;
  const limpio = nivel.trim();
  if (!limpio) return null;
  return esNivelA1(limpio) ? 'A1' : limpio;
}
