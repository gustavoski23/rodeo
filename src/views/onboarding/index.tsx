import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Briefcase, User } from 'lucide-react';

import { ChromaticTextReveal } from '@/components/beui/chromatic-text-reveal';
import { BlurFade, GlassButton, GlassStyles } from '@/components/ui/sign-up';
import { GradientBackground } from '@/components/ui/sign-up';
import { BanderaES, BanderaUS } from '@/components/rodeo/banderas';
import { UiLangToggle } from '@/components/rodeo/ui-lang-toggle';
import { useT } from '@/lib/demoStrings';
import { precargarTodoYEsperar } from '@/lib/preload';
import { cn } from '@/lib/utils';
import { store } from '@/lib/storage';
import { useOnboarding, type Nivel } from '@/stores/onboarding';

/* ONBOARDING — las pantallas que van JUSTO después del gate (login o Skip).

   Rama "aprender español": antes de soltar al usuario en el Home, la app le
   pregunta lo mínimo para personalizarse — 1) ¿cómo te llamas?, 2) ¿qué idioma
   quieres aprender? → ¿qué nivel eres? (Básico A1 / Intermedio B1 / Avanzado
   B2–C1), 3) ¿qué te gusta / en qué trabajas? — y cierra con una pantalla de
   "carga" que remata con el ChromaticTextReveal de beui (el texto con motion
   de la captura 1 de Gus).

   La estética es LA MISMA del gate (captura 2): fondo claro cálido con las
   manchas de la GradientBackground y el vidrio VERBATIM de sign-up.tsx
   (GlassStyles + GlassButton + clases .glass-input-*). El tema scopeado
   .ob-tema es copia del .gate-tema de views/gate/index.tsx — convención del
   repo: se copia, no se extrae a una lib compartida — con los extras propios
   de estas pantallas (chips de gustos, puntos de progreso).

   Los datos se persisten al final vía useOnboarding.completar(): rodeo_nombre
   y rodeo_nivel (claves que la app YA lee) + rodeo_idioma / rodeo_intereses /
   rodeo_area (nuevas de esta rama). */

type Paso = 'nombre' | 'idioma' | 'nivel' | 'gustos' | 'carga';

/* Sprint "aprender español" — Gus acota la demo a dos idiomas: español (foco)
   y inglés. Portugués y francés se retiraron a propósito para que la demo no
   prometa más de lo que hay contenido. Cuando entren más idiomas se añaden
   aquí y ya. `nombre` sale del diccionario (ES/EN) según el toggle; solo la
   bandera y el id son fijos.

   La bandera es un COMPONENTE SVG (no emoji): el emoji 🇪🇸/🇺🇸 no renderiza en
   Windows/Chrome (falta la fuente de banderas), así que en la compu se veían
   como "ES"/"US" y en el cel sí como bandera. El SVG se ve igual en todos. */
const IDIOMAS = [
  { id: 'es', Bandera: BanderaES },
  { id: 'en', Bandera: BanderaUS },
] as const;
type IdiomaId = (typeof IDIOMAS)[number]['id'];

/* La pantalla de carga ya no vive un tiempo FIJO: ESPERA a que la precarga
   termine de bajar los chunks de feature (Pélala+three, story, oficina…) y las
   imágenes de la vitrina, para que al entrar al Home todo se sienta fluido y no
   haya "toco SLANG y espero 7 s con la pantalla vacía" (pedido de Gus,
   2026-08-17: «que todo esto se descargue desde esta pantalla; no importa si
   tarda unos segundos»).
   Dos topes la enmarcan: un MÍNIMO para que el reveal cromático respire aunque
   la precarga ya esté caliente (caché), y un MÁXIMO por si la red va lenta o un
   chunk se cae — nunca se cuelga aquí. Con duración 1.1s + pausa 0.6s por
   palabra, el mínimo alcanza ~2 barridos del reveal. */
const CARGA_MIN_MS = 3200;
const CARGA_MAX_MS = 12_000;

const PASOS: Paso[] = ['nombre', 'idioma', 'nivel', 'gustos'];

