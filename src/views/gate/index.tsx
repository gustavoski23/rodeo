import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';

import {
  AppleIcon,
  BlurFade,
  GlassButton,
  GlassStyles,
  GoogleIcon,
  GradientBackground,
  XIcon,
} from '@/components/ui/sign-up';
import { store } from '@/lib/storage';
import { useAuth } from '@/stores/auth';
import { toast } from '@/stores/toast';

/* GATE — la puerta: lo primero que se ve al abrir la app.

   Rediseñado al LOOK OBJETIVO que aprobó Gus (la captura "Get started with
   Us"): fondo CLARO y cálido, columna centrada con la estética "glass" del
   componente sign-up.tsx. Ya NO hay mundo 3D (FluidGate/losa-vidrio/
   GradienteOrbita quedan en el repo pero no se importan aquí): esta puerta
   tiene su propio look claro y NO depende del tema de la app.

   El vidrio (botones e input) viene VERBATIM del componente sign-up.tsx —
   GlassStyles (todo el CSS del vidrio), GlassButton y las clases .glass-input-*
   — para que el borde helado y el brillo especular sean EXACTOS, no un óvalo
   plano reinventado.

   El problema de tokens que hay que resolver: el CSS del vidrio usa
   `var(--background)` y `var(--foreground)` CRUDOS, y la GradientBackground usa
   `var(--color-chart-1..5)` + `var(--color-primary/-secondary/-accent/
   -destructive)`. En RODEO esos nombres no existen tal cual (usamos
   --bg-void/--text-primary con un puente --color-*, y en tema oscuro). Solución:
   un tema CLARO y cálido SCOPEADO al contenedor del gate (.gate-tema) que
   define esas variables reales — sin tocar el tema global de la app. Ahí también
   re-mapeamos el puente Tailwind (--color-foreground, --color-muted-foreground,
   --color-border) a valores oscuros para que el texto se lea sobre el papel. */

/* ¿Correo con pinta de válido? Mismo criterio laxo del gate anterior: formato,
   no existencia. El login con contraseña llega después; aquí solo abrimos la
   puerta recordando el correo. */
const CORREO_OK = /\S+@\S+\.\S+/;

export function GateView() {
  const skip = useAuth((s) => s.skip);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  // Foco inicial en Email: al abrir la puerta, el cursor ya está donde se
  // empieza. (En useEffect, no autoFocus, para no pelear con el montaje doble
  // de StrictMode.)
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  /* Email + flecha/Enter: si el correo es válido lo recordamos y pasamos con
     skip() (misma salida honesta que el botón Skip). Si no, aviso corto. */
  function entrarConEmail() {
    const correo = email.trim();
    if (!CORREO_OK.test(correo)) {
      setError('Escribe un correo válido.');
      emailRef.current?.focus();
      return;
    }
    setError(null);
    store.set('rodeo_email', correo);
    skip();
  }

  // Sociales: por ahora solo visuales. No rompen nada; avisan que llegan pronto.
  const proximamente = () => toast('Pronto lo activamos');

  return (
    /* .gate-tema: tema claro cálido scopeado. `fixed inset-0 z-50` encima de la
       app; overflow oculto para que las manchas borrosas no generen scroll. */
    <div className="gate-tema fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <GlassStyles />
      <GateTema />

      {/* Fondo: manchas de color borrosas (SVG del componente) sobre papel
          cálido. La animación float1/float2 la trae la propia GradientBackground. */}
      <div className="absolute inset-0 z-0">
        <GradientBackground />
      </div>

      {/* Columna centrada, ~media pantalla, ancho contenido. */}
      <div className="relative z-10 flex w-full max-w-[340px] flex-col items-center gap-6 px-6">
        <BlurFade delay={0.25 * 1} className="w-full">
          {/* whitespace-nowrap: el título vive en UNA línea (como en el
              componente original), aunque la columna esté acotada a 340px —
              desborda centrado, que es el look de la captura. */}
          <h1 className="gate-titulo whitespace-nowrap text-center font-serif text-4xl font-light tracking-tight sm:text-5xl">
            Get started with Us
          </h1>
        </BlurFade>

        <BlurFade delay={0.25 * 2}>
          <p className="gate-muted text-sm font-medium">Continue with</p>
        </BlurFade>

        {/* Fila de botones sociales vidrio: iguales (size icon), uno al lado del
            otro, centrados. Google conserva sus colores de marca; Apple y X van
            en color foreground (currentColor). SIN GitHub. */}
        <BlurFade delay={0.25 * 3}>
          <div className="flex items-center justify-center gap-4">
            <GlassButton
              type="button"
              size="icon"
              onClick={proximamente}
              aria-label="Continuar con Google"
            >
              <GoogleIcon />
            </GlassButton>
            <GlassButton
              type="button"
              size="icon"
              onClick={proximamente}
              aria-label="Continuar con Apple"
              contentClassName="gate-icono"
            >
              <AppleIcon />
            </GlassButton>
            <GlassButton
              type="button"
              size="icon"
              onClick={proximamente}
              aria-label="Continuar con X"
              contentClassName="gate-icono"
            >
              <XIcon />
            </GlassButton>
          </div>
        </BlurFade>

        {/* Separador OR con líneas finas a los lados. */}
        <BlurFade delay={0.25 * 4} className="w-full">
          <div className="flex w-full items-center gap-3">
            <span className="gate-linea h-px flex-1" />
            <span className="gate-muted text-xs font-semibold">OR</span>
            <span className="gate-linea h-px flex-1" />
          </div>
        </BlurFade>

        {/* Input Email vidrio (píldora) con icono de sobre y flecha de envío. */}
        <BlurFade delay={0.25 * 5} className="w-full">
          <div className="glass-input-wrap w-full">
            <div className="glass-input">
              <span className="glass-input-text-area" />
              <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
                <Mail className="gate-icono h-5 w-5 flex-shrink-0" aria-hidden="true" />
              </div>
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-label="Email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    entrarConEmail();
                  }
                }}
                /* 16 px reales: por debajo, iOS hace zoom al enfocar el campo.
                   Color/placeholder salen del puente re-mapeado en .gate-tema. */
                className="gate-input relative z-10 h-full w-0 flex-grow bg-transparent py-3 text-[16px] focus:outline-none"
              />
              <div className="relative z-10 w-10 flex-shrink-0 pr-1">
                <GlassButton
                  type="button"
                  size="icon"
                  onClick={entrarConEmail}
                  aria-label="Entrar con este correo"
                  contentClassName="gate-icono"
                >
                  <ArrowRight className="h-5 w-5" />
                </GlassButton>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Aviso corto (solo cuando hay error de formato). Región viva única. */}
        <p role="status" aria-live="polite" className="gate-error min-h-[1.05rem] text-center text-[12.5px]">
          {error ?? ''}
        </p>

        {/* Skip: vidrio, píldora, centrado, JUSTO DEBAJO del Email. La salida
            honesta — marca rodeo_gate_skip y entra al Home; no reaparece. */}
        <BlurFade delay={0.25 * 6}>
          <GlassButton type="button" size="sm" onClick={skip}>
            <span className="gate-titulo font-medium">Skip</span>
          </GlassButton>
        </BlurFade>
      </div>
    </div>
  );
}

