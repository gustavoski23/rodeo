/* Coach de uso — evalúa si el usuario usó el slang/phrasal verb de forma natural.

   INTEGRACIÓN: en la app real esto lo juzga la AI vía api/chat.js (naturalidad,
   registro, si un nativo lo diría). Aquí va un evaluador LOCAL para el demo
   aislado (no hay backend en el worktree). `evaluarUso` ya es async: al integrar
   se reemplaza el cuerpo por una llamada a callJSON('/api/chat', ...) sin tocar
   la vista. El contrato del prompt lo afinamos con el juez real. */

import type { SlangTerm } from '@/content/pelala/deck';

export type EstadoVeredicto = 'bien' | 'forzado' | 'falta';

export type Veredicto = {
  estado: EstadoVeredicto;
  mensaje: string;
};

/** ¿Aparece el término (o una variante aceptada) en la frase? */
function usaTermino(term: SlangTerm, frase: string): boolean {
  const f = frase.toLowerCase();
  return [term.term, ...term.accept].some((a) => f.includes(a.toLowerCase()));
}

/* Heurística local para el demo. NO juzga naturalidad de verdad (eso es la AI);
   solo simula los tres estados para poder ver la UX completa. */
export function evaluarUsoLocal(term: SlangTerm, frase: string): Veredicto {
  const palabras = frase.trim().split(/\s+/).filter(Boolean).length;

  if (!usaTermino(term, frase)) {
    return {
      estado: 'falta',
      mensaje: `No veo «${term.term}» en tu frase. Úsalo de verdad para que lo practiques.`,
    };
  }
  if (palabras < 4) {
    return {
      estado: 'forzado',
      mensaje: `Suena forzado así de corto — un nativo daría contexto. Ej: "${term.context_en}"`,
    };
  }
  return {
    estado: 'bien',
    mensaje: '¡Perfecto! Así lo diría un nativo.',
  };
}

/** Punto único que la vista consume. Async a propósito (el juez real es remoto). */
export async function evaluarUso(
  term: SlangTerm,
  frase: string,
): Promise<Veredicto> {
  // INTEGRACIÓN: reemplazar por el juez real, algo como:
  //   const r = await callJSON('/api/chat', { system: COACH_SYSTEM, user: coachPrompt(term, frase) });
  //   return parseVeredicto(r);
  return evaluarUsoLocal(term, frase);
}