export function OnboardingView() {
  const completar = useOnboarding((s) => s.completar);
  // Textos ES/EN de la demo — reactivos al toggle que este mismo view monta.
  const t = useT();

  const [paso, setPaso] = useState<Paso>('nombre');
  // Prefill honesto: si el dispositivo ya tenía nombre guardado (testers
  // viejos), la pantalla 1 lo ofrece en vez de fingir que no lo sabe.
  const [nombre, setNombre] = useState(() => store.get<string | null>('rodeo_nombre', null) ?? '');
  const [idioma, setIdioma] = useState<IdiomaId>('es');
  const [nivel, setNivel] = useState<Nivel>('A1');
  const [intereses, setIntereses] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [error, setError] = useState<string | null>(null);

  const nombreRef = useRef<HTMLInputElement>(null);

  // Foco inicial en el nombre, como el Email del gate (useEffect y no
  // autoFocus, para no pelear con el montaje doble de StrictMode).
  useEffect(() => {
    nombreRef.current?.focus();
  }, []);

  function pasarDeNombre() {
    if (!nombre.trim()) {
      setError(t.obNombreVacio);
      nombreRef.current?.focus();
      return;
    }
    setError(null);
    setPaso('idioma');
  }

  function toggleGusto(g: string) {
    setIntereses((xs) => (xs.includes(g) ? xs.filter((x) => x !== g) : [...xs, g]));
  }

  /* Etiquetas derivadas del diccionario (ES/EN). Se recomputan al vuelo:
     idiomaNombre para pintar "Español" / "Inglés" en la lista, aprendiendo
     para la sub-frase del nivel y las palabras del reveal cromático. */
  const nombresIdioma: Record<IdiomaId, string> = { es: t.idiomaEs, en: t.idiomaEn };
  const aprendiendoDe: Record<IdiomaId, string> = { es: t.aprendiendoEs, en: t.aprendiendoEn };
  const NIVELES: { id: Nivel; etiqueta: string; titulo: string; detalle: string }[] = [
    { id: 'A1', etiqueta: 'A1', titulo: t.obNivelBasico, detalle: t.obNivelBasicoDetalle },
    { id: 'B1', etiqueta: 'B1', titulo: t.obNivelIntermedio, detalle: t.obNivelIntermedioDetalle },
    { id: 'B2-C1', etiqueta: 'B2–C1', titulo: t.obNivelAvanzado, detalle: t.obNivelAvanzadoDetalle },
  ];

  /* La "carga" hace DOS cosas a la vez: da aire para que el reveal respire, y
     ESPERA a que la precarga baje todo lo que hace fluido el Home. Al terminar
     persiste TODO de una vez (completar) — App deja de pintar este view solo
     cuando los datos ya están guardados. */
  useEffect(() => {
    if (paso !== 'carga') return;
    let vivo = true;
    const inicio = Date.now();
    // Arranca la descarga de features + imágenes YA (sin esperar idle).
    const preload = precargarTodoYEsperar();
    // Suelta cuando la precarga termine O al vencer el tope, lo que pase antes.
    const tope = new Promise<void>((r) => window.setTimeout(r, CARGA_MAX_MS));
    void Promise.race([preload, tope]).then(() => {
      if (!vivo) return;
      // Pero nunca antes del mínimo, para no cortar el reveal si ya había caché.
      const restante = Math.max(0, CARGA_MIN_MS - (Date.now() - inicio));
      window.setTimeout(() => {
        if (vivo) completar({ nombre, idioma, nivel, intereses, area });
      }, restante);
    });
    return () => {
      vivo = false;
    };
  }, [paso, nombre, idioma, nivel, intereses, area, completar]);

  const aprendiendo = aprendiendoDe[idioma];
  const idxPaso = PASOS.indexOf(paso);

  return (
    /* Mismo chasis que el gate: tema claro scopeado, encima de la app,
       overflow contenido para que las manchas no generen scroll. El scroll
       vive en el wrapper interno (la pantalla de gustos es la más alta). */
    <div className="ob-tema fixed inset-0 z-50 overflow-hidden">
      <GlassStyles />
      <ObTema />

      <div className="absolute inset-0 z-0">
        <GradientBackground />
      </div>

      {/* Toggle ES/ENG también en el onboarding: el usuario ya lo vio en el
          gate y puede querer cambiar de idea a mitad del flujo sin volver. */}
      <div className="absolute right-4 top-[max(14px,env(safe-area-inset-top))] z-20">
        <UiLangToggle />
      </div>

      <div className="relative z-10 flex h-full w-full overflow-y-auto px-6 py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="m-auto flex w-full max-w-[360px] flex-col items-center gap-6">
          {/* Puntos de progreso — se esconden en la carga, que es pantalla
              completa de puro texto. */}
          {paso !== 'carga' && (
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {PASOS.map((p, i) => (
                <span
                  key={p}
                  className={cn('ob-dot', i === idxPaso && 'ob-dot-activo', i < idxPaso && 'ob-dot-hecho')}
                />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={paso}
              initial={{ y: 8, opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex w-full flex-col items-center gap-6"
            >
              {/* ── 1 · ¿CÓMO TE LLAMAS? ─────────────────────────────── */}
              {paso === 'nombre' && (
                <>
                  <BlurFade delay={0.25 * 1} className="w-full">
                    <h1 className="ob-titulo text-center font-serif text-4xl font-light tracking-tight text-balance sm:text-5xl">
                      {t.obNombreTitulo}
                    </h1>
                  </BlurFade>
                  <BlurFade delay={0.25 * 2}>
                    <p className="ob-muted text-center text-sm font-medium">{t.obNombreSub}</p>
                  </BlurFade>
                  <BlurFade delay={0.25 * 3} className="w-full">
                    <div className="glass-input-wrap w-full">
                      <div className="glass-input">
                        <span className="glass-input-text-area" />
                        <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
                          <User className="ob-icono h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        </div>
                        <input
                          ref={nombreRef}
                          type="text"
                          autoComplete="given-name"
                          autoCapitalize="words"
                          spellCheck={false}
                          aria-label={t.obNombrePlaceholder}
                          placeholder={t.obNombrePlaceholder}
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              pasarDeNombre();
                            }
                          }}
                          /* 16 px reales: por debajo, iOS hace zoom al enfocar. */
                          className="ob-input relative z-10 h-full w-0 flex-grow bg-transparent py-3 text-[16px] focus:outline-none"
                        />
                        <div className="relative z-10 w-10 flex-shrink-0 pr-1">
                          <GlassButton
                            type="button"
                            size="icon"
                            onClick={pasarDeNombre}
                            aria-label={t.obContinuar}
                            contentClassName="ob-icono"
                          >
                            <ArrowRight className="h-5 w-5" />
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  </BlurFade>
                  <p role="status" aria-live="polite" className="ob-error min-h-[1.05rem] text-center text-[12.5px]">
                    {error ?? ''}
                  </p>
                </>
              )}

              {/* ── 2 · ¿QUÉ IDIOMA QUIERES APRENDER? ─────────────────── */}
              {paso === 'idioma' && (
                <>
                  <BlurFade delay={0.25 * 1} className="w-full">
                    <h1 className="ob-titulo text-center font-serif text-3xl font-light tracking-tight text-balance sm:text-4xl">
                      {t.obIdiomaTitulo}
                    </h1>
                  </BlurFade>
                  <div className="flex w-full flex-col gap-3">
                    {IDIOMAS.map((i, n) => {
                      const Bandera = i.Bandera;
                      return (
                        <BlurFade key={i.id} delay={0.25 * 2 + n * 0.08} className="w-full">
                          <div className="glass-input-wrap w-full">
                            <button
                              type="button"
                              onClick={() => {
                                setIdioma(i.id);
                                setPaso('nivel');
                              }}
                              className="glass-input w-full cursor-pointer"
                            >
                              <span className="glass-input-text-area" />
                              <span className="relative z-10 flex w-full items-center gap-3 px-4 py-2.5 text-left">
                                <Bandera className="h-5 w-[26px] shrink-0 rounded-[3px] ring-1 ring-black/10" />
                                <span className="ob-titulo text-[15px] font-medium">{nombresIdioma[i.id]}</span>
                                <ArrowRight className="ob-icono ml-auto h-4 w-4 shrink-0" aria-hidden="true" />
                              </span>
                            </button>
                          </div>
                        </BlurFade>
                      );
                    })}
                  </div>
                  <VolverA onClick={() => setPaso('nombre')} etiqueta={t.obVolver} />
                </>
              )}

              {/* ── 2b · ¿QUÉ NIVEL ERES? ─────────────────────────────── */}
              {paso === 'nivel' && (
                <>
                  <BlurFade delay={0.25 * 1} className="w-full">
                    <h1 className="ob-titulo text-center font-serif text-3xl font-light tracking-tight text-balance sm:text-4xl">
                      {t.obNivelTitulo}
                    </h1>
                  </BlurFade>
                  <BlurFade delay={0.25 * 2}>
                    <p className="ob-muted text-center text-sm font-medium">{t.obNivelSub(aprendiendo)}</p>
                  </BlurFade>
                  <div className="flex w-full flex-col gap-3">
                    {NIVELES.map((nv, n) => (
                      <BlurFade key={nv.id} delay={0.25 * 3 + n * 0.08} className="w-full">
                        <div className="glass-input-wrap w-full">
                          <button
                            type="button"
                            onClick={() => {
                              setNivel(nv.id);
                              setPaso('gustos');
                            }}
                            className="glass-input w-full cursor-pointer"
                          >
                            <span className="glass-input-text-area" />
                            <span className="relative z-10 flex w-full items-center gap-3 px-4 py-2.5 text-left">
                              <span className="ob-badge shrink-0 font-mono text-[10.5px] font-bold tracking-[0.08em]">
                                {nv.etiqueta}
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span className="ob-titulo text-[15px] font-medium">{nv.titulo}</span>
                                <span className="ob-muted text-[12px]">{nv.detalle}</span>
                              </span>
                              <ArrowRight className="ob-icono ml-auto h-4 w-4 shrink-0" aria-hidden="true" />
                            </span>
                          </button>
                        </div>
                      </BlurFade>
                    ))}
                  </div>
                  <VolverA onClick={() => setPaso('idioma')} etiqueta={t.obVolver} />
                </>
              )}

              {/* ── 3 · LO QUE TE GUSTA / TU TRABAJO ──────────────────── */}
              {paso === 'gustos' && (
                <>
                  <BlurFade delay={0.25 * 1} className="w-full">
                    <h1 className="ob-titulo text-center font-serif text-3xl font-light tracking-tight text-balance sm:text-4xl">
                      {t.obGustosTitulo}
                    </h1>
                  </BlurFade>
                  <BlurFade delay={0.25 * 2}>
                    <p className="ob-muted text-center text-sm font-medium text-balance">{t.obGustosSub}</p>
                  </BlurFade>
                  <BlurFade delay={0.25 * 3} className="w-full">
                    <div className="flex flex-wrap justify-center gap-2">
                      {t.chips.map((g) => (
                        <button
                          key={g}
                          type="button"
                          aria-pressed={intereses.includes(g)}
                          onClick={() => toggleGusto(g)}
                          className="ob-chip"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </BlurFade>
                  <BlurFade delay={0.25 * 4} className="w-full">
                    <div className="glass-input-wrap w-full">
                      <div className="glass-input">
                        <span className="glass-input-text-area" />
                        <div className="relative z-10 flex w-10 flex-shrink-0 items-center justify-center pl-2">
                          <Briefcase className="ob-icono h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        </div>
                        <input
                          type="text"
                          autoComplete="organization-title"
                          spellCheck={false}
                          aria-label={t.obTrabajoPlaceholder}
                          placeholder={t.obTrabajoPlaceholder}
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setPaso('carga');
                            }
                          }}
                          className="ob-input relative z-10 h-full w-0 flex-grow bg-transparent py-3 text-[16px] focus:outline-none"
                        />
                      </div>
                    </div>
                  </BlurFade>
                  <BlurFade delay={0.25 * 5}>
                    <GlassButton type="button" size="sm" onClick={() => setPaso('carga')}>
                      <span className="ob-titulo flex items-center gap-2 font-medium">
                        {t.obCrear}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </GlassButton>
                  </BlurFade>
                  <VolverA onClick={() => setPaso('nivel')} etiqueta={t.obVolver} />
                </>
              )}

              {/* ── CARGA · el reveal cromático de beui (captura 1) ───────
                  El usuario "espera" mientras el texto barre palabras:
                  "Preparando tu español / vocabulario / práctica…". Y de verdad
                  se prepara: detrás, la precarga baja las features y las
                  imágenes de la vitrina. Cuando termina (o al vencer el tope),
                  completar() persiste y App suelta el Home ya caliente. */}
              {paso === 'carga' && (
                <div className="flex flex-col items-center gap-5 py-10 text-center">
                  <ChromaticTextReveal
                    prefix={t.cargaPrefix}
                    words={t.cargaPalabras(aprendiendo)}
                    foregroundColor="var(--foreground)"
                    duration={1.1}
                    pauseDuration={0.6}
                    startOnView={false}
                    className="ob-titulo font-serif text-3xl font-light tracking-tight sm:text-4xl"
                  />
                  <p className="ob-muted text-sm font-medium">{t.cargaSub(nombre.trim())}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* El "← Volver" de sign-up (Go back), en la voz de la app. `etiqueta` la
   inyecta el view desde el diccionario ES/EN para que traduzca al vuelo. */
function VolverA({ onClick, etiqueta }: { onClick: () => void; etiqueta: string }) {
  return (
    <BlurFade delay={0.25 * 2}>
      <button
        type="button"
        onClick={onClick}
        className="ob-muted flex cursor-pointer items-center gap-2 text-sm transition-opacity hover:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {etiqueta}
      </button>
    </BlurFade>
  );
}

/* Tema CLARO y cálido del onboarding, SCOPEADO a .ob-tema. Copia del
   .gate-tema de views/gate/index.tsx (mismo papel, mismas manchas, mismo
   puente de tokens — la captura 2 manda), más los extras de estas pantallas:
   chips de gustos, badge de nivel y puntos de progreso. Si el gate cambia de
   paleta, esta copia se actualiza a mano — convención del repo. */
const ObTema = () => (
  <style>{`
    .ob-tema {
      color-scheme: light;
      background: oklch(97.5% 0.012 85);

      /* Crudos para el vidrio */
      --background: oklch(97% 0.014 85);
      --foreground: oklch(25% 0.02 265);

      /* Manchas de la captura — la ronda "gradiente intensa" del gate. */
      --color-primary: oklch(78% 0.115 250);
      --color-secondary: oklch(80% 0.155 72);
      --color-accent: oklch(80% 0.105 246);
      --color-destructive: oklch(74% 0.175 30);
      --color-chart-1: oklch(82% 0.15 80);
      --color-chart-2: oklch(80% 0.15 58);
      --color-chart-3: oklch(82% 0.095 244);
      --color-chart-4: oklch(78% 0.165 58);
      --color-chart-5: oklch(81% 0.14 42);

      /* Puente Tailwind re-mapeado (tintas oscuras sobre papel) */
      --color-foreground: var(--foreground);
      --color-muted-foreground: oklch(48% 0.015 265);
      --color-border: oklch(25% 0.02 265 / 0.14);
    }
    /* Manchas al doble de velocidad, igual que el gate (mismo selector, misma
       razón: la animación viene inline y solo cede ante !important). */
    .ob-tema svg[viewBox="0 0 800 600"] > g:first-of-type { animation-duration: 10s !important; }
    .ob-tema svg[viewBox="0 0 800 600"] > g:last-of-type { animation-duration: 12.5s !important; }

    .ob-titulo { color: var(--foreground); }
    .ob-muted { color: oklch(48% 0.015 265); }
    .ob-icono { color: oklch(from var(--foreground) l c h / 82%); }
    .ob-input { color: var(--foreground); }
    .ob-input::placeholder { color: oklch(from var(--foreground) l c h / 55%); }
    .ob-error { color: oklch(52% 0.18 28); }

    /* Badge del nivel (A1 / B1 / B2–C1): pastilla de tinta suave. */
    .ob-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.6rem;
      padding: 0.3rem 0.45rem;
      border-radius: 9999px;
      border: 1px solid oklch(from var(--foreground) l c h / 22%);
      color: oklch(from var(--foreground) l c h / 75%);
      background: oklch(from var(--background) l c h / 45%);
    }

    /* Chips de gustos: vidrio ligero (misma receta de fondo/sombra que el
       .glass-button, sin su coreografía) con estado seleccionado en tinta. */
    .ob-chip {
      cursor: pointer;
      border-radius: 9999px;
      padding: 0.5rem 0.85rem;
      font-size: 13.5px;
      font-weight: 500;
      color: oklch(from var(--foreground) l c h / 80%);
      background: linear-gradient(-75deg,
        oklch(from var(--background) l c h / 10%),
        oklch(from var(--background) l c h / 30%),
        oklch(from var(--background) l c h / 10%));
      backdrop-filter: blur(3px);
      border: 1px solid oklch(from var(--foreground) l c h / 18%);
      box-shadow:
        inset 0 1px 1px oklch(from var(--background) l c h / 60%),
        0 2px 6px oklch(from var(--foreground) l c h / 8%);
      transition: all 200ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .ob-chip:hover { transform: scale(0.97); }
    .ob-chip[aria-pressed="true"] {
      color: oklch(97% 0.014 85);
      background: oklch(from var(--foreground) l c h / 92%);
      border-color: transparent;
      box-shadow: 0 2px 8px oklch(from var(--foreground) l c h / 25%);
    }

    /* Puntos de progreso: el activo se estira a píldora. */
    .ob-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: oklch(25% 0.02 265 / 0.18);
      transition: all 300ms ease;
    }
    .ob-dot-activo { width: 22px; background: oklch(25% 0.02 265 / 0.75); }
    .ob-dot-hecho { background: oklch(25% 0.02 265 / 0.45); }
  `}</style>
);

export default OnboardingView;
