import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleUserRound, Compass, House, MessageCircle } from 'lucide-react';

import { GlassButton, GlassStyles } from '@/components/ui/sign-up';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useAuth } from '@/stores/auth';
import { useSuscripcion } from '@/stores/suscripcion';

import './nav-movil.css';

/* NAV MÓVIL — la navbar inferior SOLO PARA TELÉFONOS (App la monta bajo
   ES_TELEFONO): Home · Explore · Talk · Profile.

   CUATRO PÍLDORAS DE VIDRIO SEPARADAS, no una barra continua: cada una es un
   GlassButton del gate (sign-up.tsx — el vidrio EXACTO de "Get started") con
   su gap entre ellas, como los botones ES/ENG del gate. Sin contenedor opaco:
   las píldoras flotan sobre el fondo, que el vidrio ya trae blur y sombra
   propios. El look es el VIDRIO CLARO DEL GATE, FIJO en los tres temas
   (pedido explícito): `.nav-movil` (nav-movil.css) declara las crudas
   --background/--foreground que consume GlassStyles con los MISMOS valores
   que `.gate-tema` — crema con tinta oscura también sobre el Home aurora
   oscuro y el gradiente (a propósito NO la clase adaptativa `vidrio-tema`,
   que aquí volvería la lámina oscura y mataría el efecto de la sombra gris
   sobre vidrio clarito). Sobre fondos oscuros la lámina sube de opacidad
   (62–88%) para leerse crema frosted, no transparente-oscura.

   El INDICADOR GRIS interior es el patrón de ui-lang-toggle: un motion.span
   absoluto con layoutId compartido (`nav-movil-activa`) que al cambiar de
   píldora SE DESLIZA de una a otra con morph (spring 500/40). Mismo fondo:
   oklch(from var(--foreground) l c h / 12%).

   PROFILE no navega: abre un mini-panel anclado encima de la navbar (misma
   lámina de vidrio) con las MISMAS acciones que la píldora Menu de PC
   (menu-flotante.tsx): Perfil · Personalizar · Suscripción · Iniciar/Cerrar
   sesión. Se cierra por tap fuera y Escape. Aquí SÍ hay tildes: el panel no
   pasa por el roll de letras del FloatingMenu que se las comía. */

type BotonId = 'home' | 'explore' | 'talk' | 'profile';

/* ── UN solo disparo por toque en las píldoras ─────────────────────────────
   El cuarto gemelo del mismo remedio (charla-session.tsx, escenas-session.tsx,
   libro/index.tsx). GlassButton (sign-up.tsx, INTOCABLE) envuelve el <button>
   en un <div> con un onClick de "click fix" que reenvía el toque al botón
   cuando el evento no vino de él:

     if (button && e.target !== button) button.click();

   El toque real NUNCA cae en el <button>: cae en el <span> interior, en el
   icono o en la etiqueta, porque el padding entero lo pone ese span
   (contentClassName). Así que el evento burbujea al botón —el handler corre—,
   sigue hasta el div, `e.target !== button` es cierto y lo vuelve a disparar:
   DOS ejecuciones por toque.

   AQUÍ es donde por fin se vio, y por eso este arreglo llega el último: Home,
   Explore y Talk son idempotentes (llamar a setView('home') dos veces deja lo
   mismo), pero Profile es un TOGGLE — abría el panel y lo cerraba en el mismo
   tap, así que tocarlo no hacía nada. Medido con page.touchscreen a 390×844:
   2 clicks en el <button> y aria-expanded="false" tras un único toque.

   Se envuelven las CUATRO por igual: las otras tres no fallaban a la vista,
   pero igual pagaban doble render en cada toque. Cortamos la propagación en el
   propio botón; el toque que cae en el margen del envoltorio sigue
   funcionando. No toca sign-up.tsx. */
const unSoloClick =
  (fn: () => void) =>
  (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn();
  };

