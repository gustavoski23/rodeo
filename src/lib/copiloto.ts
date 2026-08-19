import { store } from '@/lib/storage';
import { etiquetaUsuario } from '@/lib/api';

/* Copiloto del profe — el lado del navegador: los alumnos y sus sesiones
   (persistidos en localStorage con el store de la casa), el cliente de los
   dos endpoints, y la grabadora de clases.

   LA GRABADORA Y LOS SEGMENTOS: MediaRecorder con timeslice entrega blobs que
   solo son válidos CONCATENADOS (los chunks 2..n no traen cabecera de
   contenedor), así que un chunk suelto no se puede transcribir. Por eso la
   grabadora NO usa timeslice: cada ~5 min DETIENE el recorder, entrega un blob
   completo y arranca uno nuevo sobre el mismo stream. El hueco entre segmentos
   es de milisegundos — irrelevante para transcribir una clase.

   EL AUDIO NUNCA SE GUARDA: cada segmento viaja al servidor, vuelve como
   texto y el blob se suelta. La memoria del copiloto es el transcript. */

export type EstadoSesion = 'transcribiendo' | 'resumiendo' | 'lista' | 'error';

export interface SesionCopiloto {
  id: string;
  fecha: string; // ISO
  duracionSeg: number;
  transcript: string;
  titulo: string;
  resumen: string[];
  vocab: string[];
  ideas: string[];
  foco: string[];
  estado: EstadoSesion;
}

export interface AlumnoCopiloto {
  id: string;
  nombre: string;
  detalle: string; // "Inglés B1", "Español para negocios"…
  creado: string;
  sesiones: SesionCopiloto[];
}

const CLAVE_ALUMNOS = 'rodeo_copiloto_alumnos';
const CLAVE_ROL = 'rodeo_rol';

export function esProfe(): boolean {
  return store.get<string | null>(CLAVE_ROL, null) === 'profe';
}
export function activarProfe(): void {
  store.set(CLAVE_ROL, 'profe');
}

export function cargarAlumnos(): AlumnoCopiloto[] {
  return store.get<AlumnoCopiloto[]>(CLAVE_ALUMNOS, []);
}
export function guardarAlumnos(alumnos: AlumnoCopiloto[]): void {
  store.set(CLAVE_ALUMNOS, alumnos);
}

export function nuevoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ── cliente HTTP (mismas cabeceras de protección que lib/api.ts) ────────── */

function cabeceras(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const pass = store.get<string | null>('rodeo_pass', null);
  if (pass) h['x-rodeo-pass'] = pass;
  const quien = etiquetaUsuario();
  if (quien) h['x-rodeo-user'] = quien;
  return h;
}

export async function transcribirSegmento(blob: Blob): Promise<{ text: string; segundos: number }> {
  const res = await fetch('/api/copiloto-stt', {
    method: 'POST',
    headers: cabeceras({ 'Content-Type': blob.type || 'audio/webm' }),
    body: blob,
  });
  if (!res.ok) throw new Error(`transcripcion_${res.status}`);
  const data = (await res.json()) as { text?: string; segundos?: number };
  return { text: (data.text || '').trim(), segundos: Number(data.segundos) || 0 };
}

export interface ResumenCopiloto {
  titulo: string;
  resumen: string[];
  vocab: string[];
  ideas: string[];
  foco: string[];
}

export async function resumirClase(args: {
  nombre: string;
  detalle: string;
  transcript: string;
  historial: string[];
}): Promise<ResumenCopiloto> {
  const res = await fetch('/api/copiloto', {
    method: 'POST',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ modo: 'resumen', ...args }),
  });
  if (!res.ok) throw new Error(`resumen_${res.status}`);
  const data = (await res.json()) as { resumen?: ResumenCopiloto };
  if (!data.resumen) throw new Error('resumen_vacio');
  return data.resumen;
}

export async function preguntarCopiloto(args: {
  nombre: string;
  detalle: string;
  pregunta: string;
  historial: string[];
}): Promise<string> {
  const res = await fetch('/api/copiloto', {
    method: 'POST',
    headers: cabeceras({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ modo: 'idea', ...args }),
  });
  if (!res.ok) throw new Error(`idea_${res.status}`);
  const data = (await res.json()) as { respuesta?: string };
  return (data.respuesta || '').trim();
}

/* El historial que se manda como contexto: una línea por sesión previa. */
export function historialDe(alumno: AlumnoCopiloto): string[] {
  return alumno.sesiones
    .filter((s) => s.estado === 'lista')
    .map((s) => `${s.titulo}: ${s.resumen.join(' · ')}${s.foco.length ? ` (en foco: ${s.foco.join(', ')})` : ''}`)
    .reverse(); // más reciente primero
}

/* ── grabadora por segmentos ─────────────────────────────────────────────── */

const SEGMENTO_MS = 5 * 60_000;
const MAX_CLASE_MS = 3 * 60 * 60_000; // tope duro: nadie da clases de más de 3 h seguidas

function tipoSoportado(): string {
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidatos.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export class GrabadoraClase {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private timer: number | null = null;
  private inicioMs = 0;
  private detenida = false;

  constructor(private onSegmento: (blob: Blob) => void, private onFin: () => void) {}

  async iniciar(): Promise<void> {
    const tipo = tipoSoportado();
    if (!tipo) throw new Error('sin_mediarecorder');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.inicioMs = Date.now();
    this.detenida = false;
    this.arrancarSegmento(tipo);
  }

  private arrancarSegmento(tipo: string): void {
    if (!this.stream || this.detenida) return;
    const rec = new MediaRecorder(this.stream, { mimeType: tipo, audioBitsPerSecond: 24_000 });
    const partes: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) partes.push(e.data);
    };
    rec.onstop = () => {
      if (partes.length) this.onSegmento(new Blob(partes, { type: tipo }));
      if (this.detenida || Date.now() - this.inicioMs > MAX_CLASE_MS) {
        this.soltarStream();
        this.onFin();
      } else {
        this.arrancarSegmento(tipo);
      }
    };
    rec.start();
    this.recorder = rec;
    this.timer = window.setTimeout(() => {
      if (rec.state === 'recording') rec.stop();
    }, SEGMENTO_MS);
  }

  segundos(): number {
    return this.inicioMs ? Math.floor((Date.now() - this.inicioMs) / 1000) : 0;
  }

  detener(): void {
    this.detenida = true;
    if (this.timer) window.clearTimeout(this.timer);
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    } else {
      this.soltarStream();
      this.onFin();
    }
  }

  private soltarStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
