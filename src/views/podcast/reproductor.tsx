/* REPRODUCTOR sincronizado — port del demo standalone (nuevo-script.js).
   La lógica NO se reinventó: cada bloque conserva el porqué del demo, donde
   cada bug documentado costó una ronda de QA:
     · rAF congelado en background → visibilitychange repinta y rearma el bucle
     · play() rechazado en silencio → SIEMPRE con .catch() y aviso visible
     · tap en palabra que hacía seek → tocar consulta SIN moverte de sitio
     · pointerleave que enviaba la nota de voz → deslizar fuera CANCELA
     · respuestas del coach filtradas entre sesiones → token sesion++

   El karaoke pinta IMPERATIVO (classList sobre refs), no con estado React:
   a 60fps un setState por frame re-renderizaría cientos de <button> y el
   scroll se iría a saltos en móvil. React monta la estructura una vez por
   pack; pintar() solo toca clases y atributos. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { createPortal } from 'react-dom';

import { GradientBackground } from '@/components/ui/sign-up';
import { dnaTieneSlang, onDnaChange, removeDnaSlang, saveDNA } from '@/lib/dna';
import { REDUCED } from '@/lib/theme';

import type { Episodio } from './index';
import './reproductor.css';

/* ── Shapes del pack (public/podcasts/ep-XX-pack.json) ─────────────────── */
type Palabra = [string, number, number];
type Linea = { s: string; a: number; b: number; es: string; nota: string; w: Palabra[] };
type Expresion = {
  expresion: string;
  linea_aprox: number;
  coach_intro: string;
  coach_ejemplo: string;
  coach_cierre: string;
};
type Pack = {
  id: string;
  titulo_en: string;
  titulo_es: string;
  proveedor: string;
  hosts: { A: string; B: string };
  audio: string;
  lineas: Linea[];
  glosario: Record<string, string>;
  expresiones: Expresion[];
  onda: number[];
  dueno: number[];
};

type Sel = { bruta: string; limpia: string; trad: string; li: number; wi: number };
type ChipKey = 'otro' | 'yo' | 'mucho';
type Guion = { intro: string; ejemplo: string; cierre: string; chips: Record<ChipKey, string> };
type Msg = { id: number; quien: 'u' | 'c'; html?: string; texto?: string; typing?: boolean };

/* Chips de seguimiento del demo (coach.mjs), tal cual. */
const CHIPS: { k: ChipKey; label: string }[] = [
  { k: 'otro', label: 'Dame otro ejemplo' },
  { k: 'yo', label: '¿Cómo lo uso yo?' },
  { k: 'mucho', label: '¿Se usa mucho?' },
];

