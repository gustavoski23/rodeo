/* Sincronización texto-voz (pedido de Gus, 2026-08-02): cuando aparecen las
   letras de la respuesta del coach, la voz de Deepgram debe sonar YA — o el
   texto se atrasa hasta VOZ_TOPE_MS para que la voz entre con él.

   El problema: /api/tts devuelve el MP3 COMPLETO (no streaming) y el navegador
   tarda en bajarlo y decodificarlo, así que si el texto se pinta en cuanto el
   modelo responde, la voz llega segundos después. Aquí se espera la señal real
   de "la voz arrancó" que speak() dispara con onResuelta, con un tope: si
   Deepgram viene lento o se cae, el texto se libera igual y la pantalla nunca
   se queda congelada.

   Uso en los motores de turno (use-coach-turn.ts, rp-turn.ts):
     await hablarSincronizado(reply);
     // recién aquí se pintan las letras */

import { registrarHablado, speak, ttsActivo, type VozId } from './speech';

/** Tope de espera: si la voz no arrancó en 3 s, el texto sale igual. */
export const VOZ_TOPE_MS = 3000;

/**
 * Habla `reply` y resuelve cuando la voz ya puede sonar (MP3 decodificado,
 * a un frame de arrancar) — o al vencer VOZ_TOPE_MS si Deepgram tarda o falla.
 * Con la voz apagada solo registra el texto para el botón "repetir" y
 * resuelve en el acto, para no atrasar las letras cuando no hay audio que
 * esperar.
 */
export function hablarSincronizado(reply: string, opts?: { voz?: VozId }): Promise<void> {
  if (!ttsActivo()) {
    registrarHablado(reply);
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const tope = window.setTimeout(() => {
      window.clearTimeout(tope);
      resolve();
    }, VOZ_TOPE_MS);
    void speak(reply, {
      ...opts,
      onResuelta: () => {
        window.clearTimeout(tope);
        resolve();
      },
    });
  });
}
