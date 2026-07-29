import { useEffect, useRef, useState } from 'react';

import { AuroraPillButton } from '@/components/rodeo/aurora-pill-button';
import { MenuToggle } from '@/components/rodeo/menu-toggle';
import { useApp } from '@/stores/app';
import { lanzarLibreAurora } from '@/views/talk/use-coach-turn';

/* HOME — markup y comportamiento 1:1 de la referencia aprobada
   (codex/home-aurora-production-review, index.html:1972-2007 y 3955-4001).
   Pantalla mínima: hamburguesa, "Hola, Gustavo", "¿Qué quieres practicar
   hoy?", el AuroraPillButton "Conversación libre" y la flecha que revela una
   sola ruta: "Modo historia" (→ STORY; hoy placeholder hasta portar esa vista).

   "Conversación libre" NO navega al toque: la píldora se hunde 950ms y luego
   entra al flujo de dibujo libre con la cápsula "Pensando" (ver
   lanzarLibreAurora). Volver de la conversación regresa aquí (App). */

export default function HomeView({ menuOpen, onMenuToggle }: { menuOpen: boolean; onMenuToggle: () => void }) {
  const nombre = useApp((s) => s.nombre);
  const setView = useApp((s) => s.setView);
  const [masOpciones, setMasOpciones] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  // Escape cierra la ruta secundaria y devuelve el foco a la flecha (como el
  // original: index.html:3993-3998).
  useEffect(() => {
    if (!masOpciones) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMasOpciones(false);
      moreRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [masOpciones]);

  function lanzar(viaTeclado: boolean) {
    if (lanzarLibreAurora({ focoVolver: viaTeclado })) setView('talk');
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[max(14px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))]" style={{ background: '#14161a' }}>
      <div className="shrink-0">
        <MenuToggle open={menuOpen} onToggle={onMenuToggle} />
      </div>

      <div className="aurora-home" aria-labelledby="aurora-home-question">
        <div className="aurora-home__copy">
          <p className="aurora-home__greeting">{nombre ? `Hola, ${nombre}` : 'Hola'}</p>
          <h2 className="aurora-home__question" id="aurora-home-question">
            ¿Qué quieres practicar hoy?
          </h2>
        </div>

        <div className="aurora-home__actions">
          <AuroraPillButton onLaunch={lanzar}>Conversación libre</AuroraPillButton>

          <button
            ref={moreRef}
            className="aurora-more"
            type="button"
            aria-label="Mostrar más opciones"
            aria-expanded={masOpciones}
            aria-controls="aurora-story-option"
            onClick={() => setMasOpciones((v) => !v)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </button>

          <button
            className="aurora-story-option"
            id="aurora-story-option"
            type="button"
            hidden={!masOpciones}
            onClick={() => setView('story')}
          >
            <span>Modo historia</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5.5h6a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H4z" />
              <path d="M20 5.5h-4a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5H20z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