function fmt(s: number): string {
  if (!isFinite(s)) return '0:00';
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

/* Mini-markdown del coach (port literal). Escapa HTML antes de marcar, así
   dangerouslySetInnerHTML solo recibe nuestro propio marcado. */
function inl(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function md(s: string): string {
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return String(s)
    .split('\n\n')
    .map((b) => {
      if (b.startsWith('> ')) return '<blockquote>' + inl(esc(b.slice(2))) + '</blockquote>';
      if (/^[•-] /m.test(b))
        return (
          '<ul>' +
          b
            .split('\n')
            .filter((l) => l.trim())
            .map((l) => '<li>' + inl(esc(l.replace(/^[•-]\s*/, ''))) + '</li>')
            .join('') +
          '</ul>'
        );
      return '<p>' + inl(esc(b)).replace(/\n/g, '<br>') + '</p>';
    })
    .join('');
}

/* Sin signos al final para hablar DE la palabra («obsessed,» → «obsessed»). */
const sinSignos = (w: string) => w.replace(/[.,!?;:…"']+$/, '');

/* Fallback del coach cuando la palabra no cae en ninguna expresión del pack:
   se construye con glosario + línea, portado del demo. */
function fallbackGuion(sel: Sel, L: Linea): Guion {
  const en = L.w.map((x) => x[0]).join(' ');
  const es = L.es;
  const hab = L.s;
  const p = sinSignos(sel.bruta);
  const t = sel.trad;
  return {
    intro: t
      ? `${hab} usa **"${p}"** aquí, y en este contexto significa **${t}**.`
      : `${hab} usa **"${p}"** en esta frase. Vamos a verla en su sitio.`,
    ejemplo: `La frase completa es:\n\n> ${en}\n\n"${es}"`,
    cierre: '¿Quieres que te la desmonte palabra por palabra, o prefieres un ejemplo para usarla tú?',
    chips: {
      otro: `Colócala en algo tuyo: repite la frase de ${hab} en voz alta y luego cámbiale una palabra por algo de tu vida.`,
      yo: `Para usar **"${p}"** tú mismo, copia primero la estructura entera de la frase y solo después empieza a variarla.`,
      mucho:
        'Depende del registro. Escúchala en el episodio un par de veces más: a 0,75x la vas a oír mucho más clara.',
    },
  };
}

/* Traducción del glosario en CASCADA. El demo hacía D.glosario[limpia] a secas
   porque su glosario era de palabra suelta; los packs reales traen un tercio de
   claves multi-palabra («to rust», «con artist», «too good to be true») que un
   lookup por palabra suelta jamás alcanzaría — tocar «rust» decía «Sin entrada
   de glosario» aunque el pack SÍ trae «to rust». Orden:
     1. clave exacta («landmark»),
     2. infinitivo «to X» («rust» → «to rust», ~100 claves gratis),
     3. primera clave multi-palabra que contenga la palabra ENTERA — mismo
        criterio de split y >3 letras que expresionDe, para que «to» o «the»
        no matcheen con medio glosario. */
function tradDe(glosario: Record<string, string>, limpia: string): string {
  if (!limpia) return '';
  const directa = glosario[limpia] ?? glosario['to ' + limpia];
  if (directa) return directa;
  if (limpia.length <= 3) return '';
  for (const k of Object.keys(glosario)) {
    if (k.includes(' ') && k.toLowerCase().split(/[^a-z']+/).includes(limpia)) return glosario[k];
  }
  return '';
}

/* ¿La palabra tocada pertenece a una expresión del pack? Solo palabras de más
   de 3 letras (con «to» o «the» todo matchearía), y por palabra entera de la
   expresión, no por substring («ride» sí, «rid» no). */
function expresionDe(pack: Pack, limpia: string): Expresion | null {
  if (limpia.length <= 3) return null;
  return (
    pack.expresiones.find((x) =>
      x.expresion
        .toLowerCase()
        .split(/[^a-z']+/)
        .includes(limpia),
    ) ?? null
  );
}

const VEL = [1, 1.25, 0.75];
/* Etiquetas con coma decimal — español neutro. */
const ETQ: Record<string, string> = { '1': '1x', '1.25': '1,25x', '0.75': '0,75x' };

export function Reproductor({ episodio, onVolver }: { episodio: Episodio; onVolver: () => void }) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [fallo, setFallo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [sonando, setSonando] = useState(false);
  const [iv, setIv] = useState(0); // índice de velocidad

  const [sel, setSel] = useState<Sel | null>(null);
  const [cardOn, setCardOn] = useState(false);
  const [coachOn, setCoachOn] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chipsOn, setChipsOn] = useState(false);
  const [estado, setEstado] = useState('');
  const [inp, setInp] = useState('');
  const [rec, setRec] = useState(false);
  const [recTxt, setRecTxt] = useState('Grabando 0:00');
  /* Contador que bumpa onDnaChange: el botón «Guardar/Guardada» se repinta
     aunque el toggle venga de otra vista. */
  const [, setDnaVer] = useState(0);

  /* refs de DOM */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const txRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const ondaRef = useRef<SVGSVGElement | null>(null);
  const cabezaRef = useRef<HTMLDivElement | null>(null);
  const burbujaRef = useRef<HTMLDivElement | null>(null);
  const burTRef = useRef<HTMLSpanElement | null>(null);
  const burWRef = useRef<HTMLSpanElement | null>(null);
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const inpRef = useRef<HTMLInputElement | null>(null);
  const playBtnRef = useRef<HTMLButtonElement | null>(null);
  const selElRef = useRef<HTMLButtonElement | null>(null);
  const cerrarBtnRef = useRef<HTMLButtonElement | null>(null);

  /* refs de estado imperativo (los usan listeners que no deben re-suscribirse) */
  const audioListoRef = useRef(false);
  const rafRef = useRef(0);
  const ultimaRef = useRef(-1);
  const scrollManualRef = useRef(0);
  const vueltaARef = useRef<number | null>(null);
  const sonabaRef = useRef(false);
  const cardOnRef = useRef(false);
  const coachOnRef = useRef(false);
  const arrastrandoRef = useRef(false);
  const pintarRef = useRef<() => void>(() => {});
  const WRef = useRef<{ el: HTMLButtonElement; s: number; e: number; li: number }[]>([]);
  /* coach */
  const sesionRef = useRef(0);
  const escribiendoRef = useRef(false);
  const guionRef = useRef<Guion | null>(null);
  const pausadoPorCoachRef = useRef(false);
  const ultimoFocoRef = useRef<Element | null>(null);
  const msgIdRef = useRef(0);
  /* nota de voz */
  const recTimerRef = useRef(0);
  const rec0Ref = useRef(0);

  cardOnRef.current = cardOn;
  coachOnRef.current = coachOn;

  /* ── cargar el pack ─────────────────────────────────────────────────── */
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(episodio.pack, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Pack) => setPack(data))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        console.error('[podcast] pack:', e);
        setFallo(true);
      });
    return () => ctrl.abort();
  }, [episodio.pack]);

  /* Repintar el botón Guardar cuando el DNA cambia desde cualquier sitio. */
  useEffect(() => onDnaChange(() => setDnaVer((v) => v + 1)), []);

  /* play() SIEMPRE con captura: sin esto, un rechazo por política de autoplay
     deja el botón mudo y sin ninguna pista de qué ha pasado. */
  const reproducir = useCallback(() => {
    const p = audioRef.current?.play();
    if (p && p.catch)
      p.catch((e: DOMException) =>
        setAviso(`El navegador bloqueó la reproducción (${e.name}). Toca el botón otra vez.`),
      );
  }, []);

  const irA = useCallback((t: number): boolean => {
    const au = audioRef.current;
    if (!au || !audioListoRef.current) return false;
    try {
      au.currentTime = Math.max(0, Math.min(t, au.duration || t));
      return true;
    } catch {
      return false;
    }
  }, []);

  /* ── karaoke: bucle de pintado + listeners ──────────────────────────────
     rAF mientras suena + timeupdate y seeked como respaldo + visibilitychange
     que repinta y rearma (el rAF se CONGELA en background y sin esto el
     karaoke vuelve descuadrado de una pestaña en segundo plano). */
  useEffect(() => {
    if (!pack) return;
    const au = audioRef.current;
    const tx = txRef.current;
    if (!au || !tx) return;

    /* Las palabras se recogen del DOM en orden de documento, que es el mismo
       orden del flatMap del render: el zip es 1:1. */
    const flat = pack.lineas.flatMap((L, li) => L.w.map((w) => ({ s: w[1], e: w[2], li })));
    const els = tx.querySelectorAll<HTMLButtonElement>('.rp-w');
    const W = flat.map((f, i) => ({ el: els[i], s: f.s, e: f.e, li: f.li }));
    WRef.current = W;
    const turns = Array.from(tx.querySelectorAll<HTMLElement>('.rp-turn'));
    const rects = ondaRef.current ? Array.from(ondaRef.current.querySelectorAll('rect')) : [];

    audioListoRef.current = au.readyState >= 1;
    ultimaRef.current = -1;

    function pintar() {
      if (!au) return;
      const t = au.currentTime;
      let viva = -1;
      for (const x of W) {
        const ahora = t >= x.s && t < x.e;
        x.el.classList.toggle('past', t >= x.e && !ahora);
        x.el.classList.toggle('now', ahora);
        if (ahora) viva = x.li;
      }
      if (viva >= 0 && viva !== ultimaRef.current) {
        ultimaRef.current = viva;
        turns.forEach((el, i) => {
          el.classList.toggle('live', i === viva);
          el.classList.toggle('near', Math.abs(i - viva) === 1);
        });
        /* Autoscroll del turno vivo, suprimido 2,5s tras scroll del usuario y
           suprimido con la tarjeta o el coach abiertos (saltarían el foco). */
        if (performance.now() - scrollManualRef.current > 2500 && !coachOnRef.current && !cardOnRef.current) {
          turns[viva]?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
        }
      }
      const dur = au.duration || 0;
      const N = rects.length;
      const hasta = Math.floor((t / (dur || 1)) * N);
      for (let i = 0; i < N; i++) {
        const o = i < hasta ? '1' : i === hasta ? '.7' : '.26';
        if (rects[i].getAttribute('opacity') !== o) rects[i].setAttribute('opacity', o);
      }
      if (cabezaRef.current) cabezaRef.current.style.left = (t / (dur || 1)) * 100 + '%';
      if (timeRef.current) timeRef.current.textContent = fmt(t) + ' / ' + fmt(dur);
      const sc = scrubRef.current;
      if (sc) {
        sc.setAttribute('aria-valuenow', String(dur ? Math.round((t / dur) * 100) : 0));
        sc.setAttribute('aria-valuetext', fmt(t) + ' de ' + fmt(dur));
      }
    }
    pintarRef.current = pintar;

    function bucle() {
      pintar();
      rafRef.current = requestAnimationFrame(bucle);
    }
    const onMeta = () => {
      audioListoRef.current = true;
      pintar();
    };
    const onError = () => setAviso('No se pudo cargar el audio en este navegador.');
    const onPlay = () => {
      setSonando(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(bucle);
    };
    const onPause = () => {
      setSonando(false);
      cancelAnimationFrame(rafRef.current);
    };
    const onVis = () => {
      if (!document.hidden) {
        pintar();
        if (!au.paused) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(bucle);
        }
      }
    };
    const marcaScroll = () => {
      scrollManualRef.current = performance.now();
    };

    au.addEventListener('loadedmetadata', onMeta);
    au.addEventListener('error', onError);
    au.addEventListener('timeupdate', pintar);
    au.addEventListener('seeked', pintar);
    au.addEventListener('play', onPlay);
    au.addEventListener('pause', onPause);
    au.addEventListener('ended', onPause);
    document.addEventListener('visibilitychange', onVis);
    addEventListener('wheel', marcaScroll, { passive: true });
    addEventListener('touchmove', marcaScroll, { passive: true });
    pintar();

    return () => {
      cancelAnimationFrame(rafRef.current);
      au.pause();
      au.removeEventListener('loadedmetadata', onMeta);
      au.removeEventListener('error', onError);
      au.removeEventListener('timeupdate', pintar);
      au.removeEventListener('seeked', pintar);
      au.removeEventListener('play', onPlay);
      au.removeEventListener('pause', onPause);
      au.removeEventListener('ended', onPause);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('wheel', marcaScroll);
      removeEventListener('touchmove', marcaScroll);
    };
  }, [pack]);

  /* ── barra fija: su altura REAL a --barh (var CSS) ──────────────────────
     El padding-bottom del contenido y la posición de la tarjeta la siguen;
     un número fijo se desalinea en cuanto el safe-area o el wrap cambian. */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const medir = () =>
      document.documentElement.style.setProperty('--barh', bar.offsetHeight + 14 + 'px');
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(bar);
    addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      removeEventListener('resize', medir);
      document.documentElement.style.removeProperty('--barh');
    };
  }, [pack]);

  /* Teclado del móvil: que la píldora de escribir del coach no quede debajo. */
  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const sync = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', kb + 'px');
      if (coachOnRef.current && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      document.documentElement.style.removeProperty('--kb');
    };
  }, []);

  /* ── tarjeta de palabra ─────────────────────────────────────────────── */
  const quitarPick = () => {
    txRef.current?.querySelectorAll('.rp-w.pick').forEach((o) => o.classList.remove('pick'));
  };

  const cerrarCarta = useCallback(() => {
    setCardOn(false);
    quitarPick();
    const au = audioRef.current;
    /* Cerrar te devuelve EXACTAMENTE a donde estabas: consultar una palabra
       no puede costarte tu posición en el episodio. */
    if (au && vueltaARef.current !== null) {
      if (Math.abs(au.currentTime - vueltaARef.current) > 0.05) irA(vueltaARef.current);
      if (sonabaRef.current) reproducir();
      vueltaARef.current = null;
      sonabaRef.current = false;
    }
  }, [irA, reproducir]);

  const onClickTx = (e: React.MouseEvent) => {
    if (!pack) return;
    const el = (e.target as HTMLElement).closest<HTMLButtonElement>('.rp-w');
    if (!el) return;
    quitarPick();
    el.classList.add('pick');
    /* Roving tabindex: la palabra tocada pasa a ser la entrada de su línea. */
    el.closest('.rp-line')?.querySelectorAll<HTMLButtonElement>('.rp-w').forEach((o) => (o.tabIndex = -1));
    el.tabIndex = 0;
    const li = Number(el.dataset.li);
    const wi = Number(el.dataset.wi);
    const L = pack.lineas[li];
    const bruta = L.w[wi][0];
    const limpia = bruta.toLowerCase().replace(/[^a-z']/g, '');
    /* Consultar NO debe moverte de sitio: recordamos dónde estabas y pausamos.
       Antes esto saltaba al inicio de la palabra y perdías tu posición. */
    const au = audioRef.current;
    if (au) {
      if (vueltaARef.current === null) {
        vueltaARef.current = au.currentTime;
        sonabaRef.current = !au.paused;
      }
      au.pause();
    }
    selElRef.current = el;
    setSel({ bruta, limpia, trad: tradDe(pack.glosario, limpia), li, wi });
    setCardOn(true);
  };

  /* Flechas dentro de la línea (roving tabindex): ←/→/Home/End. */
  const onKeyLinea = (e: React.KeyboardEvent<HTMLParagraphElement>) => {
    const p = e.currentTarget;
    const ws = Array.from(p.querySelectorAll<HTMLButtonElement>('.rp-w'));
    const i = ws.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let j: number | null = null;
    if (e.key === 'ArrowRight') j = Math.min(i + 1, ws.length - 1);
    else if (e.key === 'ArrowLeft') j = Math.max(i - 1, 0);
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = ws.length - 1;
    else return;
    e.preventDefault();
    ws[i].tabIndex = -1;
    ws[j].tabIndex = 0;
    ws[j].focus();
  };

  /* Colocar la tarjeta pegada a la palabra si cabe; si no, se queda en su
     posición por defecto (encima de la barra, del CSS). */
  useLayoutEffect(() => {
    const card = cardRef.current;
    const el = selElRef.current;
    if (!cardOn || !card) return;
    card.style.top = '';
    card.style.bottom = '';
    if (!el) return;
    const G = 12;
    const h = card.offsetHeight;
    const barTop = barRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    const r = el.getBoundingClientRect();
    if (r.bottom + G + h <= barTop - G) {
      card.style.top = r.bottom + G + 'px';
      card.style.bottom = 'auto';
    } else if (r.top - G - h >= G) {
      card.style.top = r.top - G - h + 'px';
      card.style.bottom = 'auto';
    }
  }, [cardOn, sel]);

  /* Guardar = TOGGLE contra el DNA. Nunca duplica: si ya está, la quita. */
  const termDe = (s: Sel) => sinSignos(s.bruta);
  const guardada = sel ? dnaTieneSlang(termDe(sel)) : false;
  const onGuardar = () => {
    if (!sel || !pack) return;
    const term = termDe(sel);
    if (dnaTieneSlang(term)) {
      removeDnaSlang(term);
    } else {
      const L = pack.lineas[sel.li];
      saveDNA({
        type: 'slang',
        term,
        meaning: sel.trad || L.es,
        example: L.w.map((x) => x[0]).join(' '),
      });
    }
  };

  const onOir = () => {
    if (!sel || !pack) return;
    /* «Oír la frase» SÍ es un salto querido: anula la vuelta pendiente. */
    vueltaARef.current = null;
    sonabaRef.current = false;
    if (irA(pack.lineas[sel.li].a)) reproducir();
  };

  /* ── coach ──────────────────────────────────────────────────────────── */
  const agregarMsg = (m: Omit<Msg, 'id'>) => {
    const id = ++msgIdRef.current;
    setMsgs((prev) => [...prev, { ...m, id }]);
    return id;
  };

  /* responder(): burbujas con indicador de escribiendo, retardo proporcional
     al texto. El token de sesión garantiza que una respuesta EN VUELO nunca
     aparece en el chat de otra palabra (el bug de filtración del demo). */
  const responder = useCallback((partes: string[], fin?: () => void) => {
    const mia = sesionRef.current;
    escribiendoRef.current = true;
    setChipsOn(false);
    let i = 0;
    const paso = () => {
      if (mia !== sesionRef.current) return;
      if (i >= partes.length) {
        escribiendoRef.current = false;
        setEstado('');
        fin?.();
        return;
      }
      const parte = partes[i];
      const typingId = ++msgIdRef.current;
      setMsgs((prev) => [...prev, { id: typingId, quien: 'c', typing: true }]);
      setEstado('Tu coach está escribiendo');
      window.setTimeout(
        () => {
          if (mia !== sesionRef.current) {
            setMsgs((prev) => prev.filter((x) => x.id !== typingId));
            return;
          }
          setMsgs((prev) =>
            prev.map((x) => (x.id === typingId ? { id: x.id, quien: 'c' as const, html: md(parte) } : x)),
          );
          i++;
          window.setTimeout(paso, 140);
        },
        Math.min(1100, 380 + parte.length * 3.2),
      );
    };
    paso();
  }, []);

  const abrirCoach = () => {
    if (!sel || !pack) return;
    sesionRef.current++;
    escribiendoRef.current = false;
    ultimoFocoRef.current = document.activeElement;
    const au = audioRef.current;
    pausadoPorCoachRef.current = sonabaRef.current || !!(au && !au.paused);
    au?.pause();
    setCardOn(false);
    setMsgs([]);
    setChipsOn(false);
    setEstado('');
    setCoachOn(true);
    const L = pack.lineas[sel.li];
    const exp = expresionDe(pack, sel.limpia);
    const base = fallbackGuion(sel, L);
    /* Si la palabra cae en una expresión del pack, el guion es el suyo
       (intro/ejemplo/cierre pregenerados); los chips siguen siendo los del
       fallback — el pack no trae seguimientos. */
    guionRef.current = exp
      ? { intro: exp.coach_intro, ejemplo: exp.coach_ejemplo, cierre: exp.coach_cierre, chips: base.chips }
      : base;
    agregarMsg({ quien: 'u', texto: `¿Qué significa "${sinSignos(sel.bruta)}" aquí?` });
    const g = guionRef.current;
    /* setTimeout y NO requestAnimationFrame: el rAF se congela con la pestaña
       en background (la misma trampa del karaoke) y la respuesta se quedaría
       colgada hasta volver a primer plano. */
    window.setTimeout(() => responder([g.intro, g.ejemplo, g.cierre], () => setChipsOn(true)), 30);
    /* Foco al input solo con puntero fino: en móvil levantaría el teclado.
       Sin puntero fino el foco va al botón cerrar de la hoja: si se quedara
       donde estaba, ese elemento se vuelve inert, el foco cae a body y desde
       body Tab aterrizaría en el chrome invisible detrás del velo (la trampa
       onKeySheet solo actúa con el foco YA dentro de la hoja). */
    if (matchMedia('(pointer:fine)').matches)
      window.setTimeout(() => inpRef.current?.focus({ preventScroll: true }), 400);
    else window.setTimeout(() => cerrarBtnRef.current?.focus({ preventScroll: true }), 30);
  };

  const cancelarRec = useCallback(() => {
    clearInterval(recTimerRef.current);
    recTimerRef.current = 0;
    setRec(false);
  }, []);

  /* Higiene de unmount: cancelarRec/pararRec solo corren desde handlers; un
     desmonte externo a media grabación (p.ej. el gate de sesión de App.tsx
     desmonta el árbol entero sin pasar por cerrarCoach) dejaría el intervalo
     vivo llamando setRecTxt sobre un componente muerto para siempre. */
  useEffect(
    () => () => {
      clearInterval(recTimerRef.current);
    },
    [],
  );

  const cerrarCoach = useCallback(() => {
    sesionRef.current++;
    escribiendoRef.current = false;
    cancelarRec();
    setCoachOn(false);
    /* Quitar el inert AHORA, no en el efecto: el efecto corre tras el
       re-render y este focus() es síncrono — sobre un destino aún inerte el
       foco se rechaza en silencio y cae a body. El efecto repetirá inert=false
       después; es idempotente. */
    [document.getElementById('root'), rootRef.current, barRef.current, cardRef.current].forEach(
      (n) => {
        if (n) n.inert = false;
      },
    );
    /* Devolver el foco: si venía de la tarjeta (que ya se cerró), al play. */
    const uf = ultimoFocoRef.current as HTMLElement | null;
    const destino = uf && uf.closest && uf.closest('.rp-card') ? playBtnRef.current : uf;
    if (destino && typeof destino.focus === 'function') destino.focus({ preventScroll: true });
    quitarPick();
    const au = audioRef.current;
    if (au && vueltaARef.current !== null) {
      if (Math.abs(au.currentTime - vueltaARef.current) > 0.05) irA(vueltaARef.current);
      vueltaARef.current = null;
    }
    if (pausadoPorCoachRef.current) {
      reproducir();
      pausadoPorCoachRef.current = false;
    }
    sonabaRef.current = false;
  }, [cancelarRec, irA, reproducir]);

  /* Fondo inerte mientras el coach está abierto: en el demo el fondo era la
     página ENTERA ([.wrap, .bar, card]); aquí rootRef es solo el .rp dentro de
     la Card, así que además se inerta #root completo — la fila superior (menú,
     toggler de tema) y el ← de la vista quedan detrás del velo pero seguían
     alcanzables con Tab desde body. El coach vive en un portal a document.body,
     fuera de #root, así que no se auto-inerta. La barra y la tarjeta también
     viven en ese portal: siguen necesitando su inert explícito. */
  useEffect(() => {
    const fondo = [document.getElementById('root'), rootRef.current, barRef.current, cardRef.current];
    fondo.forEach((n) => {
      if (n) n.inert = coachOn;
    });
    return () => {
      fondo.forEach((n) => {
        if (n) n.inert = false;
      });
    };
  }, [coachOn]);

  /* Escape cierra (coach primero, luego tarjeta) — mientras la vista viva.
     RECORTE INTENCIONAL vs el demo: el atajo Espacio-sobre-body para
     play/pausa (demo línea 532) NO se porta. En la página standalone el body
     era casi siempre el target; aquí la vista convive con el chrome de la app
     y con los inputs del coach, así que el atajo dispararía en situaciones
     ambiguas y casi nunca en la que el demo cubría. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (coachOnRef.current) cerrarCoach();
      else if (cardOnRef.current) cerrarCarta();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [cerrarCoach, cerrarCarta]);

  /* Trampa de foco con Tab dentro de la hoja del coach. */
  const onKeySheet = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const f = Array.from(
      sheet.querySelectorAll<HTMLElement>('button,input,[tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0);
    if (!f.length) return;
    const pri = f[0];
    const ult = f[f.length - 1];
    if (e.shiftKey && document.activeElement === pri) {
      e.preventDefault();
      ult.focus();
    } else if (!e.shiftKey && document.activeElement === ult) {
      e.preventDefault();
      pri.focus();
    }
  };

  /* Log siempre abajo cuando entran mensajes. */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [msgs, chipsOn]);

  const onChip = (c: { k: ChipKey; label: string }) => {
    if (escribiendoRef.current) return;
    const g = guionRef.current;
    if (!g) return;
    agregarMsg({ quien: 'u', texto: c.label });
    setChipsOn(false);
    responder([g.chips[c.k]], () => {
      agregarMsg({
        quien: 'c',
        html: md('¿Te queda alguna otra duda? Puedes escribirme o mandarme una nota de voz.'),
      });
      setChipsOn(true);
    });
  };

  const enviar = () => {
    if (escribiendoRef.current) return;
    const v = inp.trim();
    if (!v) return;
    setInp('');
    agregarMsg({ quien: 'u', texto: v });
    setChipsOn(false);
    responder(
      [
        'Buena pregunta. Muy pronto tu coach responderá esto en vivo, con el contexto completo del episodio, tu nivel y las palabras que ya has guardado.\n\nDe momento, estos son los caminos que sí tengo listos para **"' +
          (sel ? sinSignos(sel.bruta) : '') +
          '"**:',
      ],
      () => setChipsOn(true),
    );
  };

  /* ── nota de voz simulada: deslizar fuera CANCELA (antes enviaba la nota a
     media frase); blur cancela; Espacio/Intro alterna con teclado. ──────── */
  const empezarRec = () => {
    if (recTimerRef.current) return;
    rec0Ref.current = performance.now();
    setRecTxt('Grabando 0:00');
    setRec(true);
    recTimerRef.current = window.setInterval(() => {
      setRecTxt('Grabando ' + fmt((performance.now() - rec0Ref.current) / 1000));
    }, 200);
  };
  const pararRec = () => {
    if (!recTimerRef.current) return;
    const s = (performance.now() - rec0Ref.current) / 1000;
    cancelarRec();
    if (escribiendoRef.current) return;
    if (s < 0.45) {
      agregarMsg({ quien: 'u', texto: 'Mantén pulsado para grabar' });
      responder(
        [
          'Mantén el botón pulsado mientras hablas y suéltalo al terminar. Si te sales del botón antes de soltar, se cancela. Puedes preguntarme en español o intentarlo en inglés: si lo dices en inglés, además te corrijo la pronunciación.',
        ],
        () => setChipsOn(true),
      );
      return;
    }
    agregarMsg({ quien: 'u', texto: 'Nota de voz - ' + fmt(s) });
    setChipsOn(false);
    /* La escucha simulada: typing 900ms y respuesta honesta (el micrófono de
       verdad llega con /api/chat; aquí el flujo es el real, el audio no). */
    const mia = sesionRef.current;
    const typingId = ++msgIdRef.current;
    setMsgs((prev) => [...prev, { id: typingId, quien: 'c', typing: true }]);
    window.setTimeout(() => {
      setMsgs((prev) => prev.filter((x) => x.id !== typingId));
      if (mia !== sesionRef.current) return;
      responder(
        [
          'Te he escuchado. Cuando el coach en vivo llegue a esta vista, transcribo tu audio, te respondo la duda y de paso te digo qué sonidos se te escaparon.\n\nEl flujo ya es exactamente este: **mantienes pulsado, hablas, sueltas**.',
        ],
        () => setChipsOn(true),
      );
    }, 900);
  };
  const onMicDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    /* En táctil el navegador captura el puntero al botón y pointerleave no
       dispararía jamás: se suelta la captura para que salirse cancele. */
    const el = e.currentTarget;
    if (e.pointerType !== 'mouse' && el.hasPointerCapture && el.hasPointerCapture(e.pointerId))
      el.releasePointerCapture(e.pointerId);
    empezarRec();
  };
  const onMicKey = (e: React.KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (e.repeat) return;
    e.preventDefault();
    if (recTimerRef.current) pararRec();
    else empezarRec();
  };

  /* ── scrub / onda ───────────────────────────────────────────────────── */
  const posDe = (e: React.PointerEvent) => {
    const r = scrubRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, ((e.clientX || 0) - r.left) / r.width));
  };
  /* Previsualización: tiempo + hablante + las ~5 palabras que vienen. */
  const verPrevia = (e: React.PointerEvent) => {
    if (!pack) return;
    const au = audioRef.current;
    const bur = burbujaRef.current;
    if (!au || !bur) return;
    const f = posDe(e);
    const dur = au.duration || 0;
    const t = f * dur;
    bur.style.left = f * 100 + '%';
    const L = pack.lineas.find((l) => t >= l.a && t < l.b);
    if (burTRef.current) burTRef.current.textContent = fmt(t) + (L ? ' · ' + L.s : '');
    if (burWRef.current) {
      const W = WRef.current;
      const i = W.findIndex((x) => x.e > t);
      burWRef.current.textContent =
        i >= 0
          ? W.slice(i, i + 5)
              .map((x) => x.el.textContent)
              .join(' ')
          : '';
    }
  };
  const onScrubDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* iOS viejo sin captura: el drag sigue funcionando dentro del elemento */
    }
    arrastrandoRef.current = true;
    e.currentTarget.classList.add('arrastrando');
    irA(posDe(e) * (audioRef.current?.duration || 0));
    verPrevia(e);
    pintarRef.current();
  };
  const onScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    verPrevia(e);
    if (!arrastrandoRef.current) return;
    irA(posDe(e) * (audioRef.current?.duration || 0));
    pintarRef.current();
  };
  const onScrubUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrandoRef.current) return;
    arrastrandoRef.current = false;
    e.currentTarget.classList.remove('arrastrando');
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* sin captura previa */
    }
  };
  const onScrubKey = (e: React.KeyboardEvent) => {
    const au = audioRef.current;
    if (!au) return;
    if (e.key === 'ArrowRight') {
      irA(au.currentTime + 5);
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft') {
      irA(au.currentTime - 5);
      e.preventDefault();
    }
    if (e.key === 'Home') {
      irA(0);
      e.preventDefault();
    }
    if (e.key === 'End') {
      irA((au.duration || 0) - 0.1);
      e.preventDefault();
    }
  };

  /* ── transporte ─────────────────────────────────────────────────────── */
  const onPlayClick = () => {
    const au = audioRef.current;
    if (!au) return;
    if (au.paused) reproducir();
    else au.pause();
  };
  const onRate = () => {
    const ni = (iv + 1) % VEL.length;
    setIv(ni);
    if (audioRef.current) audioRef.current.playbackRate = VEL[ni];
  };

  /* ── render ─────────────────────────────────────────────────────────── */
  if (fallo) {
    return (
      <div className="rp">
        <p className="rp-cargando">No se pudo cargar el episodio. Revisa la conexión y vuelve a entrar.</p>
        <button type="button" className="rp-tbtn" style={{ marginTop: 12 }} onClick={onVolver}>
          Volver a los episodios
        </button>
      </div>
    );
  }
  if (!pack) {
    return (
      <div className="rp">
        <p className="rp-cargando">Cargando episodio…</p>
      </div>
    );
  }

  const rolDe = (s: string) => (s === pack.hosts.A ? 'a' : 'b');
  const rateEtq = ETQ[String(VEL[iv])];
  const selL = sel ? pack.lineas[sel.li] : null;

  return (
    <div className="rp" ref={rootRef}>
      {/* En tema gradiente el reproductor se viste de gate: las manchas
          borrosas del login viven detrás del contenido (el CSS las muestra
          solo bajo [data-fondo='gradiente'] y define sus --color-*). */}
      <div className="rp-fondo-login" aria-hidden="true">
        <GradientBackground />
      </div>
      <header className="rp-head">
        <h3 className="rp-tit" lang="en">
          {pack.titulo_en}
        </h3>
        <p className="rp-sub">
          {pack.hosts.A} &amp; {pack.hosts.B} · {episodio.duracion}
        </p>
      </header>

      {aviso ? (
        <p className="rp-aviso" role="alert">
          {aviso}
        </p>
      ) : null}

      {/* El audio va por URL normal; nada de base64 (el demo aprendió a las
          malas que un data: URI grande puede no decodificar a tiempo). */}
      <audio ref={audioRef} src={pack.audio} preload="auto" />

      <div ref={txRef} onClick={onClickTx}>
        {pack.lineas.map((L, li) => (
          <Turno
            key={li}
            L={L}
            li={li}
            rol={rolDe(L.s)}
            onOirTurno={() => {
              if (irA(L.a)) reproducir();
            }}
            onKeyLinea={onKeyLinea}
          />
        ))}
      </div>

      {/* ── barra de transporte (portal: fixed de verdad, sin que un transform
          de un ancestro la convierta en absoluta) ─────────────────────── */}
      {createPortal(
        <div className="rp-portal">
          <div className="rp-bar" ref={barRef}>
            <div className="rp-bar-in">
              <div
                className="rp-scrub"
                ref={scrubRef}
                role="slider"
                tabIndex={0}
                aria-label="Posición del audio"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
                aria-valuetext="0:00"
                onPointerDown={onScrubDown}
                onPointerMove={onScrubMove}
                onPointerUp={onScrubUp}
                onPointerCancel={onScrubUp}
                onKeyDown={onScrubKey}
              >
                <svg className="rp-onda" ref={ondaRef} viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden="true">
                  {pack.onda.map((v, i) => {
                    const N = pack.onda.length;
                    const h = Math.max(2.5, v * 34);
                    const d = pack.dueno[i];
                    return (
                      <rect
                        key={i}
                        x={(i * 220) / N + 0.35}
                        width={Math.max(1, 220 / N - 0.7)}
                        y={(40 - h) / 2}
                        height={h}
                        rx={0.5}
                        fill={d === 0 ? 'var(--rp-host-a)' : d === 1 ? 'var(--rp-host-b)' : 'var(--text-muted)'}
                        opacity={0.26}
                      />
                    );
                  })}
                </svg>
                <div className="rp-cabeza" ref={cabezaRef} style={{ left: 0 }} />
                <div className="rp-burbuja" ref={burbujaRef} style={{ left: 0 }}>
                  <span className="rp-burbuja__t" ref={burTRef}>
                    0:00
                  </span>
                  <span className="rp-burbuja__w" ref={burWRef} lang="en" />
                </div>
              </div>
              <div className="rp-ctl">
                <span className="rp-gbw">
                  <button
                    type="button"
                    className="rp-gb rp-play"
                    ref={playBtnRef}
                    onClick={onPlayClick}
                    aria-label={sonando ? 'Pausar' : 'Reproducir'}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={sonando ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z'} />
                    </svg>
                  </button>
                  <span className="rp-gbsh" aria-hidden="true" />
                </span>
                <span className="rp-time" ref={timeRef}>
                  0:00 / 0:00
                </span>
                <span className="rp-spacer" />
                <span className="rp-gbw">
                  <button
                    type="button"
                    className={'rp-gb rp-rate' + (VEL[iv] !== 1 ? ' alterada' : '')}
                    onClick={onRate}
                    aria-label={`Velocidad de reproducción, ahora ${rateEtq}. Toca para cambiar.`}
                  >
                    {rateEtq}
                  </button>
                  <span className="rp-gbsh" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>

          {/* ── tarjeta de palabra ─────────────────────────────────────── */}
          <div className={'rp-card' + (cardOn ? ' on' : '')} ref={cardRef} role="dialog" aria-label="Palabra seleccionada">
            {sel && selL ? (
              <>
                <div className="rp-card__top">
                  <div>
                    <p className="rp-card__w" lang="en">
                      {sel.bruta}
                    </p>
                    <p className="rp-card__es">{sel.trad || 'Sin entrada de glosario, pregúntale al coach'}</p>
                    <button type="button" className="rp-oir" onClick={onOir}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Oír la frase
                    </button>
                  </div>
                  <button type="button" className="rp-x" onClick={cerrarCarta} aria-label="Cerrar">
                    ×
                  </button>
                </div>
                <p className="rp-card__ctx">{selL.es}</p>
                <div className="rp-card__act">
                  <button
                    type="button"
                    className={'rp-btn ' + (guardada ? 'rp-btn--ok' : 'rp-btn--tinta')}
                    onClick={onGuardar}
                    aria-pressed={guardada}
                  >
                    {guardada ? 'Guardada' : 'Guardar'}
                  </button>
                  <button type="button" className="rp-btn" onClick={abrirCoach}>
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.5A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
                    </svg>
                    Preguntar al coach
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* ── coach (hoja inferior) ──────────────────────────────────── */}
          {coachOn ? (
            <div className="rp-coach" role="dialog" aria-modal="true" aria-label="Chat con tu coach">
              <div className="rp-coach__bg" onClick={cerrarCoach} />
              <div className="rp-coach__sheet" ref={sheetRef} onKeyDown={onKeySheet}>
                <div className="rp-coach__head">
                  <div className="rp-avatar" aria-hidden="true">
                    R
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="rp-coach__name">Tu coach</p>
                    <p className="rp-coach__sub">
                      {sel && selL ? (
                        <>
                          Sobre <span lang="en">"{sinSignos(sel.bruta)}"</span> - {fmt(selL.w[sel.wi][1])}
                        </>
                      ) : (
                        'Sobre una palabra del episodio'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rp-x"
                    ref={cerrarBtnRef}
                    onClick={cerrarCoach}
                    aria-label="Cerrar y seguir escuchando"
                  >
                    ×
                  </button>
                </div>
                <p className="rp-sr" aria-live="polite">
                  {estado}
                </p>
                <div className="rp-log" ref={logRef} role="log" aria-live="polite">
                  {msgs.map((m) =>
                    m.typing ? (
                      <div key={m.id} className="rp-msg rp-msg--c rp-typing">
                        <i />
                        <i />
                        <i />
                      </div>
                    ) : m.quien === 'u' ? (
                      <div key={m.id} className="rp-msg rp-msg--u">
                        {m.texto}
                      </div>
                    ) : (
                      <div key={m.id} className="rp-msg rp-msg--c" dangerouslySetInnerHTML={{ __html: m.html || '' }} />
                    ),
                  )}
                </div>
                <div className="rp-sug">
                  {chipsOn
                    ? CHIPS.map((c) => (
                        <button key={c.k} type="button" className="rp-tbtn" onClick={() => onChip(c)}>
                          {c.label}
                        </button>
                      ))
                    : null}
                </div>
                <div className="rp-compose">
                  <div className={'rp-reclabel' + (rec ? ' on' : '')}>
                    <span className="rp-bars" aria-hidden="true">
                      <i style={{ animationDelay: '0s' }} />
                      <i style={{ animationDelay: '.1s' }} />
                      <i style={{ animationDelay: '.2s' }} />
                      <i style={{ animationDelay: '.3s' }} />
                      <i style={{ animationDelay: '.15s' }} />
                    </span>
                    <span>{recTxt}</span>
                    <span className="suelta">suelta para enviar</span>
                  </div>
                  <div className="rp-gi">
                    <input
                      ref={inpRef}
                      value={inp}
                      placeholder="Escribe tu duda…"
                      aria-label="Escribe tu duda"
                      onChange={(e) => setInp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') enviar();
                      }}
                    />
                    <button
                      type="button"
                      className={'rp-ico rp-mic' + (rec ? ' rec' : '')}
                      aria-label="Mantén pulsado para grabar una nota de voz"
                      aria-pressed={rec}
                      onPointerDown={onMicDown}
                      onPointerUp={pararRec}
                      onPointerLeave={cancelarRec}
                      onPointerCancel={cancelarRec}
                      onBlur={cancelarRec}
                      onKeyDown={onMicKey}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="9" y="2.5" width="6" height="11" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
                      </svg>
                    </button>
                    <button type="button" className="rp-ico rp-send" aria-label="Enviar" onClick={enviar}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h13M12 5.5l6.5 6.5-6.5 6.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* Un turno de la conversación. Componente propio SOLO por el toggle local de
   «Ver en español»; las clases live/near/past/now las pinta el bucle
   imperativo del padre — este componente no re-renderiza a 60fps. */
function Turno({
  L,
  li,
  rol,
  onOirTurno,
  onKeyLinea,
}: {
  L: Linea;
  li: number;
  rol: 'a' | 'b';
  onOirTurno: () => void;
  onKeyLinea: (e: React.KeyboardEvent<HTMLParagraphElement>) => void;
}) {
  const [esVisible, setEsVisible] = useState(false);
  return (
    <article className="rp-turn" data-rol={rol}>
      <button
        type="button"
        className="rp-who"
        aria-label={`Escuchar el turno de ${L.s} desde ${fmt(L.a)}`}
        onClick={onOirTurno}
      >
        {L.s}
      </button>
      <div>
        <p
          className="rp-line"
          lang="en"
          role="group"
          aria-label={`Palabras del turno de ${L.s}. Flechas para recorrerlas, Intro para la traducción.`}
          onKeyDown={onKeyLinea}
        >
          {L.w.map((w, wi) => (
            // El espacio va FUERA del botón, como nodo de texto: dentro se
            // subrayaría/pintaría con la palabra activa.
            <span key={wi}>
              <button type="button" className="rp-w" tabIndex={wi === 0 ? 0 : -1} data-li={li} data-wi={wi}>
                {w[0]}
              </button>{' '}
            </span>
          ))}
        </p>
        {L.nota ? <div className="rp-nota">{L.nota}</div> : null}
        {esVisible ? <p className="rp-es">{L.es}</p> : null}
        {/* RECORTE INTENCIONAL vs el demo: el botón por turno «Guardar la
            frase» (demo líneas 110-114) no se porta. En la app el guardado al
            DNA vive en la tarjeta de palabra (toggle con dnaTieneSlang) y una
            frase entera como term de slang ensuciaría esa lista; si algún día
            se quiere, es un saveDNA type:'slang' con term=frase y meaning=L.es. */}
        <div className="rp-tools">
          <button type="button" className="rp-tbtn" aria-expanded={esVisible} onClick={() => setEsVisible((v) => !v)}>
            {esVisible ? 'Ocultar español' : 'Ver en español'}
          </button>
        </div>
      </div>
    </article>
  );
}
