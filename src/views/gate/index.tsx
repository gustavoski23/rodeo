import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import { BorderBeam } from '@/components/magicui/border-beam';
import { LiquidGlassCard } from '@/components/ui/liquid-glass';
import { useAuth } from '@/stores/auth';

/* GATE — la puerta: lo primero que se ve al abrir la app.

   Card de vidrio sobre el mismo negro del Home (#14161a) con el haz del
   BorderBeam recorriendo el borde. La card NO es draggable ni expandable a
   propósito: es una puerta, no un juguete — arrastrarla o abrirla de un toque
   solo estorbaría a quien viene a escribir su correo.

   Los labels van en inglés como la captura del dueño (Login/Register/Email/
   Password/Skip); todo lo que EXPLICA algo — errores, avisos, ayudas — va en
   español, que es el idioma en el que la app le habla al usuario.

   "Skip" no es un botón de segunda: es la salida honesta. RODEO funciona
   entera sin cuenta, y quien no quiera registrarse pasa igual. */

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

  const emailRef = useRef<HTMLInputElement>(null);

  /* El gate vive SIEMPRE en oscuro (fondo #14161a + card de vidrio oscura):
     con el tema claro activo, los tokens resolvían texto oscuro sobre card
     oscura y el título desaparecía. Mientras el gate está montado se fuerza
     el tema oscuro en <html> y al salir se restaura el del usuario. */
  useLayoutEffect(() => {
    const html = document.documentElement;
    const previo = html.getAttribute('data-theme');
    html.removeAttribute('data-theme'); // sin atributo = oscuro (tokens.css)
    return () => {
      if (previo !== null) html.setAttribute('data-theme', previo);
    };
  }, []);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 pt-[max(20px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]"
      style={{ background: '#14161a' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="w-full max-w-[360px]"
      >
        {/* overflow-hidden + el `relative` que ya trae la card: sin los dos, el
            cuadrado del haz se sale por las esquinas redondeadas. */}
        <LiquidGlassCard
          draggable={false}
          expandable={false}
          borderRadius="28px"
          blurIntensity="lg"
          glowIntensity="xs"
          shadowIntensity="xs"
          className="w-full overflow-hidden"
        >
          {/* El haz va por ENCIMA de las capas de vidrio (z-10/z-20 internas),
              por eso el envoltorio con z-30. */}
          <div className="pointer-events-none absolute inset-0 z-30 rounded-[inherit]">
            <BorderBeam
              size={110}
              duration={7}
              borderWidth={1.5}
              colorFrom="var(--accent)"
              colorTo="var(--card-blue)"
            />
          </div>

          <form
            className="relative z-40 flex flex-col gap-4 px-6 py-7"
            aria-busy={ocupado}
            onSubmit={(e) => {
              e.preventDefault();
              void correr('login');
            }}
          >
            <h1 className="font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
              Login
            </h1>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="gate-email" className="font-mono text-[11px] tracking-[0.08em] uppercase" style={{ color: 'var(--text-muted)' }}>
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
                className="w-full rounded-[14px] border px-4 py-3 text-[16px] outline-none focus-visible:border-[var(--accent)]"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="gate-pass" className="font-mono text-[11px] tracking-[0.08em] uppercase" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <input
                id="gate-pass"
                type="password"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full rounded-[14px] border px-4 py-3 text-[16px] outline-none focus-visible:border-[var(--accent)]"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--borde-sutil)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Register a la izquierda, Login a la derecha (captura del dueño).
                Login es el submit: Enter desde cualquier campo entra. */}
            <div className="flex gap-2.5 pt-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                disabled={ocupado}
                aria-busy={cargando === 'register'}
                onClick={() => void correr('register')}
                className="flex-1 cursor-pointer rounded-[14px] border py-3 text-[15px] font-medium transition-colors disabled:cursor-default disabled:opacity-45"
                style={{ background: 'var(--chip-bg-fuerte)', borderColor: 'var(--borde-medio)', color: 'var(--text-primary)' }}
              >
                Register
              </motion.button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={ocupado}
                aria-busy={cargando === 'login'}
                className="flex-1 cursor-pointer rounded-[14px] border border-transparent py-3 text-[15px] font-semibold transition-opacity disabled:cursor-default disabled:opacity-45"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                Login
              </motion.button>
            </div>

            {/* Hueco reservado para "Continuar con Google" (lo pidió Gus para
                después). Ojo al portarlo: signInWithOAuth NO valida el provider
                en el cliente, así que el botón solo debe pintarse si
                /auth/v1/settings dice external.google === true — si no, el
                usuario aterriza en el JSON crudo "provider is not enabled"
                (la historia completa está en public/js/supabase-sync.js).

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1" style={{ background: 'var(--borde-sutil)' }} />
              <span className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>o</span>
              <span className="h-px flex-1" style={{ background: 'var(--borde-sutil)' }} />
            </div>
            <button type="button" onClick={() => void loginConGoogle()}>Continuar con Google</button>
            */}

            {/* Región viva única: error, aviso y "un momento" comparten sitio
                para que el lector de pantalla anuncie uno solo por vez y la
                card no salte de alto con cada estado. */}
            <p
              role="status"
              aria-live="polite"
              className="min-h-[1.05rem] text-center text-[12.5px] leading-[1.45]"
              style={{ color: error ? 'var(--texto-mal)' : aviso ? 'var(--warn)' : 'var(--text-muted)' }}
            >
              {error ?? aviso ?? (ocupado ? 'Un momento…' : '')}
            </p>

            {/* Skip: centrado y discreto, justo donde lo puso Gus. */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={skip}
                className="cursor-pointer rounded-full px-3 py-1.5 text-[13px] underline underline-offset-4 transition-colors hover:text-[var(--text-secondary)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Skip
              </button>
            </div>
          </form>
        </LiquidGlassCard>
      </motion.div>
    </div>
  );
}

export default GateView;
