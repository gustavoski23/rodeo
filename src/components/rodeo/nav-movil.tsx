import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { CircleUserRound, Compass, House, MessageCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';
import { useAuth } from '@/stores/auth';
import { useSuscripcion } from '@/stores/suscripcion';

import './nav-movil.css';

/* NAVBAR INFERIOR — SOLO TELÉFONOS (la monta App con ES_TELEFONO).

   Cuatro ítems: Home · Explore · Talk · Profile. El look (neumorphic glass
   oscuro, referencia subshegde/neumorphic_glass_navbar) vive en nav-movil.css;
   aquí va el cableado:

     · Home     → portada CERRADA: baja la marca ← al origen, cierra la
                  vitrina y navega. Es el "Inicio" de la píldora Menu de PC.
     · Explore  → el Home con la VITRINA de features abierta. En teléfonos el
                  TryMeButton no se monta (views/home), así que este ítem es la
                  única puerta del carrusel.
     · Talk     → la vista TALK directa (charla/escenas eligen adentro).
     · Profile  → NO navega de una: abre un mini-panel anclado encima de la
                  barra con las MISMAS acciones que la píldora Menu de PC
                  (menu-flotante.tsx), menos "Inicio" que ya es el primer ítem.
                  El panel usa texto normal —no el roll de letras del
                  FloatingMenu— así que aquí las tildes van completas:
                  "Suscripción", "Iniciar sesión", "Cerrar sesión".

   El DISCO neumórfico del activo viaja entre ítems con layoutId: los dos
   renders (disco viejo fuera, disco nuevo dentro) ocurren en el mismo commit y
   motion interpola la caja. */

type Item = 'home' | 'explore' | 'talk' | 'profile';

const SPRING_DISCO = { type: 'spring', stiffness: 380, damping: 32 } as const;

export function NavMovil({
  onPersonalizar,
  oculto = false,
}: {
  /** Abre la hoja "Personalizar aurora" (el estado vive en App). */
  onPersonalizar: () => void;
  /* Con el personalizador o Suscripción encima, la barra se aparta SIN
     desmontar (fade + bajada + sin puntero) — patrón `oculto` del
     MenuFlotante. Desmontarla perdería el panel/foco al cerrar el overlay. */
  oculto?: boolean;
}) {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const carruselAbierto = useApp((s) => s.carruselAbierto);
  const setCarruselAbierto = useApp((s) => s.setCarruselAbierto);
  const setCarruselAlVolver = useApp((s) => s.setCarruselAlVolver);
  const abrirSuscripcion = useSuscripcion((s) => s.abrir);
  /* Cuenta: misma ranura bidireccional que la píldora Menu (menu-flotante.tsx)
     — con sesión ofrece salir, sin sesión ofrece volver al gate. */
  const usuario = useAuth((s) => s.usuario);
  const logout = useAuth((s) => s.logout);
  const mostrarGate = useAuth((s) => s.mostrarGate);

  const [panelAbierto, setPanelAbierto] = useState(false);
  const perfilBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Si un overlay tapa la barra, el panel no puede quedarse flotando encima.
  useEffect(() => {
    if (oculto) setPanelAbierto(false);
  }, [oculto]);

  // FOCO GESTIONADO del panel: al abrir, a su primera opción…
  useEffect(() => {
    if (!panelAbierto) return;
    panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [panelAbierto]);

  // …y Escape cierra devolviéndolo al ítem Profile (quien lo abrió).
  useEffect(() => {
    if (!panelAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPanelAbierto(false);
      perfilBtnRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelAbierto]);

  /* Ítem activo: con el panel abierto manda Profile (es lo que el usuario
     está mirando); si no, la vista. En el Home la vitrina decide entre Home y
     Explore; en vistas sin ítem propio (story, sube, dna…) no se pinta disco. */
  const activo: Item | null = panelAbierto
    ? 'profile'
    : view === 'home'
      ? carruselAbierto
        ? 'explore'
        : 'home'
      : view === 'talk'
        ? 'talk'
        : view === 'perfil'
          ? 'profile'
          : null;

  const cerrarPanel = (devolverFoco = false) => {
    setPanelAbierto(false);
    if (devolverFoco) perfilBtnRef.current?.focus();
  };

  const items: { id: Item; label: string; Icono: typeof House; onClick: () => void }[] = [
    {
      id: 'home',
      label: 'Home',
      Icono: House,
      /* "Llévame a la portada", no "vuelve por donde viniste" (mismo criterio
         que "Inicio" del Menu): la marca baja ANTES de setView para que este
         no la consuma reabriendo. El cierre de la vitrina va explícito porque
         setView('home') estando YA en el Home la conserva como esté — cubre el
         caso "vitrina abierta, toco Home para cerrarla". */
      onClick: () => {
        cerrarPanel();
        setCarruselAlVolver(false);
        setView('home');
        setCarruselAbierto(false);
      },
    },
    {
      id: 'explore',
      label: 'Explore',
      Icono: Compass,
      // La vitrina, desde cualquier vista. setView('home') primero (si venimos
      // de otra vista, además consume la marca ← que hubiera) y abrir después.
      onClick: () => {
        cerrarPanel();
        setView('home');
        setCarruselAbierto(true);
      },
    },
    {
      id: 'talk',
      label: 'Talk',
      Icono: MessageCircle,
      // setView ya cierra la vitrina al salir del Home (es estado DEL Home).
      onClick: () => {
        cerrarPanel();
        setCarruselAlVolver(false);
        setView('talk');
      },
    },
    {
      id: 'profile',
      label: 'Profile',
      Icono: CircleUserRound,
      onClick: () => setPanelAbierto((v) => !v),
    },
  ];

  /* Las acciones del panel replican la píldora Menu (menu-flotante.tsx:109-139)
     sin las restricciones tipográficas del FloatingMenu (aquí no hay roll de
     letras que coma tildes ni colapse espacios). */
  const opciones = [
    {
      label: 'Perfil',
      onClick: () => {
        cerrarPanel();
        setCarruselAlVolver(false);
        setView('perfil');
      },
    },
    { label: 'Personalizar', onClick: () => { cerrarPanel(); onPersonalizar(); } },
    { label: 'Suscripción', onClick: () => { cerrarPanel(); abrirSuscripcion(); } },
    usuario
      ? { label: 'Cerrar sesión', onClick: () => { cerrarPanel(); void logout(); } }
      : { label: 'Iniciar sesión', onClick: () => { cerrarPanel(); mostrarGate(); } },
  ];

  return (
    /* reducedMotion="user" y no el "always" que MODO_LIGERO impone en la raíz:
       todo teléfono es MODO_LIGERO (pointer:coarse), así que sin esto el disco
       NUNCA se deslizaría en el único aparato donde esta barra existe. Es un
       transform de 42px — barato — y quien pidió menos movimiento en el
       sistema conserva su snap. */
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {panelAbierto && (
          /* Velo de "tap fuera": debajo de la barra (z-59 vs z-60) para que
             los demás ítems sigan tocables con el panel abierto. */
          <motion.div
            className="nav-movil__velo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => cerrarPanel(true)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panelAbierto && (
          <motion.div
            ref={panelRef}
            id="nav-movil-panel"
            role="dialog"
            aria-label="Cuenta y ajustes"
            className="nav-movil__panel"
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {opciones.map((o) => (
              <button key={o.label} type="button" className="nav-movil__opcion" onClick={o.onClick}>
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className={cn('nav-movil', oculto && 'nav-movil--oculto')}
        aria-label="Navegación principal"
        aria-hidden={oculto || undefined}
      >
        {items.map(({ id, label, Icono, onClick }) => (
          <button
            key={id}
            ref={id === 'profile' ? perfilBtnRef : undefined}
            type="button"
            className={cn('nav-movil__item', activo === id && 'nav-movil__item--activo')}
            aria-current={activo === id ? 'page' : undefined}
            aria-expanded={id === 'profile' ? panelAbierto : undefined}
            aria-haspopup={id === 'profile' ? 'dialog' : undefined}
            aria-controls={id === 'profile' && panelAbierto ? 'nav-movil-panel' : undefined}
            onClick={onClick}
          >
            <span className="nav-movil__icono">
              {activo === id && (
                <motion.span
                  layoutId="nav-movil-disco"
                  className="nav-movil__disco"
                  transition={SPRING_DISCO}
                  aria-hidden="true"
                />
              )}
              <Icono size={20} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="nav-movil__label">{label}</span>
          </button>
        ))}
      </nav>
    </MotionConfig>
  );
}
