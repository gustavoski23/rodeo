import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';

import { GradienteOrbita } from '@/components/rodeo/gradiente-orbita';
import { useAuth } from '@/stores/auth';
import type { RectCard } from './losa-vidrio';

import './liquid-glass-macos.css';

/* GATE — la puerta: lo primero que se ve al abrir la app.

   Tres capas, las tres del spec de Gus:
   0. La gradiente "Orbit Sweep" (21st.dev) girando por rAF — en DOM, siempre
      presente: es el fallback si no hay WebGL o si el usuario pidió menos
      movimiento.
   1. FluidGlass (React Bits) en modo lens: un lente 3D que sigue el puntero y
      refracta la misma gradiente + el wordmark. Va lazy en su propio chunk
      (three pesa) y solo se monta con WebGL disponible. En la misma escena va
      la LOSA: el vidrio 3D de la card (ver losa-vidrio.tsx).
   2. El formulario: Login · Email · Password · Register+Login · Skip centrado.
      Con WebGL, la card NO pone vidrio propio — el vidrio es la losa 3D que
      está detrás, medida contra este mismo rectángulo; la card solo aporta el
      contenido. Sin WebGL (o si el 3D se cae) recupera el vidrio líquido CSS
      de macOS (lucasromerodb), que es el fallback.

   El gate ya no depende del tema de la app (la gradiente ES el fondo), así
   que no fuerza data-theme.

   "Skip" no es un botón de segunda: es la salida honesta. RODEO funciona
   entera sin cuenta, y quien no quiera registrarse pasa igual. */

const FluidGate = lazy(() => import('./fluid-gate'));

/* Si el mundo 3D falla (glb que no carga, WebGL que muere a mitad), el gate
   NO puede caerse con él: la capa 0 (gradiente DOM) + la card son la misma
   pantalla sin lente. Sin este muro, un error dentro de Suspense desmonta la
   app entera. */
class MuroLente extends Component<{ children: ReactNode; onRoto?: () => void }, { roto: boolean }> {
  state = { roto: false };
  static getDerivedStateFromError() {
    return { roto: true };
  }
  componentDidCatch() {
    /* silencioso: el fallback ya está en pantalla. Solo avisa al gate para que
       la card recupere su vidrio CSS: si el 3D murió, la losa no está y una
       card transparente se quedaría sin vidrio ninguno. */
    this.props.onRoto?.();
  }
  render() {
    return this.state.roto ? null : this.props.children;
  }
}

function hayWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Accion = 'login' | 'register' | null;

