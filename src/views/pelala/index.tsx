/* Entrada de Pélala — el sub-feature de stickers peel dentro de SLANG.
   Un solo componente que el wiring montará bajo SLANG (diferido a la integración).
   Alterna picker → El Muro | Pélala según el store. */

import { usePelala } from '@/stores/pelala';

import { ElMuro } from './muro';
import { Pelala } from './reto';
import { PelalaPicker } from './picker';

export default function PelalaView() {
  const mode = usePelala((s) => s.mode);
  if (mode === 'muro') return <ElMuro />;
  if (mode === 'reto') return <Pelala />;
  return <PelalaPicker />;
}
