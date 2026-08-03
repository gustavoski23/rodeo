import { create } from 'zustand';

import { store } from '@/lib/storage';

/* Idioma de la INTERFAZ — solo para la demo del onboarding.

   Sprint "aprender español": Gus quiere poder ver el gate y el onboarding
   en ES o EN durante la demo, así que hay un toggle glass ES/ENG en la
   pantalla de login que persiste esta decisión.

   OJO: esto es solo el idioma de los textos del gate + onboarding. El resto
   de la app (Home, TALK, SLANG, …) sigue en español; traducir todo requiere
   un i18n de verdad y no es lo que se pidió. La clave `rodeo_ui_lang` es
   nueva de esta rama, con formato rodeo_* como el resto. */

export type UiLang = 'es' | 'en';

const CLAVE = 'rodeo_ui_lang';

type UiLangState = {
  lang: UiLang;
  setLang: (lang: UiLang) => void;
};

export const useUiLang = create<UiLangState>((set) => ({
  lang: (store.get<UiLang>(CLAVE, 'es') ?? 'es') as UiLang,
  setLang: (lang) => {
    store.set(CLAVE, lang);
    set({ lang });
  },
}));
