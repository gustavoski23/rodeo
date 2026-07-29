import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/tokens.css';
import App from '@/App';
import { initAurora } from '@/stores/aurora';
import { useAuth } from '@/stores/auth';

// Pinta el look del aurora (guardado o default) en :root antes del primer paint.
initAurora();
// Resuelve la sesión de Supabase ANTES de decidir si toca el gate de login.
void useAuth.getState().init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
