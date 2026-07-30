import { useEffect, useState } from 'react';

/* ¿Estamos en tema oscuro? — el mismo criterio que lib/theme.ts (`data-theme`
   en <html>: sin atributo = oscuro, 'light' = claro), pero como estado de React
   para que la Card del chat pueda encender o apagar el Backlight EN VIVO cuando
   Gus toca el toggle.

   Es un MutationObserver y no un hook del store porque el tema no vive en
   ningún store: lo escribe aplicarTema() directamente sobre el <html>, y el
   AnimatedThemeToggler lo hace dentro de una view transition. Escuchar el
   atributo es la única fuente de verdad que no se puede desincronizar. */
export function useTemaOscuro(): boolean {
  const [oscuro, setOscuro] = useState(
    () => typeof document === 'undefined' || document.documentElement.getAttribute('data-theme') !== 'light',
  );

  useEffect(() => {
    const leer = () => setOscuro(document.documentElement.getAttribute('data-theme') !== 'light');
    const obs = new MutationObserver(leer);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    leer();
    return () => obs.disconnect();
  }, []);

  return oscuro;
}
