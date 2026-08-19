import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  GrabadoraClase,
  cargarAlumnos,
  guardarAlumnos,
  historialDe,
  nuevoId,
  preguntarCopiloto,
  resumirClase,
  transcribirSegmento,
  type AlumnoCopiloto,
  type SesionCopiloto,
} from '@/lib/copiloto';

/* ALUMNOS REALES — el copiloto de verdad, dentro de la pestaña Alumnos cuando
   el rol es profe. Nada de datos demo: alumnos creados por el profesor,
   clases grabadas con su micrófono, transcripción y resumen reales.

   El flujo de una clase: consentimiento (obligatorio, por clase) → grabar →
   los segmentos de ~5 min viajan a /api/copiloto-stt según van saliendo →
   al detener, el transcript completo va a /api/copiloto → la sesión queda
   guardada como memoria del alumno. El audio jamás se persiste.

   Los errores conservan el trabajo: si el resumen falla, el transcript queda
   guardado en la sesión (estado "error") y hay botón de reintentar. Perder
   una clase grabada por un 502 sería imperdonable. */

type Fase = 'idle' | 'grabando' | 'procesando';

export default function AlumnosReales() {
  const [alumnos, setAlumnos] = useState<AlumnoCopiloto[]>(cargarAlumnos);
  const [sel, setSel] = useState<string | null>(null);
  const alumno = alumnos.find((a) => a.id === sel) ?? null;

  function persistir(siguiente: AlumnoCopiloto[]) {
    setAlumnos(siguiente);
    guardarAlumnos(siguiente);
  }

  if (!alumno) {
    return (
      <ListaAlumnos
        alumnos={alumnos}
        onCrear={(nombre, detalle) => {
          const nuevo: AlumnoCopiloto = { id: nuevoId(), nombre, detalle, creado: new Date().toISOString(), sesiones: [] };
          persistir([nuevo, ...alumnos]);
          setSel(nuevo.id);
        }}
        onAbrir={setSel}
      />
    );
  }

  return (
    <DetalleAlumno
      alumno={alumno}
      onVolver={() => setSel(null)}
      onCambio={(actualizado) => persistir(alumnos.map((a) => (a.id === actualizado.id ? actualizado : a)))}
    />
  );
}

/* ── lista + alta ────────────────────────────────────────────────────────── */

