import { createClient } from '@supabase/supabase-js';

/* Cliente de Supabase para el gate de login.

   La URL y la key salen VERBATIM de public/js/supabase-sync.js (líneas 30-31):
   es el mismo proyecto de Gus, así que la sesión que abra el gate es la misma
   que el sync legacy lee para bajar el DNA. La key "publishable/anon" es
   PÚBLICA por diseño (RLS protege los datos) — es seguro versionarla, tal cual
   lo explica el comentario del archivo original.

   Persistencia por defecto a propósito: supabase-js guarda la sesión en
   localStorage bajo `sb-<ref>-auth-token` y la refresca solo. Como el script
   legacy crea SU propio cliente contra la misma URL, ambos comparten esa clave
   y ven la misma sesión — por eso no le ponemos storageKey propio. (Sí puede
   aparecer el aviso de "Multiple GoTrueClient instances" en consola mientras
   convivan los dos; desaparece cuando el sync se porte a módulo.) */

export const SB_URL = 'https://cablhejzsxqgwdvyzqei.supabase.co';
export const SB_ANON_KEY = 'sb_publishable_jNRFSwU8ar-DZ0UY2_mQfg_Nz7LKXYI';

export const supabase = createClient(SB_URL, SB_ANON_KEY);
