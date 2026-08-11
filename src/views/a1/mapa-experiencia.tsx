import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronDown, LifeBuoy, MessageCircle, RotateCcw, Star } from 'lucide-react';

import type { A1TramoId, A1UnitRuta } from '@/content/a1/tipos-ruta';
import { tieneCoach } from '@/lib/coach-a1';
import { useApp } from '@/stores/app';
import {
  escenasHechas,
  estaDesbloqueada,
  puntoDeRetomar,
  useA1,
} from '@/stores/a1';

import './mapa-experiencia.css';

type EstadoVisual = 'hecha' | 'actual' | 'abierta' | 'bloqueada';

type RegionConfig = {
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  tramos: A1TramoId[];
  background: string;
  family: 'orange' | 'blue' | 'glass' | 'work';
};

type RegionVisual = RegionConfig & {
  units: A1UnitRuta[];
  hechas: number;
};

type MapaExperienciaProps = {
  onUnidad: (id: string) => void;
  onCoach: (unitId: string) => void;
  onRepaso: () => void;
  onSeguir: () => void;
  onGuardadas: () => void;
  onPanico: () => void;
};

const ASSET = '/assets/a1-experience';

const REGION_CONFIGS: RegionConfig[] = [
  {
    key: 'base',
    title: 'Antes de hablar',
    eyebrow: 'MAPA 01 · A1',
    description: 'De cero a decir treinta cosas sin traducir.',
    tramos: ['t0'],
    background: `${ASSET}/route-world-bg.webp`,
    family: 'orange',
  },
  {
    key: 'daily',
    title: 'Vida cotidiana',
    eyebrow: 'MAPA 02 · A1',
    description: 'Muévete por la ciudad y resuelve momentos reales.',
    tramos: ['t1', 't2'],
    background: `${ASSET}/city-diorama.webp`,
    family: 'blue',
  },
  {
    key: 'travel',
    title: 'Viajes',
    eyebrow: 'MAPA 03 · BLUE GLASS',
    description: 'Del avión al hotel sin pedirle a nadie que traduzca.',
    tramos: ['t3'],
    background: '/assets/mundo/t3-viaje.c132a2ac.webp',
    family: 'glass',
  },
  {
    key: 'work',
    title: 'Tu trabajo',
    eyebrow: 'MAPA 04 · A1',
    description: 'Las situaciones y palabras de tu puesto real.',
    tramos: ['t4', 't5'],
    background: '/assets/mundo/t4-convenciones.05dddebd.webp',
    family: 'work',
  },
];

const ART_BY_UNIT: Record<string, string> = {
  't0-cognados': `${ASSET}/notebook-3dicons.png`,
  't0-sonidos': `${ASSET}/headphones-3dicons.png`,
  't0-cortesia': `${ASSET}/chat-3dicons.png`,
  't0-numeros': `${ASSET}/calculator-3dicons.png`,
  't0-ser-estar': `${ASSET}/text-3dicons.png`,
  't0-preguntas': `${ASSET}/mic-3dicons.png`,
  'u1-llegar': `${ASSET}/goal-travel-lummi.png`,
  'u2-supervivencia': `${ASSET}/goal-target-lummi.png`,
  'u3-presentarte': `${ASSET}/goal-friends-lummi.png`,
  'u4-smalltalk': `${ASSET}/coffee-route-lummi.webp`,
  'u5-ayuda': `${ASSET}/style-conversation-lummi.png`,
  'u6-reunion': `${ASSET}/goal-work-lummi.png`,
  'u7-tareas': `${ASSET}/style-challenges-lummi.png`,
  't3-aeropuerto': `${ASSET}/goal-travel-lummi.png`,
  't3-migracion': `${ASSET}/goal-target-lummi.png`,
  't3-avion': `${ASSET}/headphones-3dicons.png`,
  't3-moverte': `${ASSET}/blue-glass-sphere-lummi.webp`,
  't3-hotel': `${ASSET}/notebook-3dicons.png`,
  't3-comer': `${ASSET}/coffee-route-lummi.webp`,
  't3-comprar': `${ASSET}/calculator-3dicons.png`,
  't3-se-dana': `${ASSET}/style-challenges-lummi.png`,
};

const ART_FALLBACK = [
  `${ASSET}/notebook-3dicons.png`,
  `${ASSET}/headphones-3dicons.png`,
  `${ASSET}/chat-3dicons.png`,
  `${ASSET}/calculator-3dicons.png`,
  `${ASSET}/text-3dicons.png`,
  `${ASSET}/mic-3dicons.png`,
  `${ASSET}/goal-travel-lummi.png`,
  `${ASSET}/goal-work-lummi.png`,
];

