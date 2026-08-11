import { useEffect, useLayoutEffect, useState, type ComponentType } from 'react';

import { TintaDefs } from '@/components/rodeo/tinta/icono-tinta';
import type { JobPack, PasoVozProps } from '@/content/a1/tipos';
import type { A1SceneRuta, A1UnitRuta } from '@/content/a1/tipos-ruta';
import { pedirPermisoMic } from '@/lib/permisos';
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
import { useA1Leccion } from '@/stores/a1-leccion';
import { useApp } from '@/stores/app';
import { toast } from '@/stores/toast';

import { Coach } from './coach';
import { abrirCoach } from './coach-turno';
import { HojaDetalle, HojaGuardadas, HojaPanico } from './hojas';
import { Mapa } from './mapa';
import { MapaExperiencia } from './mapa-experiencia';
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

/* A1UnitRuta y no A1Unit: con el catálogo por tramos, `nodeKind`, `tramo` y
   `coach` viajan en las unidades y la sesión los necesita para elegir su loop.
   Tipar esto como A1Unit los borraba antes de que llegaran a la vista. */
type Pantalla =
  | { tipo: 'mapa' }
  | { tipo: 'portada'; unit: A1UnitRuta; scene: A1SceneRuta }
  | { tipo: 'sesion'; arranque: Arranque }
  | { tipo: 'tarea'; unit: A1UnitRuta }
  /** La conversación con el personaje de la parada. Se llega solo tocándola. */
  | { tipo: 'coach'; unit: A1UnitRuta };

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
  const nivel = useApp((s) => s.nivel);

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

  /* ── La señal de "estoy dentro de la lección" (stores/a1-leccion.ts) ──
     Todo lo que no es el mapa es lección: portada, sesión, misión y la charla de
     la parada. En el mapa la fila superior se queda, que ahí el menú es el
     centro de navegación del módulo.

     useLayoutEffect y no useEffect por lo de siempre en este archivo: con
     useEffect, React pinta la portada CON la fila superior y recién después la
     esconde — un cuadro de fila visible y un salto de 74px hacia arriba, justo
     en la transición que se quería limpia. */
  const enLeccion = pantalla.tipo !== 'mapa';
  useLayoutEffect(() => {
    useA1Leccion.getState().setEnLeccion(enLeccion);

    /* Y de paso se BAJA EL TOAST. El toaster vive en top:14 y su comentario
       justifica esa posición diciendo que lo único que puede tapar ahí arriba es
       la fila Menu + toggle: "navegación, nunca el único camino para avanzar".
       Esa premisa se acaba de romper — al esconder la fila, esos 14px los ocupa
       la cabecera del loop (el ←, los puntos, el bombillo y Alfred), y un aviso
       encima de eso sí tapa cosas que hacen falta.
       Se publica el borde de abajo de la cabecera como variable CSS y el toaster
       la lee, que es el mismo mecanismo con el que TALK coloca su tip
       (--rd-tip-arriba). Se limpia al salir para que el resto de la app
       recupere el top de siempre. */
    const raiz = document.documentElement;
    if (enLeccion) raiz.style.setProperty('--rd-toast-arriba', 'calc(78px + env(safe-area-inset-top))');
    else raiz.style.removeProperty('--rd-toast-arriba');
    /* Las llaves NO son estilo: removeProperty devuelve el valor viejo (string)
       y el limpiador de un efecto tiene que devolver void. Sin ellas, tsc falla. */
    return () => {
      raiz.style.removeProperty('--rd-toast-arriba');
    };
  }, [enLeccion]);
  /* El apagado al desmontar va SEPARADO y con deps vacías: si el usuario se va
     al Home desde dentro de una sesión (el menú no está, pero el hash o un
     setView sí pueden), esta vista muere con la señal encendida y la fila
     superior no volvería nunca más en toda la app. */
  useLayoutEffect(() => () => useA1Leccion.getState().setEnLeccion(false), []);

  /* Permiso de micrófono al ENTRAR a la RUTA: el paso de producción hablada
     (A1.3) dicta, y pedirlo recién al tocar el mic dejaba al usuario con un
     "no me diste permiso" sin que el navegador hubiera preguntado nunca.
     Fire-and-forget (ver lib/permisos.ts): no bloquea el render del mapa.

     MUDO (`avisar: false`), y esta vista es la razón de que ese modo exista.
     Desde que el nivel A1 aterriza acá (F0), esta es la PRIMERA pantalla de la
     app para un principiante: si el mic está bloqueado, el toast de 6s salía
     encima del CTA "Dale, cuéntame" de Alfred y lo primero que leía el usuario
     era un error de algo que nunca pidió. El aviso no se pierde — cuando toque
     el mic de verdad, use-grabadora pinta su propio mensaje al lado del botón
     ("No me diste permiso del micrófono. Puedes seguir sin hablar."), que
     además está donde el usuario está mirando. CHARLA sigue avisando con toast
     como siempre: ahí el usuario entró explícitamente a hablar. */
  useEffect(() => {
    void pedirPermisoMic({ avisar: false });
  }, []);

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
      toast('Esa se abre cuando termines la de antes. Sin prisa.');
      return;
    }
    if (escenasHechas(u) && u.task && !tareaHecha(u.task.id)) {
      setPantalla({ tipo: 'tarea', unit: u });
      return;
    }
    const scene = proximaEscena(u);
    if (!scene || !scene.chunks.length) {
      toast('Esta escena todavía no tiene frases.');
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
      toast('Hoy no tienes nada pendiente. Vas al día.');
      return;
    }
    setPantalla({ tipo: 'sesion', arranque: { modo: 'repaso', cola } });
  }

  /* ── Abrir la conversación de una parada ──
     No hay ruta de rescate ni "seguí donde ibas" acá a propósito: una charla a
     medias no se retoma, se vuelve a empezar. Reanudar una conversación de tres
     días atrás con el mesero esperando tu respuesta es más raro que rehacerla,
     y rehacerla cuesta cuatro turnos. */
  function abrirConversacion(unitId: string) {
    const u = unidades.find((x) => x.id === unitId);
    if (!u || !u.coach) return;
    if (!abrirCoach(u)) return;
    setPantalla({ tipo: 'coach', unit: u });
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
    /* La COLUMNA de 640 px sube a la RAÍZ del módulo. El Mapa ya la ponía en
       cada uno de sus hijos, pero la portada, la sesión, la misión y el
       onboarding no la tenían: a 1280 px se estiraban de borde a borde
       mientras el resto de la app (SLANG, SUBE, DNA, CHARLA) vive en 640.
       Puesta acá vale para las cinco pantallas del módulo, y las COLUMNA
       internas del Mapa quedan idempotentes (640 dentro de 640). */
    <div className="mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col">
      {/* Las tres manchas y el filtro de pluma de los iconos de tinta, una sola
          vez para todo el módulo. Va acá y no en App.tsx porque A1 es un chunk
          lazy: montarlo en la raíz de la app le cobraría el peso al arranque de
          quien nunca abre la ruta. Es un <svg> de 0×0 posicionado absoluto —
          no ocupa lugar en el flex. */}
      <TintaDefs />

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
      ) : pantalla.tipo === 'coach' ? (
        <Coach unit={pantalla.unit} onSalir={alMapa} onPanico={() => setPanico(true)} />
      ) : nivel === 'A1' ? (
        <MapaExperiencia
          onUnidad={abrirUnidad}
          onCoach={abrirConversacion}
          onRepaso={abrirRepaso}
          onSeguir={seguir}
          onGuardadas={() => setGuardadas(true)}
          onPanico={() => setPanico(true)}
        />
      ) : (
        <Mapa
          pack={pack}
          onUnidad={abrirUnidad}
          onCoach={abrirConversacion}
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
