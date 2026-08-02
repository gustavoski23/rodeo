import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

/* PERFIL — placeholder a propósito (pedido de Gus, 2026-08-02): la sección
   existe en el menú desde ya, pero el contenido llega después. Mismo patrón
   canónico de pantalla interior que STORY: barra ← + título mono + Card. */

const COLUMNA = 'mx-auto w-full max-w-[640px]';

export default function PerfilView() {
  const setView = useApp((s) => s.setView);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{
            borderColor: 'var(--borde-sutil)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Perfil
        </span>
      </div>

      <Card className={cn(COLUMNA, 'min-h-0 flex-1 items-center justify-center rounded-[22px]')}>
        <p className="text-[0.9rem]" style={{ color: 'var(--text-muted)' }}>
          Pronto.
        </p>
      </Card>
    </div>
  );
}