/* Tema CLARO y cálido de la puerta, SCOPEADO a .gate-tema. Define:
   · --background/--foreground CRUDOS que consume el CSS del vidrio (GlassStyles).
   · --color-chart-1..5 + --color-primary/-secondary/-accent/-destructive que
     consume la GradientBackground para pintar las manchas de la captura:
       - amber/ámbar arriba-derecha  (grad2: secondary + chart-1 + chart-4)
       - durazno/coral abajo-derecha (grad3: destructive + chart-5)
       - gris-azulado frío a la izquierda (accent arriba-izq + grad1 abajo-izq:
         primary + chart-3)
   · re-mapeo del puente Tailwind (--color-foreground/-muted-foreground/-border)
     a tintas oscuras para que el texto se lea sobre el papel — sin esto,
     text-foreground heredaría el blanco del tema oscuro global y no se vería. */
const GateTema = () => (
  <style>{`
    .gate-tema {
      color-scheme: light;
      background: oklch(97.5% 0.012 85);

      /* Crudos para el vidrio */
      --background: oklch(97% 0.014 85);
      --foreground: oklch(25% 0.02 265);

      /* Manchas de la captura — VIVAS (ronda "gradiente intensa" de Gus): el
         lavado tímido de antes (chroma .035–.11) subió a .11–.22 manteniendo
         la luminosidad alta (70–80%), así el papel sigue claro y el título
         oscuro se lee, pero el ámbar es ámbar, el coral es coral y el azulado
         tiene cuerpo en vez de ser gris. */
      --color-primary: oklch(78% 0.115 250);       /* azulado con cuerpo (izq) */
      --color-secondary: oklch(80% 0.155 72);      /* ámbar (arriba-der) */
      --color-accent: oklch(80% 0.105 246);        /* azulado (arriba-izq) */
      --color-destructive: oklch(74% 0.175 30);    /* coral (abajo-der) */
      --color-chart-1: oklch(82% 0.15 80);         /* ámbar cálido */
      --color-chart-2: oklch(80% 0.15 58);
      --color-chart-3: oklch(82% 0.095 244);       /* azul con presencia */
      --color-chart-4: oklch(78% 0.165 58);        /* naranja/ámbar */
      --color-chart-5: oklch(81% 0.14 42);         /* durazno */

      /* Puente Tailwind re-mapeado (tintas oscuras sobre papel) */
      --color-foreground: var(--foreground);
      --color-muted-foreground: oklch(48% 0.015 265);
      --color-border: oklch(25% 0.02 265 / 0.14);
    }
    /* Velocidad al DOBLE. Los dos <g> de la GradientBackground llevan la
       animación INLINE ("float1 20s" y "float2 25s"), y el estilo inline gana
       a cualquier hoja: el único override posible es !important, y hay que
       distinguirlos por posición porque ninguno tiene clase.
         primer <g>  → float1: 20s → 10s
         último <g>  → float2: 25s → 12.5s
       Solo se toca la duración; la curva y el keyframe siguen siendo los del
       componente sign-up (que NO se edita). */
    .gate-tema svg g:first-of-type { animation-duration: 10s !important; }
    .gate-tema svg g:last-of-type { animation-duration: 12.5s !important; }

    .gate-titulo { color: var(--foreground); }
    .gate-muted { color: oklch(48% 0.015 265); }
    .gate-linea { background: oklch(25% 0.02 265 / 0.16); }
    .gate-icono { color: oklch(from var(--foreground) l c h / 82%); }
    .gate-input { color: var(--foreground); }
    .gate-input::placeholder { color: oklch(from var(--foreground) l c h / 55%); }
    .gate-error { color: oklch(52% 0.18 28); }
  `}</style>
);

export default GateView;