function arteDe(unit: A1UnitRuta, index: number): string {
  return ART_BY_UNIT[unit.id] ?? ART_FALLBACK[index % ART_FALLBACK.length]!;
}

function estadoDe(unit: A1UnitRuta, actualId: string | null): EstadoVisual {
  if (escenasHechas(unit)) return 'hecha';
  if (!estaDesbloqueada(unit.id)) return 'bloqueada';
  return unit.id === actualId ? 'actual' : 'abierta';
}

function rutaSvg(cantidad: number): string {
  const paso = 92;
  let d = 'M 42 42';
  for (let i = 1; i < cantidad; i += 1) {
    const y = 42 + i * paso;
    const x = i % 4 === 1 ? 54 : i % 4 === 3 ? 30 : 42;
    const anteriorY = y - paso;
    d += ` C 42 ${anteriorY + 28}, ${x} ${y - 28}, ${x} ${y}`;
  }
  return d;
}

function Region({
  region,
  index,
  actualId,
  onUnidad,
  onCoach,
  onRef,
}: {
  region: RegionVisual;
  index: number;
  actualId: string | null;
  onUnidad: (unit: A1UnitRuta) => void;
  onCoach: (unit: A1UnitRuta) => void;
  onRef: (element: HTMLElement | null) => void;
}) {
  const alto = Math.max(552, region.units.length * 92 + 18);
  const path = rutaSvg(region.units.length);
  const progreso = region.units.length ? Math.round((region.hechas / region.units.length) * 100) : 0;

  return (
    <section
      ref={(element) => onRef(element)}
      className="a1j-region"
      data-region={region.key}
      data-family={region.family}
      aria-label={`Mapa ${index + 1}: ${region.title}`}
    >
      <div
        className="a1j-region__art"
        aria-hidden="true"
        style={{ backgroundImage: `url(${region.background})` }}
      />
      <div className="a1j-region__shade" aria-hidden="true" />

      {index > 0 && (
        <header className="a1j-region__header">
          <span className="a1j-region__number">{String(index + 1).padStart(2, '0')}</span>
          <span className="a1j-region__copy">
            <small>{region.eyebrow}</small>
            <strong>{region.title}</strong>
            <em>{region.description}</em>
          </span>
          <b>{region.hechas}/{region.units.length}</b>
        </header>
      )}

      <div className="a1j-path" style={{ height: alto }}>
        <svg viewBox={`0 0 88 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="a1j-path__base" d={path} />
          <path
            className="a1j-path__progress"
            d={path}
            pathLength="100"
            strokeDasharray={`${progreso} 100`}
          />
        </svg>

        {region.family === 'glass' && (
          <span className="a1j-blue-glass" aria-hidden="true">
            <img src={`${ASSET}/blue-glass-sphere-lummi.webp`} alt="" />
          </span>
        )}

        {region.units.map((unit, unitIndex) => {
          const estado = estadoDe(unit, actualId);
          const coach = estado === 'hecha' && tieneCoach(unit);
          const estilo = { '--a1j-shift': `${unitIndex % 4 === 1 ? 10 : unitIndex % 4 === 3 ? -10 : 0}px` } as CSSProperties;

          return (
            <div className="a1j-stop" key={unit.id} data-estado={estado} style={estilo}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.985 }}
                className="a1j-lesson"
                onClick={() => onUnidad(unit)}
                aria-label={`${unit.title_es}. ${estado === 'bloqueada' ? 'Bloqueada hasta terminar la anterior.' : unit.subtitle_es}`}
              >
                <span className="a1j-node" data-estado={estado}>
                  <img src={arteDe(unit, unitIndex)} alt="" />
                  {estado === 'hecha' && (
                    <span className="a1j-node__check" aria-hidden="true">
                      <img src={`${ASSET}/tick-3dicons.png`} alt="" />
                    </span>
                  )}
                </span>

                <span className="a1j-label">
                  <strong>{unit.title_es}</strong>
                  <small>{unit.subtitle_es}</small>
                </span>

                <span className="a1j-state">
                  {estado === 'actual' ? (
                    <><em>Actual</em><ChevronDown size={16} strokeWidth={2.5} /></>
                  ) : estado === 'bloqueada' ? (
                    <span className="a1j-lock" aria-hidden="true">
                      <img src={`${ASSET}/lock-3dicons.png`} alt="" />
                    </span>
                  ) : null}
                </span>
              </motion.button>

              {coach && (
                <button
                  type="button"
                  className="a1j-coach"
                  onClick={() => onCoach(unit)}
                  aria-label={`Practicar una conversación de ${unit.title_es}`}
                >
                  <MessageCircle size={14} strokeWidth={2.3} />
                  Hablarlo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MapaExperiencia({
  onUnidad,
  onCoach,
  onRepaso,
  onSeguir,
  onGuardadas,
  onPanico,
}: MapaExperienciaProps) {
  const unidades = useA1((state) => state.unidades);
  const progreso = useA1((state) => state.progreso);
  const srs = useA1((state) => state.srs);
  const nGuardadas = useA1((state) => state.guardadas.length);
  const setView = useApp((state) => state.setView);
  const [regionActiva, setRegionActiva] = useState(0);
  const scroller = useRef<HTMLDivElement | null>(null);
  const secciones = useRef<Array<HTMLElement | null>>([]);
  const yaUbico = useRef(false);

  const retomar = useMemo(() => puntoDeRetomar(), [progreso, unidades]);

  const actualId = useMemo(() => {
    if (retomar?.unit.id) return retomar.unit.id;
    return unidades.find((unit) => estaDesbloqueada(unit.id) && !escenasHechas(unit))?.id ?? null;
  }, [retomar, unidades, progreso, srs]);

  const regiones = useMemo<RegionVisual[]>(() => {
    return REGION_CONFIGS.map((config) => {
      const units = unidades.filter((unit) => config.tramos.includes(unit.tramo));
      return { ...config, units, hechas: units.filter(escenasHechas).length };
    }).filter((region) => region.units.length > 0);
  }, [unidades, progreso, srs]);

  const total = regiones.reduce((sum, region) => sum + region.units.length, 0);
  const hechas = regiones.reduce((sum, region) => sum + region.hechas, 0);
  const pct = total ? Math.round((hechas / total) * 100) : 0;
  const activa = regiones[regionActiva] ?? regiones[0];

  function irARegion(index: number) {
    const container = scroller.current;
    const section = secciones.current[index];
    if (!container || !section) return;
    const offset = section.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
  }

  function detectarRegion() {
    const container = scroller.current;
    if (!container) return;
    const top = container.getBoundingClientRect().top + 96;
    let siguiente = 0;
    secciones.current.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= top) siguiente = index;
    });
    setRegionActiva(siguiente);
  }

  useLayoutEffect(() => {
    if (yaUbico.current || !actualId || !regiones.length) return;
    const index = regiones.findIndex((region) => region.units.some((unit) => unit.id === actualId));
    if (index < 1) return;
    yaUbico.current = true;
    setRegionActiva(index);
    requestAnimationFrame(() => irARegion(index));
  }, [actualId, regiones]);

  function abrirUnidad(unit: A1UnitRuta) {
    useA1.getState().verTramo(unit.tramo);
    onUnidad(unit.id);
  }

  if (!activa) return null;

  return (
    <div className="a1j-shell" data-a1-visual-map>
      <header className="a1j-header">
        <div className="a1j-title-row">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setView('home')}
            aria-label="Volver al inicio"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </motion.button>
          <h1>A1 · {activa.title}</h1>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => irARegion(Math.min(regionActiva + 1, regiones.length - 1))}
            aria-label="Ir al siguiente mapa"
            disabled={regionActiva === regiones.length - 1}
          >
            <ChevronDown size={18} strokeWidth={2.2} />
          </motion.button>
        </div>
        <div className="a1j-progress-meta">
          <span>Progreso de la ruta</span>
          <strong>{hechas}/{total}</strong>
        </div>
        <div className="a1j-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechas}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </header>

      {retomar && (
        <button className="a1j-resume" type="button" onClick={onSeguir}>
          <span><small>SIGUE DONDE IBAS</small><strong>{retomar.unit.title_es}</strong></span>
          <ChevronDown size={17} strokeWidth={2.4} />
        </button>
      )}

      <div ref={scroller} className="a1j-scroll" onScroll={detectarRegion}>
        {regiones.map((region, index) => (
          <Region
            key={region.key}
            region={region}
            index={index}
            actualId={actualId}
            onUnidad={abrirUnidad}
            onCoach={(unit) => onCoach(unit.id)}
            onRef={(element) => {
              secciones.current[index] = element;
            }}
          />
        ))}

        <footer className="a1j-tools">
          <button type="button" onClick={onRepaso}><RotateCcw size={16} /><span>Repasar</span></button>
          <button type="button" onClick={onGuardadas}><Star size={16} /><span>Mis frases{nGuardadas ? ` · ${nGuardadas}` : ''}</span></button>
          <button type="button" onClick={onPanico}><LifeBuoy size={16} /><span>Salvavidas</span></button>
        </footer>
      </div>
    </div>
  );
}
