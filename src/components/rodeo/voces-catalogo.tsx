import { useEffect, useRef, useState } from 'react';

/* Voces — catálogo de las voces AI de los podcasts, para escucharlas antes de
   elegir. Vive como una sección más del personalizador («Personalizar aurora»).

   Reglas de Gus (14-ago):
   · LAZY de verdad: el mp3 se descarga SOLO al primer play de esa voz. Nada de
     <audio preload> ni fetch anticipado — aquí el <audio> ni siquiera existe
     hasta que alguien pulsa play (se crea con new Audio() en ese momento).
   · UN solo HTMLAudioElement compartido: darle play a una voz pausa la
     anterior (cambiar el src del mismo elemento ya corta la reproducción).
   · Volumen GLOBAL (un slider, no dieciséis) que aplica al audio compartido y
     persiste en localStorage para la próxima visita.
   El JSON del catálogo sí se pide al montar: son ~1 KB de metadatos, no audio. */

type Voz = {
  nombre: string;
  proveedor: string;
  genero: string;
  acento: string;
  archivo: string;
  /* Del catálogo (src/lib/voces-catalogo.json). Describe cómo SUENA la voz,
     que es lo único que sirve para elegirla sin escucharlas las 16. Puede
     venir vacío en las que aún no tienen descripción confirmada. */
  tono?: string;
};

const VOL_KEY = 'rodeo_voces_vol';

/* Volumen guardado o 0.9 por defecto (al 100% las muestras normalizadas
   saturan en móvil con el volumen físico alto). */
function leerVolumen(): number {
  try {
    const crudo = localStorage.getItem(VOL_KEY);
    // Ojo: Number(null) es 0 — sin este guard, la primera visita arrancaría MUDA.
    if (crudo === null) return 0.9;
    const v = Number(crudo);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.9;
  } catch {
    return 0.9;
  }
}

export function VocesCatalogo() {
  const [voces, setVoces] = useState<Voz[] | null>(null);
  const [fallo, setFallo] = useState(false);
  // Qué voz suena ahora (por su archivo, que es único). null = silencio.
  const [sonando, setSonando] = useState<string | null>(null);
  const [volumen, setVolumen] = useState(leerVolumen);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // El catálogo (solo metadatos) se carga al abrir la sección.
  useEffect(() => {
    let vivo = true;
    fetch('/voces/voces.json')
      .then((r) => (r.ok ? (r.json() as Promise<{ voces: Voz[] }>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (vivo) setVoces(data.voces);
      })
      .catch(() => {
        if (vivo) setFallo(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Al salir de la sección (volver, cerrar el modal) la muestra no puede
  // seguir sonando huérfana: se pausa el elemento compartido.
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  // El slider manda sobre el audio vivo y se recuerda entre sesiones.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volumen;
    try {
      localStorage.setItem(VOL_KEY, String(volumen));
    } catch {
      /* modo privado sin storage: el volumen vive solo esta sesión */
    }
  }, [volumen]);

  function alternar(voz: Voz) {
    let audio = audioRef.current;
    if (!audio) {
      // Primer play de la vida del componente: recién aquí nace el <audio>.
      audio = new Audio();
      audio.preload = 'none';
      audio.volume = volumen;
      // Al terminar la muestra el botón vuelve solo a PLAY.
      audio.addEventListener('ended', () => setSonando(null));
      audio.addEventListener('error', () => setSonando(null));
      audioRef.current = audio;
    }
    const src = new URL(voz.archivo, window.location.href).href;
    if (sonando === voz.archivo && !audio.paused) {
      // Pausable en cualquier momento; reanudar retoma donde iba.
      audio.pause();
      setSonando(null);
      return;
    }
    // Asignar src ES la descarga lazy: el navegador recién ahora pide el mp3.
    // Si es la misma voz pausada, no se reasigna para no perder la posición.
    if (audio.src !== src) audio.src = voz.archivo;
    setSonando(voz.archivo);
    audio.play().catch(() => setSonando(null));
  }

  return (
    <section className="aurora-customizer__map voces-catalogo" aria-labelledby="voces-title">
      <div className="aurora-customizer__map-heading">
        <div>
          <p className="aurora-customizer__eyebrow">Las voces de tus podcasts</p>
          <h3 id="voces-title">Voces</h3>
        </div>
      </div>

      {/* Volumen global — misma piel que los sliders de Intensidad/Velocidad
          (aurora-customizer__motion), en una sola columna. */}
      <div className="aurora-customizer__motion aurora-customizer__motion--una">
        <label>
          <span>
            Volumen <output>{Math.round(volumen * 100)}%</output>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volumen * 100)}
            aria-label="Volumen de las muestras de voz"
            onChange={(e) => setVolumen(Number(e.target.value) / 100)}
          />
        </label>
      </div>

      {fallo ? (
        <p className="voces-estado">No se pudo cargar el catálogo de voces.</p>
      ) : !voces ? (
        <p className="voces-estado">Cargando voces…</p>
      ) : (
        <div className="voces-lista">
          {voces.map((voz) => {
            const activa = sonando === voz.archivo;
            return (
              <button
                key={voz.archivo}
                type="button"
                className="voz-card"
                aria-label={`Escuchar muestra de ${voz.nombre}`}
                aria-pressed={activa}
                data-hablando={activa || undefined}
                onClick={() => alternar(voz)}
              >
                <span className="voz-card__icono" aria-hidden="true">
                  {/* Play y pausa conviven apilados y se cruzan con un fundido
                      (opacity+scale), no un swap seco. */}
                  <svg className="voz-card__play" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <svg className="voz-card__pausa" viewBox="0 0 24 24">
                    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                  </svg>
                </span>
                <span className="voz-card__texto">
                  <span className="voz-card__nombre">{voz.nombre}</span>
                  <span className="voz-card__meta">
                    {voz.proveedor} · {voz.genero === 'F' ? 'Femenina' : 'Masculina'} · {voz.acento}
                  </span>
                  {/* Cómo suena. Sin esto hay que escuchar las 16 para elegir. */}
                  {voz.tono && <span className="voz-card__tono">{voz.tono}</span>}
                </span>
                {/* Puntito «hablando»: solo late mientras la voz suena. */}
                <span className="voz-card__punto" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
