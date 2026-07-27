/* PLACEHOLDER — el pane de ESCENAS (roleplay) lo porta otro agente.

   Este archivo existe para que el import perezoso de la vista TALK resuelva:
   `lazy(() => import('./escenas'))` es estático para el bundler, así que un
   archivo ausente rompe el build, no el runtime. Sustitúyelo entero por el
   pane real (misma ruta, mismo default export) y la vista lo recoge sin
   tocar nada más.

   Lo que va aquí, según spec-talk.md §1.7-1.9: portada con RP_CANONICO +
   3 escenas generadas + SORPRÉNDEME, sesión con rpTurn y debrief con
   updateStreak. Mientras tanto, el toggle CHARLA/ESCENAS funciona y esta
   pantalla dice la verdad en vez de fingir. */
export default function EscenasPane() {
  return (
    <div className="scroll-area flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto pb-4">
      <p
        className="flex items-center gap-2.5 font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="h-0.5 w-6 shrink-0 rounded-sm bg-current" />
        Roleplay · teatro jugable
      </p>
      <p className="font-display text-[clamp(2rem,8.5vw,2.8rem)] leading-[0.92] font-extrabold tracking-[-0.035em]">
        ACTÚA.
        <br />
        NO SOLO <span style={{ color: 'var(--accent)' }}>HABLES.</span>
      </p>
      <p className="max-w-[330px] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
        Las escenas llegan en la siguiente entrega. Por ahora, la charla te espera en la otra pestaña.
      </p>
    </div>
  );
}
