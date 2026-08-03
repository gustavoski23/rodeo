import { motion } from 'motion/react';

import { GlassButton } from '@/components/ui/sign-up';
import { useUiLang, type UiLang } from '@/stores/uiLang';

/* Toggle ES/ENG del gate — solo para la demo del sprint "aprender español".

   Dos GlassButton lado a lado que cambian el idioma de la UI del gate y
   del onboarding. El botón activo cambia su color por un fondo tinta con
   texto claro; el inactivo queda como vidrio normal. Se pinta un
   indicador motion que se desplaza entre los dos con un layoutId.

   Vive como componente aparte porque lo monta el gate PERO su lógica
   (persistencia en rodeo_ui_lang, hidratación al cargar) no le pertenece
   al gate — pertenece al store. */

const OPCIONES: { id: UiLang; etq: string }[] = [
  { id: 'es', etq: 'ES' },
  { id: 'en', etq: 'ENG' },
];

export function UiLangToggle() {
  const lang = useUiLang((s) => s.lang);
  const setLang = useUiLang((s) => s.setLang);

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Idioma de la interfaz">
      {OPCIONES.map((o) => {
        const activo = o.id === lang;
        return (
          <GlassButton
            key={o.id}
            type="button"
            size="sm"
            role="radio"
            aria-checked={activo}
            onClick={() => setLang(o.id)}
            contentClassName="gate-titulo font-mono text-xs font-bold tracking-[0.08em]"
          >
            <span className="relative inline-flex items-center px-1">
              {activo && (
                <motion.span
                  layoutId="ui-lang-active"
                  aria-hidden="true"
                  className="absolute inset-x-[-6px] inset-y-[-3px] rounded-full"
                  style={{ background: 'oklch(from var(--foreground) l c h / 12%)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative z-10">{o.etq}</span>
            </span>
          </GlassButton>
        );
      })}
    </div>
  );
}
