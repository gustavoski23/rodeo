/* El sonido de pasar la página.

   SINTETIZADO, no un mp3. Un archivo de audio serían ~20-40 KB que hay que
   descargar, cachear en el service worker y versionar; y para un "fsss" de
   200 ms no vale la pena. Esto lo arma WebAudio en el momento y pesa cero.

   Cómo suena un papel al pasar: NO es un tono, es ruido. Ruido blanco filtrado
   con un pasa-banda que sube de frecuencia mientras el sonido decae — eso es lo
   que el oído lee como "algo áspero rozando y alejándose". Dos capas ligeramente
   distintas (el pliegue y el aterrizaje) lo sacan de sonar a electrónica.

   El AudioContext se crea PEREZOSO, en el primer toque: crearlo al importar el
   módulo lo dejaría 'suspended' en cualquier navegador con política de autoplay
   y encima gastaría batería en una vista donde quizá nadie pase una página. */

const CLAVE_MUDO = 'rodeo_libro_mudo';

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;

/** ¿El usuario apagó el sonido del libro? Se lee de localStorage en cada
    llamada — es un booleano, no vale la pena cachearlo y arriesgar quedar
    desincronizado con el botón. */
export function libroMudo(): boolean {
  try {
    return localStorage.getItem(CLAVE_MUDO) === 'true';
  } catch {
    return false;
  }
}

export function setLibroMudo(mudo: boolean): void {
  try {
    localStorage.setItem(CLAVE_MUDO, String(mudo));
  } catch {
    /* modo privado: que el sonido siga funcionando aunque no se pueda recordar */
  }
}

/** Ruido blanco de 0.4 s. Se genera UNA vez y se reusa en cada pase: llenar
    17.000 floats por página sería trabajo tirado a la basura. */
function ruido(ac: AudioContext): AudioBuffer {
  if (buffer) return buffer;
  const largo = Math.floor(ac.sampleRate * 0.4);
  const buf = ac.createBuffer(1, largo, ac.sampleRate);
  const datos = buf.getChannelData(0);
  for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
  buffer = buf;
  return buf;
}

/* Una capa del sonido: ruido → pasa-banda que barre de `f0` a `f1` → ganancia
   que decae. `t0` la retrasa dentro del gesto para que las dos capas no salgan
   pegadas (el papel primero se dobla y después cae). */
function capa(ac: AudioContext, t0: number, dur: number, f0: number, f1: number, vol: number) {
  const src = ac.createBufferSource();
  src.buffer = ruido(ac);
  // Un punto de arranque al azar dentro del buffer: si todas las capas
  // empezaran en la muestra 0, cada pase sonaría EXACTAMENTE igual y el oído
  // lo detecta como un "clic" de videojuego a la tercera página.
  const inicio = Math.random() * 0.3;

  const filtro = ac.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = 0.7;
  filtro.frequency.setValueAtTime(f0, t0);
  filtro.frequency.exponentialRampToValueAtTime(f1, t0 + dur);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.18); // ataque corto
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // cola larga

  src.connect(filtro).connect(g).connect(ac.destination);
  src.start(t0, inicio, dur);
  src.stop(t0 + dur);
}

/** Pasa una página. Se llama desde onPageChange, o sea siempre dentro de un
    gesto del usuario — que es justo lo que las políticas de autoplay piden. */
export function sonarPagina(): void {
  if (libroMudo()) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return; // navegador sin WebAudio: el libro funciona igual, mudo
      ctx = new AC();
    }
    // Safari deja el contexto suspendido hasta el primer gesto.
    if (ctx.state === 'suspended') void ctx.resume();

    const t = ctx.currentTime;
    capa(ctx, t, 0.26, 1200, 5200, 0.05); // el roce del pliegue
    capa(ctx, t + 0.1, 0.2, 500, 2200, 0.035); // la hoja que aterriza
  } catch {
    /* que un fallo de audio NUNCA rompa el pase de página */
  }
}