export function NavMovil({
  onPersonalizar,
  oculta = false,
}: {
  /** Abre la hoja "Personalizar aurora" (el estado vive en App). */
  onPersonalizar: () => void;
  /* Con el personalizador o Suscripción abiertos la navbar se APARTA (fade +
     sin puntero) sin desmontar — patrón `oculto` de MenuFlotante. */
  oculta?: boolean;
}) {
  const view = useApp((s) => s.view);
  const carruselAbierto = useApp((s) => s.carruselAbierto);
  const usuario = useAuth((s) => s.usuario);
  const logout = useAuth((s) => s.logout);
  const mostrarGate = useAuth((s) => s.mostrarGate);
  const abrirSuscripcion = useSuscripcion((s) => s.abrir);

  const [panelAbierto, setPanelAbierto] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  /* Envuelve la píldora Profile (display:contents, no toca el layout): el
     listener de tap-fuera tiene que RECONOCERLA, porque su pointerdown ya
     cerraría el panel y el click posterior lo re-abriría — el toggle quedaría
     pegado en "abierto". */
  const perfilRef = useRef<HTMLSpanElement>(null);

  // Si el panel estuviera abierto al taparse la navbar, se cierra (mismo trato
  // que MenuFlotante le da a su morph cuando aparece una capa encima).
  useEffect(() => {
    if (oculta) setPanelAbierto(false);
  }, [oculta]);

  // Tap fuera y Escape cierran el panel.
  useEffect(() => {
    if (!panelAbierto) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || perfilRef.current?.contains(t)) return;
      setPanelAbierto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelAbierto(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelAbierto]);

  /* Acciones. Se lee getState() en el momento del tap (no suscripción): son
     escrituras, no datos que pintar. */
  const irHome = () => {
    setPanelAbierto(false);
    const { setCarruselAlVolver, setCarruselAbierto, setView } = useApp.getState();
    // "Llévame a la portada", como el Inicio del menú de PC: marca abajo y
    // vitrina cerrada aunque se venga de una carta.
    setCarruselAlVolver(false);
    setCarruselAbierto(false);
    setView('home');
  };
  const irExplore = () => {
    setPanelAbierto(false);
    const { setView, setCarruselAbierto } = useApp.getState();
    // setView('home') hace su traspaso de carruselAlVolver; el abrir explícito
    // va DESPUÉS y gana: Explore siempre aterriza con la vitrina abierta.
    setView('home');
    setCarruselAbierto(true);
  };
  const irTalk = () => {
    setPanelAbierto(false);
    const { setCarruselAlVolver, setView } = useApp.getState();
    // Entrar por la navbar NO es entrar por la vitrina: su ← debe devolver el
    // Home cerrado (misma limpieza que el menú de PC hace con Perfil).
    setCarruselAlVolver(false);
    setView('talk');
  };

  /* ¿Qué píldora lleva el indicador? El panel abierto pinta Profile activo
     aunque la vista de fondo sea otra; la vitrina abierta es Explore; el Home
     con vitrina cerrada es Home; y las vistas sin pestaña (story, ladder, dna,
     a1, libro…) no encienden ninguna. */
  const activa: BotonId | null =
    panelAbierto || view === 'perfil'
      ? 'profile'
      : view === 'talk'
        ? 'talk'
        : view === 'home'
          ? carruselAbierto
            ? 'explore'
            : 'home'
          : null;

  const botones: { id: BotonId; etq: string; Icono: typeof House; onClick: () => void }[] = [
    { id: 'home', etq: 'Home', Icono: House, onClick: irHome },
    { id: 'explore', etq: 'Explore', Icono: Compass, onClick: irExplore },
    { id: 'talk', etq: 'Talk', Icono: MessageCircle, onClick: irTalk },
    { id: 'profile', etq: 'Profile', Icono: CircleUserRound, onClick: () => setPanelAbierto((v) => !v) },
  ];

  /* Cableado idéntico al de menu-flotante.tsx, ítem por ítem — solo que aquí
     las tildes SÍ caben. Cada acción cierra el panel primero. */
  const itemsPanel = [
    {
      etq: 'Perfil',
      onClick: () => {
        setPanelAbierto(false);
        const { setCarruselAlVolver, setView } = useApp.getState();
        setCarruselAlVolver(false);
        setView('perfil');
      },
    },
    { etq: 'Personalizar', onClick: () => { setPanelAbierto(false); onPersonalizar(); } },
    { etq: 'Suscripción', onClick: () => { setPanelAbierto(false); abrirSuscripcion(); } },
    usuario
      ? { etq: 'Cerrar sesión', onClick: () => { setPanelAbierto(false); void logout(); } }
      : { etq: 'Iniciar sesión', onClick: () => { setPanelAbierto(false); mostrarGate(); } },
  ];

  return (
    /* left-1/2 + -translate-x-1/2 en vez de inset-x-0: la caja del nav mide lo
       que miden las píldoras y no deja una franja invisible a lo ancho
       tragándose taps. z-50 para quedar SOBRE la capa del carrusel (fixed
       z-40) — con la vitrina abierta la navbar sigue a la vista con Explore
       encendido, y la propia capa ya reserva 72px de pie. */
    <nav
      aria-label="Navegación principal"
      aria-hidden={oculta || undefined}
      className={cn(
        'nav-movil fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-end gap-2 max-[359px]:gap-1.5',
        oculta && 'nav-movil--oculta',
      )}
    >
      <GlassStyles />

      {/* MINI-PANEL de Profile: hoja pequeña anclada encima de la navbar,
          pegada al flanco derecho (el de su píldora). */}
      <AnimatePresence>
        {panelAbierto && (
          <motion.div
            ref={panelRef}
            role="menu"
            aria-label="Cuenta y ajustes"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className="nav-movil__panel absolute bottom-[calc(100%+10px)] right-0 flex w-48 flex-col gap-0.5 p-1.5"
          >
            {itemsPanel.map((it) => (
              <button
                key={it.etq}
                type="button"
                role="menuitem"
                onClick={it.onClick}
                className="nav-movil__item cursor-pointer rounded-[14px] px-4 py-2.5 text-left text-sm font-medium"
              >
                {it.etq}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {botones.map(({ id, etq, Icono, onClick }) => {
        const activo = activa === id;
        return (
          <span key={id} ref={id === 'profile' ? perfilRef : undefined} className="contents">
            <GlassButton
              type="button"
              size="sm"
              onClick={unSoloClick(onClick)}
              aria-current={activo ? 'page' : undefined}
              aria-expanded={id === 'profile' ? panelAbierto : undefined}
              /* Icono y label EN FILA a 34px de alto (pedido de Gus, 2ª ronda:
                 «horizontales como ES/ENG y un poquitito más bajitas» — ES/ENG
                 mide ~37px). Con px-13 las cuatro suman ~340px y caben desde
                 375px de viewport; por debajo de 360px el padding y el gap del
                 nav se encogen un pelo en vez de partir la fila. */
              contentClassName="flex h-[34px] flex-row items-center justify-center gap-1.5 px-[13px] py-0 max-[359px]:px-[9px]"
            >
              {/* La "sombra gris" que SE DESLIZA: mismo patrón (layoutId +
                  spring 500/40 + tinta al 12%) que ui-lang-toggle. */}
              {activo && (
                <motion.span
                  layoutId="nav-movil-activa"
                  aria-hidden="true"
                  className="absolute inset-x-[6px] inset-y-[4px] rounded-full"
                  style={{ background: 'oklch(from var(--foreground) l c h / 12%)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icono
                size={16}
                strokeWidth={activo ? 2.1 : 1.7}
                aria-hidden="true"
                className={cn('relative z-10', activo ? 'opacity-100' : 'opacity-75')}
              />
              <span
                className={cn(
                  'relative z-10 text-[11px] leading-none',
                  activo ? 'font-semibold opacity-100' : 'font-medium opacity-75',
                )}
              >
                {etq}
              </span>
            </GlassButton>
          </span>
        );
      })}
    </nav>
  );
}
