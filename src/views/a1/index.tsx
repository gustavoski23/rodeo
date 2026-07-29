import { useLayoutEffect, useState, type ComponentType } from 'react';

import type { A1Scene, A1Unit, JobPack, PasoVozProps } from '@/content/a1/tipos';
import {
  construirColaRepaso,
  escenasHechas,
  estaDesbloqueada,
  proximaEscena,
  puntoDeRetomar,
  tareaHecha,
  unidadVirgen,
  useA1,
} from '@/stores/a1';
import { toast } from '@/stores/toast';

import { HojaDetalle, HojaGuardadas, HojaPanico } from './hojas';
import { Mapa } from './mapa';
import { Onboarding } from './onboarding';
import { Portada } from './portada';
import { Sesion, type Arranque } from './sesion';
import { Tarea } from './tarea';

/* OFICINA (A1) — la raíz del módulo. Port del enrutado que en el legacy hacían
   renderA1Home / a1AbrirUnidad / openA1Escena / openA1Repaso / openA1Task
   (public/js/a1-office.js), sin ocultar y mostrar divs a mano: acá el estado
   dice qué pantalla existe y React monta esa.

   DOS PUNTOS DE EXTENSIÓN, para que los otros dos workstreams entren sin tocar
   este archivo (los cablea el integrador desde App):

   · `packsExtra` — packs por trabajo (A1.2). El pack que coincide con
     rodeo_a1_job aporta unidades EXTRA que se muestran después del tronco
     común. El tronco es de todos y no se reordena; el SRS no se entera de
     nada, porque su llave es el id del chunk. Este módulo LEE y GUARDA
     rodeo_a1_job, pero el selector de trabajo no vive acá.

   · `PasoVoz` — producción hablada (A1.3). Si llega, el loop pasa de 6 a 7
     pasos (se cuela después de producir); si no llega, queda exactamente el
     loop del legacy. Nadie tiene que acordarse de apagar nada. */

type Pantalla =
  | { tipo: 'mapa' }
  | { tipo: 'portada'; unit: A1Unit; scene: A1Scene }
  | { tipo: 'sesion'; arranque: Arranque }
  | { tipo: 'tarea'; unit: A1Unit };

export default function A1View({
  packsExtra,
  PasoVoz,
}: {
  packsExtra?: JobPack[];
  PasoVoz?: ComponentType<PasoVozProps>;
}) {
  const onboarded = useA1((s) => s.onboarded);
  const job = useA1((s) => s.job);
  const unidades = useA1((s) => s.unidades);

  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'mapa' });
  const [panico, setPanico] = useState(false);
  const [guardadas, setGuardadas] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);

  const pack = packsExtra?.find((p) => p.id === job) ?? null;

  /* useLayoutEffect y no useEffect: el catálogo tiene que estar completo ANTES
     del primer pintado, o el mapa parpadea sin las unidades del trabajo. */
  useLayoutEffect(() => {
    useA1.getState().setPackUnits(pack?.units ?? []);
  }, [pack]);

  /* ── Abrir una unidad (a1AbrirUnidad, L487) ──
     Reanuda por la primera escena sin terminar. Si ya terminó todas pero le
     quedó la misión pendiente, va derecho a la misión: es la ruta de rescate de
     quien salió antes de cerrarla.

     Lo único que se le agrega al viejo: si la unidad está sin estrenar, primero
     pasa por la PORTADA, donde Alfred la presenta con su companionSetup_es.
     Entrar a una situación nueva sin que nadie te diga de qué va era lo que
     hacía sentir el módulo como una lista de ejercicios. */
  function abrirUnidad(unitId: string) {
    const u = unidades.find((x) => x.id === unitId);
    if (!u || !u.scenes.length) return;
    if (!estaDesbloqueada(u.id)) {
      toast('Esa se abre cuando termines la de antes, parce. Sin afán.');
      return;
    }
    if (escenasHechas(u) && u.task && !tareaHecha(u.task.id)) {
      setPantalla({ tipo: 'tarea', unit: u });
      return;
    }
    const scene = proximaEscena(u);
    if (!scene || !scene.chunks.length) {
      toast('Esta escena todavía no tiene frases, parce.');
      return;
    }
    if (unidadVirgen(u)) {
      setPantalla({ tipo: 'portada', unit: u, scene });
      return;
    }
    setPantalla({ tipo: 'sesion', arranque: { modo: 'escena', unit: u, scene, desde: 0 } });
  }

  /* ── Repaso de pasillo (openA1Repaso, L686) ──
     Nunca arranca una sesión vacía: sin vencidos ni frases nuevas, avisa y se
     queda donde está. Un callejón sin salida es peor que no tener botón. */
  function abrirRepaso() {
    const { cola } = construirColaRepaso();
    if (!cola.length) {
      toast('Hoy no tenés nada pendiente, parce. Vas al día.');
      return;
    }
    setPantalla({ tipo: 'sesion', arranque: { modo: 'repaso', cola } });
  }

  function seguir() {
    const r = puntoDeRetomar();
    if (!r) return;
    setPantalla({
      tipo: 'sesion',
      arranque: { modo: 'escena', unit: r.unit, scene: r.scene, desde: r.chunkIdx },
    });
  }

  const alMapa = () => setPantalla({ tipo: 'mapa' });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!onboarded ? (
        <Onboarding onListo={() => useA1.getState().marcarOnboarded()} />
      ) : pantalla.tipo === 'sesion' ? (
        <Sesion
          /* La clave remonta el loop al cambiar de escena o de repaso: el
             estado de un recorrido no debe sobrevivir al siguiente. */
          key={pantalla.arranque.modo === 'escena' ? pantalla.arranque.scene.id : 'repaso'}
          arranque={pantalla.arranque}
          PasoVoz={PasoVoz}
          onSalir={alMapa}
          onPanico={() => setPanico(true)}
          onTarea={(u) => setPantalla({ tipo: 'tarea', unit: u })}
        />
      ) : pantalla.tipo === 'portada' ? (
        <Portada
          unit={pantalla.unit}
          scene={pantalla.scene}
          onArrancar={() =>
            setPantalla({
              tipo: 'sesion',
              arranque: { modo: 'escena', unit: pantalla.unit, scene: pantalla.scene, desde: 0 },
            })
          }
          onSalir={alMapa}
          onPanico={() => setPanico(true)}
        />
      ) : pantalla.tipo === 'tarea' ? (
        <Tarea unit={pantalla.unit} onSalir={alMapa} onPanico={() => setPanico(true)} />
      ) : (
        <Mapa
          pack={pack}
          onUnidad={abrirUnidad}
          onRepaso={abrirRepaso}
          onSeguir={seguir}
          onGuardadas={() => setGuardadas(true)}
          onPanico={() => setPanico(true)}
        />
      )}

      <HojaPanico abierta={panico} onClose={() => setPanico(false)} />
      <HojaGuardadas
        abierta={guardadas}
        onClose={() => setGuardadas(false)}
        onDetalle={(id) => {
          // Una hoja a la vez: la de detalle reemplaza a la lista, como en el
          // viejo (que reescribía el contenido del mismo sheet).
          setGuardadas(false);
          setDetalle(id);
        }}
      />
      <HojaDetalle id={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
