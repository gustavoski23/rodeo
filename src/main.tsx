import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/tokens.css';
import App from '@/App';
import { initAurora } from '@/stores/aurora';

// Pinta el look del aurora (guardado o default) en :root antes del primer paint.
initAurora();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
