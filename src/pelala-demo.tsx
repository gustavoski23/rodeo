/* Entry de DEMO AISLADA — monta solo PelalaView, sin el shell de la app, para
   verificar el peel sin tocar App.tsx (zona caliente del otro agente).
   No es parte del build de producción; se sirve solo en dev vía pelala-demo.html. */

import { createRoot } from 'react-dom/client';

import '@/styles/tokens.css';
import { usePelala } from '@/stores/pelala';
import PelalaView from '@/views/pelala';

/* Permite abrir la demo directo en un modo: ?mode=muro | ?mode=reto */
const mode = new URLSearchParams(location.search).get('mode');
if (mode === 'muro' || mode === 'reto') {
  usePelala.getState().barajar();
  usePelala.getState().open(mode);
}

createRoot(document.getElementById('root')!).render(
  <div style={{ minHeight: '100vh' }}>
    <PelalaView />
  </div>,
);
