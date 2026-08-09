import { AudioLines, BookOpenText, Briefcase, MessageSquareText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useApp, type View } from '@/stores/app';

const TABS: { view: View; label: string; Icon: typeof AudioLines }[] = [
  { view: 'talk', label: 'TALK', Icon: AudioLines },
  { view: 'story', label: 'STORY', Icon: BookOpenText },
  { view: 'slang', label: 'SLANG', Icon: MessageSquareText },
  // RUTA, no OFICINA: mismo nombre de cara al usuario que la carta del carrusel
  // y las cabeceras del módulo (F0). El `view` sigue siendo 'a1'.
  { view: 'a1', label: 'RUTA', Icon: Briefcase },
];

/* Tab bar glass flotante. El nivel A1 la oculta (html.nivel-a1), como en la
   app original — esa regla llega con la vista A1 en F5. */
export function TabBar() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <div
        className="flex items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur-xl"
        style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
      >
        {TABS.map(({ view: v, label, Icon }) => {
          const active = v === view;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-[64px] cursor-pointer flex-col items-center gap-0.5 rounded-full px-3 py-1.5 transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
              <span className="font-mono text-[0.58rem] font-bold tracking-[0.08em]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
