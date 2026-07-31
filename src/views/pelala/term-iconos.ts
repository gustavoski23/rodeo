/* Icono de línea (lucide) por término — reemplaza a los emojis de sistema en la
   tarjeta de significado (pedido de Gus: iconos de línea, no emojis, para que la
   UI se lea premium y coherente con el resto de la iconografía monocroma).

   El mapa vive aquí y NO en el mazo (deck.ts) a propósito: el campo `emoji` del
   SlangTerm se conserva (lo usa el modo `muro`, sin rutear), y el render de la
   vista Pélala usa este mapa por id. Un término sin entrada cae al fallback. */

import type { LucideIcon } from 'lucide-react';
import {
  Angry,
  Armchair,
  Ban,
  CalendarHeart,
  CalendarX,
  Coffee,
  Dumbbell,
  DoorOpen,
  EarOff,
  Flag,
  Ghost,
  Handshake,
  Lightbulb,
  MessageCircle,
  MessagesSquare,
  Milk,
  Puzzle,
  Route,
  Smartphone,
  Sparkles,
  Target,
  Users,
  VolumeX,
  Wallet,
  Waves,
  Wind,
} from 'lucide-react';

export const ICONO_TERMINO: Record<string, LucideIcon> = {
  'pull-off': Target,
  'run-into': Users,
  ghost: Ghost,
  'show-up': DoorOpen,
  'give-up': Flag,
  'chill-out': Wind,
  broke: Wallet,
  'hang-out': Armchair,
  'figure-out': Puzzle,
  flex: Dumbbell,
  'catch-up': Coffee,
  'work-out': Route,
  'look-forward-to': CalendarHeart,
  'come-up-with': Lightbulb,
  'get-along': Handshake,
  'turn-down': Ban,
  'put-up-with': EarOff,
  'run-out-of': Milk,
  'bring-up': MessageCircle,
  'call-off': CalendarX,
  'hit-up': Smartphone,
  'spill-the-tea': MessagesSquare,
  lowkey: VolumeX,
  swamped: Waves,
  salty: Angry,
  'wrap-up': Sparkles,
};

/** Fallback si un término no está en el mapa. */
export const ICONO_FALLBACK: LucideIcon = Sparkles;
