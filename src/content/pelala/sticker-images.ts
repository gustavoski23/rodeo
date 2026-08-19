/* Pack de stickers ILUSTRADOS de Pélala — imágenes die-cut (WebP con alfa real).
   Generadas con IA (Abacus RouteLLM / Nano Banana) a partir de ideas de cuentas
   de inglés en Instagram, optimizadas a 512px (~30-40KB c/u). El motor sticker-forge
   calcula la silueta del pelado leyendo el canal alfa de la imagen: por eso el
   fondo es TRANSPARENTE de verdad y el sticker pela por su propio contorno, no
   como un rectángulo.

   Complementa a STICKER_SVG (stickers.ts, la calcomanía de texto de "wind up"):
   `sourceDe` en views/pelala/reto.tsx mira PRIMERO este mapa (imagen), luego el
   SVG, y si no hay ninguno cae al sticker de texto. Un término sin entrada aquí
   sigue funcionando; este mapa es opt-in y se va llenando término a término. */

import breakOutOf from './stickers/break-out-of.webp';
import dailyGrind from './stickers/daily-grind.webp';
import getAGrip from './stickers/get-a-grip.webp';
import getOver from './stickers/get-over.webp';
import payOff from './stickers/pay-off.webp';
import pullYourselfTogether from './stickers/pull-yourself-together.webp';
import shakeOff from './stickers/shake-off.webp';
import snapOutOf from './stickers/snap-out-of.webp';
import switchUp from './stickers/switch-up.webp';
import upInTheAir from './stickers/up-in-the-air.webp';
// Oficina
import touchBase from './stickers/touch-base.webp';
import circleBack from './stickers/circle-back.webp';
import followUp from './stickers/follow-up.webp';
import reachOut from './stickers/reach-out.webp';
import loopIn from './stickers/loop-in.webp';
import runBy from './stickers/run-by.webp';
import rampUp from './stickers/ramp-up.webp';
import rollOut from './stickers/roll-out.webp';

/** id del término → URL del webp die-cut. */
export const STICKER_IMG: Record<string, string> = {
  'pay-off': payOff,
  'break-out-of': breakOutOf,
  'snap-out-of': snapOutOf,
  'shake-off': shakeOff,
  'get-over': getOver,
  'get-a-grip': getAGrip,
  'daily-grind': dailyGrind,
  'switch-up': switchUp,
  'pull-yourself-together': pullYourselfTogether,
  'up-in-the-air': upInTheAir,
  'touch-base': touchBase,
  'circle-back': circleBack,
  'follow-up': followUp,
  'reach-out': reachOut,
  'loop-in': loopIn,
  'run-by': runBy,
  'ramp-up': rampUp,
  'roll-out': rollOut,
};
