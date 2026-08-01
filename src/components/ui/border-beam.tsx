/* border-beam.tsx — integración del paquete npm `border-beam` (código de Gus,
   pegado de su spec tal cual). Re-exporta el componente y sus tipos para que
   la app lo importe desde '@/components/ui/border-beam', siguiendo la
   estructura shadcn del proyecto. OJO: distinto del BorderBeam de magicui
   (src/components/magicui/border-beam.tsx), que es un haz viajero simple; este
   es el paquete completo con presets, temas y variantes de color. */
import { BorderBeam } from "border-beam";
import type {
  BorderBeamProps,
  BorderBeamSize,
  BorderBeamTheme,
  BorderBeamColorVariant,
} from "border-beam";

export type {
  BorderBeamProps,
  BorderBeamSize,
  BorderBeamTheme,
  BorderBeamColorVariant,
};

export { BorderBeam };
export default BorderBeam;
