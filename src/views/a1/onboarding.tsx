import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { A1_CURSO } from "@/content/a1/core";
import type { A1Cognate } from "@/content/a1/tipos";
import { store } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/app";

import { AlfredAvatar, Burbuja, ENTRADA, Puntos } from "./alfred";

/* ONBOARDING — DOS beats: Alfred saluda, el usuario escoge las palabras que ya
   sabe, y de ahí al mapa. Una sola vez en la vida (gate rodeo_a1_onboarded).

   Eran CUATRO (port de renderOnboarding, public/js/a1-office.js:199-253):
   presentación · baja el miedo · cognados · encuadre. Se recortó a dos por
   pedido de Gus, y el criterio de qué se iba fue: los beats 2 y 4 eran Alfred
   HABLANDO —el usuario solo pulsaba "Seguir"—, mientras que el de las palabras
   es el único donde hace algo. Tres pantallas de texto antes de que se vea el
   mapa es exactamente lo que hace que un principiante cierre la app.

   Las cuatro líneas siguen en `companion.intro_es` (content/a1/core.ts) y no
   se borran: son la voz escrita del personaje y las va a querer la charla del
   coach. Acá se usa solo la primera, que es la que se presenta.

   El beat de las palabras es el que hace el trabajo: son 16 que el usuario YA
   sabe sin saberlo. Descubrir que "information" es "información" cambia la
   creencia "no sé nada de inglés" antes de la primera lección — y esa creencia
   es el verdadero obstáculo, no el vocabulario.

   ESCOGER Y DESTAPAR SON EL MISMO TOQUE, a propósito. Antes la tarjeta solo se
   volteaba (descubrir); ahora además queda marcada (escoger). Separarlo en dos
   gestos —voltear para ver, y un check aparte para marcar— obligaría a tocar 32
   veces y convertiría el momento bonito en un formulario. Un toque: la ves y la
   reclamas. */

const TOTAL = 2;
const SIN_BARRA = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function Cognado({
  c,
  sabida,
  onToggle,
}: {
  c: A1Cognate;
  sabida: boolean;
  onToggle: () => void;
}) {
  const trampa = !!c.falseHook_es;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={sabida}
      aria-label={`${c.en} — toca si ya la entiendes`}
      className="relative cursor-pointer"
      style={{ perspective: 700 }}
    >
      {/* Alto fijo y las dos caras en absoluto: si la cara de atrás sale del
          flujo y la de adelante no, la tarjeta cambia de tamaño al voltear y
          la grilla entera baila.

          66px y no 78: con tres columnas (ver la grilla) son 6 filas en vez de
          8, y así el botón de salida entra en la primera pantalla de un 390.
          El alto lo permite porque el false friend ya no vive acá dentro. */}
      <motion.span
        animate={{ rotateY: sabida ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative block h-[66px] w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Cara EN */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] border px-2 py-3 text-center"
          style={{
            backfaceVisibility: "hidden",
            background: "var(--bg-surface)",
            borderColor: trampa
              ? "color-mix(in oklch, var(--warn) 45%, transparent)"
              : "var(--borde-sutil)",
            color: "var(--text-primary)",
          }}
        >
          <span className="font-display text-[0.95rem] leading-tight font-bold tracking-[-0.02em] break-words">
            {c.en}
          </span>
          {trampa && (
            <TriangleAlert
              className="size-3.5"
              style={{ color: "var(--warn)" }}
              aria-hidden="true"
            />
          )}
        </span>

        {/* Cara ES */}
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-3 text-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "var(--card-green)",
            color: "var(--card-ink)",
            boxShadow: "var(--sticker-shadow)",
          }}
        >
          {/* El check y no solo el verde: volteada y marcada son ahora el mismo
              estado, y sin una marca explícita la cara ES se lee como "la di
              vuelta" y no como "dije que la sé". */}
          <Check
            className="absolute top-1.5 right-1.5 size-3.5"
            strokeWidth={3}
            style={{ color: "var(--card-ink-soft)" }}
            aria-hidden="true"
          />
          {/* El falseHook NO se pinta acá. Medido en un 390: son ~110
              caracteres a 0.6rem (≈9.6px) dentro de una tarjeta de 96px de
              ancho — cinco líneas ilegibles que además desbordaban la caja.
              Vive abajo, al pie de la grilla, donde tiene el ancho entero y el
              tamaño de lectura del resto de la app. */}
          <span className="text-[0.9rem] leading-tight font-semibold break-words">
            {c.es}
          </span>
        </span>
      </motion.span>
    </button>
  );
}

