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
import onTheSamePage from './stickers/on-the-same-page.webp';
import getTheBallRolling from './stickers/get-the-ball-rolling.webp';
import thinkOutsideTheBox from './stickers/think-outside-the-box.webp';
import hammerOut from './stickers/hammer-out.webp';
import pencilIn from './stickers/pencil-in.webp';
import weighIn from './stickers/weigh-in.webp';
import signOff from './stickers/sign-off.webp';
// Crypto
import hodl from './stickers/hodl.webp';
import toTheMoon from './stickers/to-the-moon.webp';
import rugPull from './stickers/rug-pull.webp';
import diamondHands from './stickers/diamond-hands.webp';
import paperHands from './stickers/paper-hands.webp';
import fomo from './stickers/fomo.webp';
import fud from './stickers/fud.webp';
import apeIn from './stickers/ape-in.webp';
import whale from './stickers/whale.webp';
import degen from './stickers/degen.webp';
import shill from './stickers/shill.webp';
import dyor from './stickers/dyor.webp';
import wagmi from './stickers/wagmi.webp';
import rekt from './stickers/rekt.webp';
import gm from './stickers/gm.webp';
// Aleatoria
import pieceOfCake from './stickers/piece-of-cake.webp';
import hitTheSack from './stickers/hit-the-sack.webp';
import underTheWeather from './stickers/under-the-weather.webp';
import costAnArmAndALeg from './stickers/cost-an-arm-and-a-leg.webp';
import onceInABlueMoon from './stickers/once-in-a-blue-moon.webp';
import breakALeg from './stickers/break-a-leg.webp';
import callItADay from './stickers/call-it-a-day.webp';
import ringABell from './stickers/ring-a-bell.webp';
import onCloudNine from './stickers/on-cloud-nine.webp';
import biteTheBullet from './stickers/bite-the-bullet.webp';
import hangInThere from './stickers/hang-in-there.webp';
import theLastStraw from './stickers/the-last-straw.webp';
import blessingInDisguise from './stickers/blessing-in-disguise.webp';
import onTheFence from './stickers/on-the-fence.webp';
import letTheCatOutOfTheBag from './stickers/let-the-cat-out-of-the-bag.webp';

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
  'on-the-same-page': onTheSamePage,
  'get-the-ball-rolling': getTheBallRolling,
  'think-outside-the-box': thinkOutsideTheBox,
  'hammer-out': hammerOut,
  'pencil-in': pencilIn,
  'weigh-in': weighIn,
  'sign-off': signOff,
  hodl: hodl,
  'to-the-moon': toTheMoon,
  'rug-pull': rugPull,
  'diamond-hands': diamondHands,
  'paper-hands': paperHands,
  fomo: fomo,
  fud: fud,
  'ape-in': apeIn,
  whale: whale,
  degen: degen,
  shill: shill,
  dyor: dyor,
  wagmi: wagmi,
  rekt: rekt,
  gm: gm,
  'piece-of-cake': pieceOfCake,
  'hit-the-sack': hitTheSack,
  'under-the-weather': underTheWeather,
  'cost-an-arm-and-a-leg': costAnArmAndALeg,
  'once-in-a-blue-moon': onceInABlueMoon,
  'break-a-leg': breakALeg,
  'call-it-a-day': callItADay,
  'ring-a-bell': ringABell,
  'on-cloud-nine': onCloudNine,
  'bite-the-bullet': biteTheBullet,
  'hang-in-there': hangInThere,
  'the-last-straw': theLastStraw,
  'blessing-in-disguise': blessingInDisguise,
  'on-the-fence': onTheFence,
  'let-the-cat-out-of-the-bag': letTheCatOutOfTheBag,
};
