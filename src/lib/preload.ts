type ConexionNavegador = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavegadorConConexion = Navigator & {
  connection?: ConexionNavegador;
};

type VentanaConIdle = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

let interaccionesHomeListas = false;
let promesaInteraccionesHome: Promise<void> | null = null;
const EVENTO_HOME_PRELOAD = 'rodeo:home-interacciones-listas';

export function homeInteraccionesPrecargadas(): boolean {
  return interaccionesHomeListas;
}

function puedePrecargar(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const conexion = (navigator as NavegadorConConexion).connection;
  if (conexion?.saveData || conexion?.effectiveType === 'slow-2g' || conexion?.effectiveType === '2g') {
    return false;
  }

  return true;
}

/** ¿La red aguanta bajar los chunks PESADOS por adelantado (features + WebGL)?
    Más estricto que `puedePrecargar`: en 3g preferimos que la vitrina y el menú
    estén listos y dejar las features para cuando se pidan, en vez de saturar la
    conexión y hacer que hasta el Home tironee. En 4g/wifi se precarga todo. */
function puedePrecargarPesado(): boolean {
  if (!puedePrecargar()) return false;
  const conexion = (navigator as NavegadorConConexion).connection;
  return conexion?.effectiveType !== '3g';
}

function programar(cargar: () => void, esperaFallback: number, timeoutIdle: number): () => void {
  if (!puedePrecargar()) return () => undefined;

  const ejecutar = () => {
    if (document.visibilityState !== 'visible') return;
    cargar();
  };

  const win = window as VentanaConIdle;
  if (win.requestIdleCallback) {
    const id = win.requestIdleCallback(ejecutar, { timeout: timeoutIdle });
    return () => win.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(ejecutar, esperaFallback);
  return () => window.clearTimeout(id);
}

/* ── Imágenes de la vitrina ─────────────────────────────────────────────────
   Las cartas del carrusel entran con la foto en `loading="lazy"` (salvo la del
   frente): al abrir la vitrina, las demás se ven TRANSPARENTES hasta que el
   navegador decide bajarlas, y en PC eso eran ~2 s de cartas vacías (medido).
   Se calientan por adelantado con un `new Image()` que copia el srcset/sizes
   EXACTO de la carta (card-fan-carousel.tsx): setear `srcset` en una imagen
   suelta dispara la MISMA selección responsive y baja el MISMO archivo que
   pedirá la <img> al montarse, que lo reutiliza de caché — cero descarga doble.
   Se usa Image y no `<link rel=preload>` a propósito: el link avisaría
   "preloaded but not used" en consola si el usuario tarda en abrir la vitrina.
   Las portadas de libro (.webp) no tienen variantes, van con `src` directo. El
   CONTENIDO de los libros (caras, curl WebGL) NO se toca: sigue bajándose al
   tocar la carta, que es lo que pidió Gus. */
const IMAGENES_VITRINA_OPT = ['oficina', 'slang', 'conversacion', 'podcast', 'dna'];
const IMAGENES_VITRINA_DIRECTAS = [
  '/libro/o00-portada.webp',
  '/libro/v00-portada.webp',
  '/libro/00-portada.webp',
];
// El mismo `sizes` que declara la carta, para que el navegador resuelva igual.
const SIZES_VITRINA = '(max-width: 479px) 128px, (max-width: 767px) 208px, 260px';

let imagenesVitrinaListas = false;
function precargarImagenesVitrina(): void {
  if (imagenesVitrinaListas || typeof window === 'undefined') return;
  imagenesVitrinaListas = true;

  for (const nombre of IMAGENES_VITRINA_OPT) {
    const img = new Image();
    img.sizes = SIZES_VITRINA;
    // La misma lista AVIF que declara el <source> de la carta. Setear srcset
    // dispara la selección + descarga de la variante que tocará.
    img.srcset = `/carrusel/${nombre}-400.avif 400w, /carrusel/${nombre}.avif 800w`;
  }

  for (const url of IMAGENES_VITRINA_DIRECTAS) {
    const img = new Image();
    img.src = url;
  }
}

/* ── Chunks de las vistas ────────────────────────────────────────────────────
   Cada feature es un import() perezoso en App.tsx. Sin precarga, tocar SLANG
   bajaba en ese momento el chunk de Pélala (257 KB) + three.module (724 KB, lo
   arrastra el motor del sticker): ~8 s hasta ver "wind up" en PC (medido). Se
   calientan aquí, durante la pantalla de "preparando tu inglés" y en el Home,
   para que la navegación sea instantánea. Cada import cachea su módulo, así que
   llamarlo dos veces (precarga + navegación real) no baja nada dos veces.

   ORDEN a propósito: Pélala primero porque es la más pesada Y el dolor concreto
   de Gus; el resto detrás. Los LIBROS quedan fuera (pedido de Gus: su descarga
   se ve al tocarlos), y el bento es solo de teléfono. */
let promesaFeatures: Promise<void> | null = null;
function precargarFeatures(): Promise<void> {
  if (promesaFeatures) return promesaFeatures;
  if (!puedePrecargarPesado()) return Promise.resolve();
  // Se disparan en cadena, no todas de un golpe: la primera es la que más pesa
  // (Pélala arrastra three.module) y la que más se pide, así el chunk que el
  // usuario querrá tocar primero llega antes; el resto detrás.
  promesaFeatures = import('@/views/pelala')
    .then(() =>
      Promise.all([
        import('@/views/story'),
        import('@/views/ladder'),
        import('@/views/dna'),
        import('@/views/a1/oficina'),
        import('@/views/podcast'),
        import('@/views/perfil'),
        import('@/views/profes'),
      ]),
    )
    .then(() => undefined)
    .catch(() => {
      // Warmup: un chunk que no baja se pedirá otra vez al navegar, sin drama.
      promesaFeatures = null;
    });
  return promesaFeatures;
}

/** Download the conversation route only after Home is interactive. */
export function programarPrecargaConversacion(): () => void {
  const cargar = () => {
    void Promise.all([import('@/views/talk'), import('@/views/talk/use-coach-turn')]);
  };

  return programar(cargar, 1_200, 2_500);
}

function precargarInteraccionesHome(): Promise<void> {
  if (interaccionesHomeListas) return Promise.resolve();
  if (!promesaInteraccionesHome) {
    promesaInteraccionesHome = Promise.all([
      import('@/components/ui/liquid-morph-floating-menu'),
      import('@/components/rodeo/carrusel-features'),
    ])
      .then(() => {
        interaccionesHomeListas = true;
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_HOME_PRELOAD));
        /* Encadenado, NO en paralelo con las interacciones: primero que la
           vitrina y el menú estén listos (son lo que el usuario toca primero),
           y recién entonces calentar imágenes y features pesadas. Así el warmup
           pesado nunca le roba ancho de banda al chunk crítico del Home. */
        precargarImagenesVitrina();
        precargarFeatures();
      })
      .catch((error) => {
        promesaInteraccionesHome = null;
        throw error;
      });
  }
  return promesaInteraccionesHome;
}

/** Warm up the first post-onboarding Home interaction while the loading screen is visible. */
export function programarPrecargaHome(): () => void {
  const cargar = () => {
    void precargarInteraccionesHome();
  };

  return programar(cargar, 150, 600);
}

/** Precarga TODO ya (sin esperar idle) y resuelve cuando los chunks de feature
    están abajo — para que la pantalla "Preparando tu inglés" la ESPERE en vez
    de cerrarse a un tiempo fijo (pedido de Gus: «no importa si tarda esa
    pantalla, lo que importa es que al entrar se sienta fluido»). Comparte las
    mismas promesas single-flight que el warmup del Home, así que nada se baja
    dos veces. Resuelve aunque falle un chunk: la carga nunca se cuelga por esto
    —el llamador le pone su propio tope de tiempo—. */
export function precargarTodoYEsperar(): Promise<void> {
  if (!puedePrecargar()) return Promise.resolve();
  precargarImagenesVitrina();
  return Promise.all([precargarInteraccionesHome().catch(() => undefined), precargarFeatures()]).then(
    () => undefined,
  );
}

export function escucharPrecargaHome(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(EVENTO_HOME_PRELOAD, listener);
  return () => window.removeEventListener(EVENTO_HOME_PRELOAD, listener);
}