export function Onboarding({ onListo }: { onListo: () => void }) {
  const [beat, setBeat] = useState(0);
  /* Set y no array: el gesto es alternar una palabra suelta, y `has` evita el
     indexOf por tarjeta en cada repintado de la grilla de 16. */
  const [sabidas, setSabidas] = useState<Set<string>>(new Set());
  const setView = useApp((s) => s.setView);
  const intro = A1_CURSO.companion.intro_es;
  const ultimo = beat === TOTAL - 1;
  const etiqueta = beat === 0 ? "Dale, cuéntame" : "Ir al mapa";
  const n = sabidas.size;
  /** Las marcadas que son falso amigo: su aviso se pinta al pie de la grilla. */
  const trampas = A1_CURSO.cognates.filter(
    (c) => c.falseHook_es && sabidas.has(c.en),
  );

  function alternar(en: string) {
    setSabidas((prev) => {
      const next = new Set(prev);
      if (!next.delete(en)) next.add(en);
      return next;
    });
  }

  /* Lo que el usuario reclamó se GUARDA. Hacerlo escoger y tirar la respuesta
     sería pedirle trabajo para nada, y el primer nodo del mapa ("Las que ya
     sabes", 300 palabras) es justo quien tiene que saber por dónde arrancó.
     Clave rodeo_a1_* y `store` como todo el módulo, para que el sync de
     Supabase se la lleve sin tratamiento especial. */
  function terminar() {
    store.set("rodeo_a1_cognados", [...sabidas]);
    onListo();
  }

  /* SHELL CANÓNICO. Era la ÚNICA pantalla de la app sin ← y sin título mono:
     los beats se pintaban sueltos sobre el fondo del tema, así que el único
     modo de salir del onboarding era el menú, y a 1280 el texto se estiraba de
     borde a borde. Ahora lleva la misma barra que STORY / SLANG / SUBE / DNA /
     el Mapa —← redondo a home + rótulo mono en --accent— y el contenido vive
     dentro de la Card, que hace de scroller. El ← va a home como el de todas
     las vistas; no interrumpe nada, porque el gate rodeo_a1_onboarded solo se
     marca al pulsar el botón final. */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 pb-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView("home")}
          aria-label="Volver al inicio"
          className="rd-toque-44 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{
            borderColor: "var(--borde-sutil)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
          }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: "var(--accent)" }}
        >
          {/* RUTA y no "Oficina": la carta del carrusel dice RUTA y desde F0
              esta es la pantalla de bienvenida de un A1 — entrar por "RUTA" y
              aterrizar en "OFICINA" es sentir que te equivocaste de puerta. El
              nombre interno del módulo (vista 'a1', archivos, claves
              rodeo_a1_*, el port de a1-office.js) NO se toca: eso nombra de
              dónde salió el código, no lo que el usuario está haciendo.

              El rótulo cambia con el beat porque son dos momentos distintos y
              con solo dos pasos la fila de puntos sola no alcanza para que se
              note que avanzaste. */}
          {beat === 0
            ? "Ruta · te presento a Alfred"
            : "Ruta · las que ya sabes"}
        </span>
      </div>

      <Card className="relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm">
        {/* El scroller pasa a `absolute inset-0` dentro de un envoltorio
            relativo para que el desvanecido de abajo tenga contra qué anclarse
            sin depender de un `bottom` en píxeles calculado a ojo. */}
        <div className="relative min-h-0 flex-1">
          <div
            className={cn(
              /* pb-2 y no py-4: el respiro de abajo lo pone ahora la botonera,
               que dejó de estar acá dentro. */
              "absolute inset-0 flex flex-col gap-6 overflow-y-auto px-3.5 pt-4 pb-2 sm:px-5",
              SIN_BARRA,
            )}
          >
            <div className="shrink-0 pt-2">
              <Puntos activo={beat} total={TOTAL} />
            </div>

            {/* El retrato grande es SOLO del beat en que Alfred se presenta. En
              el de las palabras se va: son 66px de avatar + 24 de gap que
              empujaban la grilla —lo único que el usuario tiene que tocar—
              media pantalla hacia abajo, para repetir una cara que acaba de
              ver. Alfred no desaparece: sigue hablando por la burbuja. */}
            {beat === 0 && (
              <div className="flex shrink-0 justify-center">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                >
                  <AlfredAvatar size={66} />
                </motion.div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={beat}
                {...ENTRADA}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-1 flex-col gap-3"
              >
                {beat === 0 && <Burbuja>{intro[0]}</Burbuja>}

                {beat === 1 && (
                  <>
                    <Burbuja>
                      Toca las que ya entiendas. Sin pensarlo mucho, las que te
                      suenen.
                    </Burbuja>
                    {/* 96px y no 104: en un 390 el scroller mide 320 de ancho, y
                      con 104 el auto-fill daba DOS columnas (2·104+10=218, tres
                      pedían 342). Con 96 entran tres justas (3·96+2·10=308) y
                      las 16 palabras pasan de ocho filas a seis. */}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5">
                      {A1_CURSO.cognates.map((c) => (
                        <Cognado
                          key={c.en}
                          c={c}
                          sabida={sabidas.has(c.en)}
                          onToggle={() => alternar(c.en)}
                        />
                      ))}
                    </div>

                    {/* La advertencia del falso amigo, al ancho entero y solo
                      cuando el usuario reclamó esa palabra: antes vivía dentro
                      de la tarjeta a 9px. Aparece al marcarla, que es el
                      momento exacto en que decir "ojo con esta" significa
                      algo. */}
                    {trampas.length > 0 && (
                      <div
                        className="flex gap-2 rounded-[14px] border px-3 py-2.5"
                        style={{
                          borderColor:
                            "color-mix(in oklch, var(--warn) 45%, transparent)",
                          background:
                            "color-mix(in oklch, var(--warn) 10%, transparent)",
                        }}
                      >
                        <TriangleAlert
                          className="mt-0.5 size-4 shrink-0"
                          style={{ color: "var(--warn)" }}
                          aria-hidden="true"
                        />
                        <p
                          className="text-[0.8rem] leading-[1.4]"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {trampas.map((c) => (
                            <span key={c.en}>
                              <strong style={{ color: "var(--text-primary)" }}>
                                {c.en}
                              </strong>{" "}
                              — {c.falseHook_es}
                            </span>
                          ))}
                        </p>
                      </div>
                    )}
                    {/* El pie NO es un requisito disfrazado: con cero marcadas
                      invita, no regaña, y el botón sigue habilitado igual. Un
                      muro acá dejaría al usuario encerrado a un toque del mapa
                      por no haber jugado. */}
                    <p
                      className="text-[0.88rem] leading-[1.5]"
                      style={{ color: "var(--text-secondary)" }}
                      aria-live="polite"
                    >
                      {n === 0
                        ? "Tócalas, que la mayoría las entiendes sin traducir."
                        : `Ya te sabías ${n}. Y son solo las que caben en una pantalla.`}
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* El desvanecido de "hay más abajo", el mismo de ElegirTrabajo. Sin
              él la última tarjeta queda cortada a media altura contra el borde
              del scroller y se lee como un bug de layout, no como scroll. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-9"
            style={{
              background:
                "linear-gradient(to top, var(--bg-surface), transparent)",
            }}
          />
        </div>

        {/* LA BOTONERA VIVE FUERA DEL SCROLLER, y esto no es cosmético: dentro
            quedaba al final de una grilla de 16 tarjetas, o sea fuera de la
            parte visible de la Card. Medir su getBoundingClientRect().bottom
            contra innerHeight decía "entra" —812 de 844— y era mentira: la
            Card recorta con overflow-hidden, así que el rect existía donde no
            había pixeles. Se vio en la captura, no en el número. Con la navbar
            de teléfono ocupando el pie de la pantalla el margen es todavía
            menor. Acá afuera el botón está SIEMPRE a la vista. */}
        <div className="flex shrink-0 items-center gap-3 px-3.5 pt-1 pb-4 sm:px-5">
          {beat > 0 ? (
            <button
              type="button"
              onClick={() => setBeat((b) => b - 1)}
              className="min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-[0.85rem] font-semibold"
              style={{
                borderColor: "var(--borde-sutil)",
                color: "var(--text-secondary)",
              }}
            >
              Atrás
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => (ultimo ? terminar() : setBeat((b) => b + 1))}
            className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-[0.95rem] font-bold"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            {etiqueta}
            <ArrowRight
              className="size-4"
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </motion.button>
        </div>
      </Card>
    </div>
  );
}
