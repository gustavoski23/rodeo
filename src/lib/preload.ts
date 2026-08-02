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

/** Download the conversation route only after Home is interactive. */
export function programarPrecargaConversacion(): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return () => undefined;

  const conexion = (navigator as NavegadorConConexion).connection;
  if (conexion?.saveData || conexion?.effectiveType === 'slow-2g' || conexion?.effectiveType === '2g') {
    return () => undefined;
  }

  const cargar = () => {
    if (document.visibilityState !== 'visible') return;
    void Promise.all([import('@/views/talk'), import('@/views/talk/use-coach-turn')]);
  };

  const win = window as VentanaConIdle;
  if (win.requestIdleCallback) {
    const id = win.requestIdleCallback(cargar, { timeout: 2_500 });
    return () => win.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(cargar, 1_200);
  return () => window.clearTimeout(id);
}