export function GateView() {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const skip = useAuth((s) => s.skip);

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState<Accion>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Decidido una vez al montar: el soporte WebGL no cambia en vivo.
  const [conLente] = useState(() => hayWebGL() && !REDUCED());

  const emailRef = useRef<HTMLInputElement>(null);

  /* ── Sincronía card DOM ↔ losa 3D ──────────────────────────────────────
     La losa tiene que caer EXACTAMENTE detrás de este rectángulo, así que la
     medida sale del DOM (única fuente de verdad) y viaja como prop al chunk
     3D. El ref va en un envoltorio SIN animación: la motion.div de dentro
     lleva un translateY de entrada y getBoundingClientRect lo incluiría,
     dejando la losa 14 px desplazada durante el primer medio segundo. */
  const cajaRef = useRef<HTMLDivElement>(null);
  const [rectCard, setRectCard] = useState<RectCard | null>(null);
  const [losaLista, setLosaLista] = useState(false);
  const [lenteRoto, setLenteRoto] = useState(false);

  useEffect(() => {
    const el = cajaRef.current;
    if (!conLente || !el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      setRectCard((prev) =>
        prev && prev.x === r.left && prev.y === r.top && prev.w === r.width && prev.h === r.height
          ? prev // mismo rect: no re-renderizar el 3D por nada
          : { x: r.left, y: r.top, w: r.width, h: r.height },
      );
    };
    medir();
    // ResizeObserver coge también los cambios de alto de la card (el aviso de
    // "te mandé un correo" ocupa varias líneas); resize coge el giro/teclado.
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [conLente]);

  /* El vidrio CSS solo se apaga cuando el de verdad ya está en pantalla: entre
     el primer paint y el chunk 3D cargado la card sigue siendo de vidrio, y si
     el 3D se cae vuelve a serlo. */
  const conLosa = conLente && losaLista && !lenteRoto;

  // Foco inicial en Email: al abrir la puerta, el cursor ya está donde se
  // empieza. (Sin autoFocus en el JSX para no pelear con el montaje doble de
  // StrictMode ni con el teclado de iOS al primer paint.)
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const ocupado = cargando !== null;

  async function correr(accion: Exclude<Accion, null>) {
    if (ocupado) return;
    setError(null);
    setAviso(null);

    // Validación local antes de gastar un viaje al servidor: los errores de
    // formato los sabemos aquí y el mensaje llega al instante.
    const correo = email.trim();
    if (correo.indexOf('@') < 1) {
      setError('Escribe un correo válido.');
      emailRef.current?.focus();
      return;
    }
    if (accion === 'register' ? pass.length < 6 : pass.length === 0) {
      setError(accion === 'register' ? 'La contraseña necesita al menos 6 caracteres.' : 'Escribe tu contraseña.');
      return;
    }

    setCargando(accion);
    const r = accion === 'login' ? await login(correo, pass) : await register(correo, pass);
    setCargando(null);

    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    /* Registro OK pero sin sesión: Supabase mandó el correo de confirmación.
       No lo dejamos atrapado esperando — el aviso apunta a Skip. */
    if (r.confirmar) {
      setPass('');
      setAviso(`Te mandé un correo a ${correo}. Confirma el enlace y entra con Login. Mientras tanto puedes seguir con Skip.`);
    }
    // Éxito con sesión: el store ya apagó gateNecesario y esta vista se va.
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: '#FF5F6D' }}>
      {/* Capa 0: la órbita en DOM — visible al instante y fallback sin WebGL. */}
      <GradienteOrbita className="absolute inset-0" />

      {/* Capa 1: el lente. Suspense sin placeholder: mientras carga el chunk
          3D ya se ve la gradiente de la capa 0 (mismo dibujo, sin salto). */}
      {conLente && (
        <div className="absolute inset-0">
          <MuroLente onRoto={() => setLenteRoto(true)}>
            <Suspense fallback={null}>
              <FluidGate rect={rectCard} onLosaLista={() => setLosaLista(true)} />
            </Suspense>
          </MuroLente>
        </div>
      )}

      {/* Capa 2: el formulario. Con losa 3D detrás va sin vidrio propio. */}
      <div className="absolute inset-0 flex items-center justify-center px-5 pt-[max(20px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]">
        {/* Este div es el que se MIDE: mismo box que la card y sin transform. */}
        <div ref={cajaRef} className="w-full max-w-[360px]">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="w-full"
          >
            <div className={`glassContainer gate-card${conLosa ? ' gate-card--losa' : ''}`}>
            <form
              className="relative z-10 flex flex-col gap-4"
              aria-busy={ocupado}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void correr('login');
              }}
            >
              <h1
                className="font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] text-white"
                style={{ textShadow: '0 1px 12px rgb(0 0 0 / 0.35)' }}
              >
                Login
              </h1>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gate-email" className="font-mono text-[11px] tracking-[0.08em] text-white/80 uppercase">
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="gate-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  /* 16 px reales: por debajo, iOS hace zoom al enfocar el campo. */
                  className="w-full rounded-[14px] px-4 py-3 text-[16px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gate-pass" className="font-mono text-[11px] tracking-[0.08em] text-white/80 uppercase">
                  Password
                </label>
                <input
                  id="gate-pass"
                  type="password"
                  autoComplete="current-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full rounded-[14px] px-4 py-3 text-[16px]"
                />
              </div>

              {/* Register a la izquierda, Login a la derecha (captura del dueño).
                  Login es el submit: Enter desde cualquier campo entra. Los dos
                  son .glassBtn del efecto macOS — el vidrio es el botón. */}
              <div className="flex gap-2.5 pt-1">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  disabled={ocupado}
                  aria-busy={cargando === 'register'}
                  onClick={() => void correr('register')}
                  className="glassBtn gate-btn text-[15px] font-medium text-white disabled:cursor-default disabled:opacity-45"
                >
                  Register
                </motion.button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  disabled={ocupado}
                  aria-busy={cargando === 'login'}
                  className="glassBtn gate-btn text-[15px] font-semibold text-white disabled:cursor-default disabled:opacity-45"
                  style={{ textShadow: '0 1px 8px rgb(0 0 0 / 0.4)' }}
                >
                  Login
                </motion.button>
              </div>

              {/* Hueco reservado para "Continuar con Google" (lo pidió Gus para
                  después). Ojo al portarlo: signInWithOAuth NO valida el provider
                  en el cliente, así que el botón solo debe pintarse si
                  /auth/v1/settings dice external.google === true — si no, el
                  usuario aterriza en el JSON crudo "provider is not enabled"
                  (la historia completa está en public/js/supabase-sync.js). */}

              {/* Región viva única: error, aviso y "un momento" comparten sitio
                  para que el lector de pantalla anuncie uno solo por vez y la
                  card no salte de alto con cada estado. */}
              <p
                role="status"
                aria-live="polite"
                className="min-h-[1.05rem] text-center text-[12.5px] leading-[1.45]"
                style={{
                  color: error ? '#ffd7d7' : 'rgb(255 255 255 / 0.85)',
                  textShadow: '0 1px 6px rgb(0 0 0 / 0.45)',
                }}
              >
                {error ?? aviso ?? (ocupado ? 'Un momento…' : '')}
              </p>

              {/* Skip: centrado y discreto, justo donde lo puso Gus. */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={skip}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-[13px] text-white/85 underline underline-offset-4 transition-colors hover:text-white"
                  style={{ textShadow: '0 1px 6px rgb(0 0 0 / 0.45)' }}
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Filtros del vidrio macOS — el contenido del filtro es el del repo
          (feTurbulence → feDisplacementMap), registrado bajo los DOS ids que
          usa el CSS pegado por Gus (su versión los llamaba #container-glass y
          #btn-glass; el repo hoy trae uno solo, #glass-distortion — misma
          receta, ids duplicados aquí para que su CSS quede intacto). */}
      <svg style={{ display: 'none' }} aria-hidden="true">
        <filter id="container-glass" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting
            in="softMap"
            surfaceScale="5"
            specularConstant="1"
            specularExponent="100"
            lightingColor="white"
            result="specLight"
          >
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="btn-glass" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting
            in="softMap"
            surfaceScale="5"
            specularConstant="1"
            specularExponent="100"
            lightingColor="white"
            result="specLight"
          >
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </div>
  );
}

export default GateView;