function ListaAlumnos({
  alumnos,
  onCrear,
  onAbrir,
}: {
  alumnos: AlumnoCopiloto[];
  onCrear: (nombre: string, detalle: string) => void;
  onAbrir: (id: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [detalle, setDetalle] = useState('');

  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Tus alumnos
        </h1>
        <p className="mt-2 max-w-[52ch] text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          {alumnos.length
            ? 'El copiloto guarda lo que viste con cada uno y te propone la siguiente clase.'
            : 'Crea tu primer alumno y graba una clase: el copiloto la transcribe, la resume y te da ideas para la siguiente. Sin plantillas, sin cuadernos perdidos.'}
        </p>
      </header>

      <section className="plata-bloque" aria-label="Crear alumno">
        <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
          <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
            Nuevo alumno
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre (ej. Sofía R.)"
              className="plata-input min-w-[12rem] flex-1"
              aria-label="Nombre del alumno"
            />
            <input
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Qué estudia (ej. Inglés B1)"
              className="plata-input min-w-[12rem] flex-1"
              aria-label="Qué estudia"
            />
            <button
              type="button"
              disabled={!nombre.trim()}
              onClick={() => {
                onCrear(nombre.trim(), detalle.trim());
                setNombre('');
                setDetalle('');
              }}
              className="plata-boton"
            >
              Crear
            </button>
          </div>
        </div>
      </section>

      {alumnos.length > 0 && (
        <section className="plata-bloque" aria-label="Lista de alumnos">
          <ul className="flex flex-col">
            {alumnos.map((a) => {
              const listas = a.sesiones.filter((s) => s.estado === 'lista').length;
              return (
                <li key={a.id} className="plata-fila cursor-pointer" onClick={() => onAbrir(a.id)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9rem] font-semibold" style={{ color: 'var(--text-primary)' }}>{a.nombre}</p>
                    <p className="mt-0.5 text-[0.74rem]" style={{ color: 'var(--text-muted)' }}>
                      {a.detalle || 'Sin detalle'} · {listas === 1 ? '1 clase con copiloto' : `${listas} clases con copiloto`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.8rem]" style={{ color: 'var(--accent)' }}>Abrir</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

/* ── detalle: grabar, sesiones, chat ─────────────────────────────────────── */

function DetalleAlumno({
  alumno,
  onVolver,
  onCambio,
}: {
  alumno: AlumnoCopiloto;
  onVolver: () => void;
  onCambio: (a: AlumnoCopiloto) => void;
}) {
  const [fase, setFase] = useState<Fase>('idle');
  const [segundos, setSegundos] = useState(0);
  const [consentido, setConsentido] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const grabadora = useRef<GrabadoraClase | null>(null);
  /* Cola secuencial de transcripción: los segmentos llegan en orden y se
     transcriben en orden (una promesa encadenada), así el transcript final no
     se desordena aunque la red tarde distinto por segmento. */
  const cola = useRef<Promise<void>>(Promise.resolve());
  const partes = useRef<string[]>([]);
  const duracion = useRef(0);
  const alumnoRef = useRef(alumno);
  alumnoRef.current = alumno;

  useEffect(() => {
    if (fase !== 'grabando') return;
    const t = window.setInterval(() => setSegundos(grabadora.current?.segundos() ?? 0), 1000);
    return () => window.clearInterval(t);
  }, [fase]);

  function guardarSesion(s: SesionCopiloto) {
    const a = alumnoRef.current;
    const idx = a.sesiones.findIndex((x) => x.id === s.id);
    const sesiones = idx === -1 ? [s, ...a.sesiones] : a.sesiones.map((x) => (x.id === s.id ? s : x));
    onCambio({ ...a, sesiones });
  }

  async function resumir(sesion: SesionCopiloto) {
    guardarSesion({ ...sesion, estado: 'resumiendo' });
    try {
      const r = await resumirClase({
        nombre: alumnoRef.current.nombre,
        detalle: alumnoRef.current.detalle,
        transcript: sesion.transcript,
        historial: historialDe(alumnoRef.current).slice(0, 4),
      });
      guardarSesion({ ...sesion, ...r, estado: 'lista' });
    } catch {
      guardarSesion({ ...sesion, estado: 'error' });
    }
    setFase('idle');
  }

  async function alTerminarGrabacion() {
    await cola.current; // espera las transcripciones pendientes
    const transcript = partes.current.join('\n').trim();
    if (!transcript) {
      setErrorMsg('No se escuchó nada transcribible. Revisa el micrófono e intenta de nuevo.');
      setFase('idle');
      return;
    }
    const sesion: SesionCopiloto = {
      id: nuevoId(),
      fecha: new Date().toISOString(),
      duracionSeg: duracion.current,
      transcript,
      titulo: 'Clase por resumir',
      resumen: [], vocab: [], ideas: [], foco: [],
      estado: 'resumiendo',
    };
    await resumir(sesion);
  }

  async function iniciarGrabacion() {
    setErrorMsg(null);
    partes.current = [];
    duracion.current = 0;
    cola.current = Promise.resolve();
    const g = new GrabadoraClase(
      (blob) => {
        const idx = partes.current.length;
        partes.current.push(''); // reserva el lugar para mantener el orden
        cola.current = cola.current.then(async () => {
          try {
            const { text, segundos: seg } = await transcribirSegmento(blob);
            partes.current[idx] = text;
            duracion.current += seg;
          } catch {
            partes.current[idx] = '';
            setErrorMsg('Un tramo de la clase no se pudo transcribir; el resto sigue.');
          }
        });
      },
      () => {
        setFase('procesando');
        void alTerminarGrabacion();
      },
    );
    try {
      await g.iniciar();
      grabadora.current = g;
      setFase('grabando');
      setSegundos(0);
    } catch {
      setErrorMsg('No pude acceder al micrófono. Revisa el permiso del navegador.');
    }
  }

  async function subirArchivo(f: File) {
    setErrorMsg(null);
    if (f.size > 3_900_000) {
      setErrorMsg('Por ahora los archivos subidos van hasta 4 MB (unos 20-25 min de audio comprimido). Para clases largas usa el botón de grabar.');
      return;
    }
    setFase('procesando');
    try {
      const { text, segundos: seg } = await transcribirSegmento(f);
      if (!text) throw new Error('vacio');
      const sesion: SesionCopiloto = {
        id: nuevoId(), fecha: new Date().toISOString(), duracionSeg: seg,
        transcript: text, titulo: 'Clase por resumir',
        resumen: [], vocab: [], ideas: [], foco: [], estado: 'resumiendo',
      };
      await resumir(sesion);
    } catch {
      setErrorMsg('No pude transcribir ese archivo. Formatos que funcionan: la grabación de voz del teléfono o el audio exportado de Zoom/Meet.');
      setFase('idle');
    }
  }

  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');

  return (
    <>
      <div className="plata-bloque flex flex-wrap items-center gap-3">
        <button type="button" onClick={onVolver} className="plata-boton-fantasma">← Alumnos</button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.3rem] leading-[1.05] font-extrabold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
            {alumno.nombre}
          </p>
          <p className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>
            {alumno.detalle || 'Sin detalle'} ·{' '}
            {alumno.sesiones.filter((s) => s.estado === 'lista').length === 1
              ? '1 clase en memoria'
              : `${alumno.sesiones.filter((s) => s.estado === 'lista').length} clases en memoria`}
          </p>
        </div>
      </div>

      {/* Grabar */}
      <section className="plata-bloque" aria-label="Grabar clase">
        <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
          {fase === 'grabando' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="size-2 shrink-0 animate-pulse rounded-full" style={{ background: 'var(--danger)' }} aria-hidden />
              <p className="min-w-0 flex-1 text-[0.86rem]" style={{ color: 'var(--text-primary)' }}>
                Grabando la clase · <span className="tabular-nums">{mm}:{ss}</span>
                <span style={{ color: 'var(--text-muted)' }}> · la transcripción va saliendo por tramos de 5 min</span>
              </p>
              <button type="button" className="plata-boton" onClick={() => grabadora.current?.detener()}>
                Terminar clase
              </button>
            </div>
          ) : fase === 'procesando' ? (
            <p className="text-[0.86rem]" style={{ color: 'var(--text-primary)' }}>
              El copiloto está trabajando: transcribiendo lo que falta y armando el resumen con ideas…
            </p>
          ) : (
            <>
              <label className="flex cursor-pointer items-start gap-2.5 text-[0.84rem]" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={consentido}
                  onChange={(e) => setConsentido(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Mi estudiante sabe que esta clase se graba para generar el resumen y dio su consentimiento.
                  <span style={{ color: 'var(--text-muted)' }}> El audio se descarta al transcribir: solo se guarda el texto.</span>
                </span>
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="plata-boton" disabled={!consentido} onClick={() => void iniciarGrabacion()}>
                  Grabar clase (micrófono)
                </button>
                <label className={cn('plata-boton-fantasma', !consentido && 'pointer-events-none opacity-40')}>
                  Subir audio
                  <input
                    type="file"
                    accept="audio/*,video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) void subirArchivo(f);
                    }}
                  />
                </label>
                <span className="text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>
                  Para Zoom/Meet en el computador: graba con el micrófono y parlantes encendidos, o sube el audio de la reunión.
                </span>
              </div>
            </>
          )}
          {errorMsg && (
            <p className="mt-3 text-[0.8rem]" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
          )}
        </div>
      </section>

      {/* Sesiones */}
      {alumno.sesiones.length > 0 && (
        <section className="plata-bloque" aria-label="Clases con copiloto">
          <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
            Memoria del alumno
          </h2>
          <div className="mt-2">
            {alumno.sesiones.map((s) => (
              <Sesion key={s.id} sesion={s} onReintentar={() => void resumir(s)} />
            ))}
          </div>
        </section>
      )}

      <ChatCopiloto alumno={alumno} />
    </>
  );
}

function Sesion({ sesion, onReintentar }: { sesion: SesionCopiloto; onReintentar: () => void }) {
  const fecha = new Date(sesion.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  const min = Math.max(1, Math.round(sesion.duracionSeg / 60));
  return (
    <div className="plata-puerta">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="font-display text-[1rem] leading-[1.2] font-bold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
          {sesion.titulo}
        </p>
        <span className="text-[0.72rem]" style={{ color: 'var(--text-muted)' }}>{fecha} · {min} min</span>
        {sesion.estado === 'resumiendo' && (
          <span className="rounded-full border px-2 py-0.5 font-mono text-[0.52rem] font-bold tracking-[0.12em] uppercase" style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-muted)' }}>
            Resumiendo…
          </span>
        )}
        {sesion.estado === 'error' && (
          <button type="button" onClick={onReintentar} className="rounded-full border px-2 py-0.5 font-mono text-[0.52rem] font-bold tracking-[0.12em] uppercase" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            El resumen falló — reintentar
          </button>
        )}
      </div>
      {sesion.estado === 'lista' && (
        <>
          <ul className="mt-2 flex flex-col gap-1.5">
            {sesion.resumen.map((r) => (
              <li key={r} className="flex items-start gap-2 text-[0.84rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
                <Check size={12} strokeWidth={2.6} className="mt-1 shrink-0" style={{ color: 'var(--accent)' }} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          {sesion.ideas.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-[0.58rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
                Ideas para la próxima clase
              </p>
              <ol className="mt-1.5 flex flex-col gap-1.5">
                {sesion.ideas.map((idea, i) => (
                  <li key={idea} className="flex items-start gap-2.5 text-[0.84rem] leading-[1.5]" style={{ color: 'var(--text-primary)' }}>
                    <b className="font-mono text-[0.78rem]" style={{ color: 'var(--accent)' }}>{i + 1}</b>
                    <span>{idea}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {(sesion.vocab.length > 0 || sesion.foco.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sesion.vocab.map((v) => (
                <span key={v} className="rounded-lg px-2 py-0.5 text-[0.72rem]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{v}</span>
              ))}
              {sesion.foco.map((f) => (
                <span key={f} className="rounded-lg px-2 py-0.5 text-[0.72rem]" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{f}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChatCopiloto({ alumno }: { alumno: AlumnoCopiloto }) {
  const [pregunta, setPregunta] = useState('');
  const [lineas, setLineas] = useState<{ mia: boolean; texto: string }[]>([]);
  const [pensando, setPensando] = useState(false);

  async function enviar() {
    const q = pregunta.trim();
    if (!q || pensando) return;
    setPregunta('');
    setLineas((l) => [...l, { mia: true, texto: q }]);
    setPensando(true);
    try {
      const r = await preguntarCopiloto({
        nombre: alumno.nombre,
        detalle: alumno.detalle,
        pregunta: q,
        historial: historialDe(alumno).slice(0, 5),
      });
      setLineas((l) => [...l, { mia: false, texto: r || 'No tengo suficiente historial de este alumno para responder eso todavía.' }]);
    } catch {
      setLineas((l) => [...l, { mia: false, texto: 'No pude responder ahora mismo. Intenta de nuevo en un momento.' }]);
    }
    setPensando(false);
  }

  return (
    <section className="plata-bloque" aria-label="Pregúntale al copiloto">
      <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
        <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          Pregúntale al copiloto
        </p>
        <p className="mt-1.5 text-[0.8rem]" style={{ color: 'var(--text-muted)' }}>
          Conoce las clases resumidas de {alumno.nombre}. Pídele ideas — no corrige, asiste.
        </p>
        {lineas.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {lineas.map((l, i) => (
              <p
                key={i}
                className={cn('max-w-[92%] rounded-[13px] px-3 py-2 text-[0.84rem] leading-[1.5]', l.mia && 'self-end')}
                style={{ background: l.mia ? 'var(--accent-dim)' : 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {l.texto}
              </p>
            ))}
            {pensando && (
              <p className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>Pensando…</p>
            )}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void enviar(); }}
            placeholder={`Pide una idea para ${alumno.nombre.split(' ')[0]}…`}
            className="plata-input flex-1"
            aria-label="Pregunta al copiloto"
          />
          <button type="button" className="plata-boton" disabled={pensando} onClick={() => void enviar()}>
            Enviar
          </button>
        </div>
      </div>
    </section>
  );
}
