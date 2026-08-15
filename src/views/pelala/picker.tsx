/* Picker de Pélala — dos modos separados. Explica cada uno en una línea;
   tocas → se abre y empieza. Vive dentro de SLANG (wiring diferido). */

import { usePelala } from '@/stores/pelala';

export function PelalaPicker() {
  const open = usePelala((s) => s.open);
  const barajar = usePelala((s) => s.barajar);

  const entrar = (mode: 'muro' | 'reto') => {
    barajar();
    open(mode);
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-6">
      <header className="mb-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Slang · stickers
        </p>
        <h1 className="mt-1 text-2xl font-black text-neutral-900 dark:text-neutral-50">
          ¿Cómo quieres practicar?
        </h1>
      </header>

      <button
        onClick={() => entrar('muro')}
        className="group flex flex-col items-start gap-1 rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
            El Muro
          </span>
          <span className="text-2xl">🧱</span>
        </div>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          Lee jerga real con su contexto. Cuando ya te la sepas, despégala con el
          dedo. Aparece la siguiente.
        </span>
      </button>

      <button
        onClick={() => entrar('reto')}
        className="group flex flex-col items-start gap-1 rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
            Pélala
          </span>
          <span className="text-2xl">🎤</span>
        </div>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          Te muestro una acción. Dices o escribes cómo se dice. Si aciertas, el
          sticker se pela solo.
        </span>
      </button>
    </div>
  );
}
