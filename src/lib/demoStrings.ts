import { useUiLang, type UiLang } from '@/stores/uiLang';

/* Strings de la demo (gate + onboarding), en ES y EN.

   Alcance a propósito estrecho: SOLO los textos de estas dos pantallas.
   Traducir el resto de la app requiere un i18n real y no es lo que se
   pidió — este archivo es el estado interino para la demo del sprint
   "aprender español", y se elimina cuando llegue el i18n de verdad.

   El diccionario vive en un objeto plano en vez de un JSON aparte porque
   son ~40 llaves; a esa escala, un módulo TS con tipado se lee mejor y no
   pide toolchain nuevo. */

type Dict = {
  // Gate
  gateTitulo: string;
  gateContinuar: string;
  gateEmail: string;
  gateEmailInvalido: string;
  gateOr: string;
  gateSkip: string;
  // Onboarding · nombre
  obNombreTitulo: string;
  obNombreSub: string;
  obNombrePlaceholder: string;
  obNombreVacio: string;
  // Onboarding · idioma
  obIdiomaTitulo: string;
  // Onboarding · nivel
  obNivelTitulo: string;
  obNivelSub: (idioma: string) => string;
  obNivelBasico: string;
  obNivelBasicoDetalle: string;
  obNivelIntermedio: string;
  obNivelIntermedioDetalle: string;
  obNivelAvanzado: string;
  obNivelAvanzadoDetalle: string;
  // Onboarding · gustos
  obGustosTitulo: string;
  obGustosSub: string;
  obTrabajoPlaceholder: string;
  obCrear: string;
  obContinuar: string;
  obVolver: string;
  // Onboarding · gustos (chips)
  chips: string[];
  // Carga
  cargaPrefix: string;
  cargaPalabras: (idiomaAprendiendo: string) => string[];
  cargaSub: (nombre: string) => string;
  // Idiomas para aprender (opciones de la pantalla 2)
  idiomaEs: string;
  idiomaEn: string;
  // Aprendiendo (la palabra que gira en la carga y el sub del nivel)
  aprendiendoEs: string;
  aprendiendoEn: string;
};

const ES: Dict = {
  gateTitulo: 'Get started with Us',
  gateContinuar: 'Continue with',
  gateEmail: 'Email',
  gateEmailInvalido: 'Escribe un correo válido.',
  gateOr: 'OR',
  gateSkip: 'Skip',

  obNombreTitulo: '¿Cómo te llamas?',
  obNombreSub: 'Para hablarte por tu nombre.',
  obNombrePlaceholder: 'Tu nombre',
  obNombreVacio: 'Escribe tu nombre para seguir.',

  obIdiomaTitulo: '¿Qué idioma quieres aprender?',

  obNivelTitulo: '¿Qué nivel eres?',
  obNivelSub: (i) => `Tu punto de partida en ${i}.`,
  obNivelBasico: 'Básico',
  obNivelBasicoDetalle: 'Estoy empezando desde cero',
  obNivelIntermedio: 'Intermedio',
  obNivelIntermedioDetalle: 'Me defiendo en conversaciones',
  obNivelAvanzado: 'Avanzado',
  obNivelAvanzadoDetalle: 'Converso con fluidez y quiero pulir',

  obGustosTitulo: 'Hazla tuya',
  obGustosSub: 'Elige lo que te gusta y cuéntanos tu trabajo o área: con eso personalizamos tu experiencia.',
  obTrabajoPlaceholder: 'Tu trabajo o área (opcional)',
  obCrear: 'Crear mi experiencia',
  obContinuar: 'Continuar',
  obVolver: 'Volver',

  chips: ['Viajes', 'Trabajo', 'Negocios', 'Tecnología', 'Música', 'Cine y series', 'Deportes', 'Comida', 'Arte', 'Salud', 'Estudios', 'Amigos'],

  cargaPrefix: 'Preparando tu',
  cargaPalabras: (i) => [i, 'vocabulario', 'práctica'],
  cargaSub: (n) => (n ? `${n}, esto` : 'Esto') + ' toma unos segundos…',

  idiomaEs: 'Español',
  idiomaEn: 'Inglés',
  aprendiendoEs: 'español',
  aprendiendoEn: 'inglés',
};

const EN: Dict = {
  gateTitulo: 'Get started with Us',
  gateContinuar: 'Continue with',
  gateEmail: 'Email',
  gateEmailInvalido: 'Enter a valid email.',
  gateOr: 'OR',
  gateSkip: 'Skip',

  obNombreTitulo: "What's your name?",
  obNombreSub: 'So we can call you by it.',
  obNombrePlaceholder: 'Your name',
  obNombreVacio: 'Type your name to continue.',

  obIdiomaTitulo: 'Which language do you want to learn?',

  obNivelTitulo: "What's your level?",
  obNivelSub: (i) => `Your starting point in ${i}.`,
  obNivelBasico: 'Basic',
  obNivelBasicoDetalle: "I'm starting from scratch",
  obNivelIntermedio: 'Intermediate',
  obNivelIntermedioDetalle: 'I can hold a conversation',
  obNivelAvanzado: 'Advanced',
  obNivelAvanzadoDetalle: 'I speak fluently and want to polish',

  obGustosTitulo: 'Make it yours',
  obGustosSub: "Pick what you like and tell us your job or field: that's what we'll tailor the experience to.",
  obTrabajoPlaceholder: 'Your job or field (optional)',
  obCrear: 'Create my experience',
  obContinuar: 'Continue',
  obVolver: 'Back',

  chips: ['Travel', 'Work', 'Business', 'Tech', 'Music', 'Movies & series', 'Sports', 'Food', 'Art', 'Health', 'Studies', 'Friends'],

  cargaPrefix: 'Preparing your',
  cargaPalabras: (i) => [i, 'vocabulary', 'practice'],
  cargaSub: (n) => (n ? `${n}, this` : 'This') + ' takes a few seconds…',

  idiomaEs: 'Spanish',
  idiomaEn: 'English',
  aprendiendoEs: 'Spanish',
  aprendiendoEn: 'English',
};

const DICT: Record<UiLang, Dict> = { es: ES, en: EN };

export function useT(): Dict {
  const lang = useUiLang((s) => s.lang);
  return DICT[lang];
}
