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

export function escucharPrecargaHome(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(EVENTO_HOME_PRELOAD, listener);
  return () => window.removeEventListener(EVENTO_HOME_PRELOAD, listener);
}
