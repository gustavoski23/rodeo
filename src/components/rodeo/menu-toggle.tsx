import { MenuIcon, XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* Morph ☰ ↔ ✕ — transcripción fiel del snippet que eligió el dueño
   (shadcn Button size-icon variant-outline, transition-all duration-200,
   scale-75 + rotate-90 + opacity-0 cruzados). Controlado desde fuera:
   el estado `open` es del sheet, no del botón. */
export function MenuToggle({
  open,
  onToggle,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      size="icon"
      variant="outline"
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={open}
      onClick={onToggle}
      className={cn('size-10 rounded-xl', className)}
    >
      <span className="relative flex size-4 items-center justify-center">
        <MenuIcon
          aria-hidden="true"
          className={cn(
            'absolute size-4 transition-all duration-200',
            open ? 'scale-75 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
          )}
        />
        <XIcon
          aria-hidden="true"
          className={cn(
            'absolute size-4 transition-all duration-200',
            open ? 'scale-100 rotate-0 opacity-100' : 'scale-75 -rotate-90 opacity-0',
          )}
        />
      </span>
    </Button>
  );
}
