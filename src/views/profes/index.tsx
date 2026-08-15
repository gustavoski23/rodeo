import { motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, Check, Mail } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

import './profes.css';

/* Vista PROFES — la cara institucional: profesores e instituciones que dan
   clase por la app, ponen su tarifa y cobran con los rieles de Pangea Wallet.

   La regla de esta vista es la HONESTIDAD DE ETIQUETA: todo lo que ya existe
   se afirma (la wallet está en producción mainnet y el cobro on-chain de las
   suscripciones de esta app es código real en los dos repos); todo lo que es
   visión lleva "EN CAMINO" y el panel del profe lleva "DEMO" a la vista. Un
   inversionista que detecta una promesa disfrazada de feature descarta la app
   entera — la etiqueta es la credibilidad.

   Los números de comisiones NO son inventados: 33%→18% es el modelo publicado
   por Preply (help.preply.com, art. 4171383, con su propio ejemplo de $10 →
   $6.70) y el 5.9% es el promedio del Banco Mundial para enviar $200 a la
   región (remittanceprices.worldbank.org, 2024). Si alguno cambia, se
   actualiza aquí y en la nota al pie — nunca dejar el número sin su fuente. */

const COLUMNA = 'mx-auto w-full max-w-[640px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const PANGEA_URL = 'https://pangea-wallet.vercel.app';
const CORREO = 'pangealabssas@gmail.com';

export default function ProfesView() {
  const setView = useApp((s) => s.setView);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección (patrón canónico de PODCAST/DNA) ─────────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('home')}
          aria-label="Volver al inicio"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Profes · enseña y cobra sin fronteras
        </span>
      </div>

      {/* ── El scroller único ─────────────────────────────────────────────── */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 py-6 sm:px-6', SIN_BARRA)}>
          {/* 1 · Hero */}
          <header className="profes-bloque">
            <h1
              className="font-display text-[clamp(2rem,9vw,2.9rem)] leading-[0.95] font-extrabold tracking-[-0.035em]"
              style={{ color: 'var(--text-primary)' }}
            >
              Enseña. Cobra.
              <br />
              <span style={{ color: 'var(--accent)' }}>Retira donde estés.</span>
            </h1>
            <p className="mt-3 max-w-[46ch] text-[0.92rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
              La otra cara de Hablarte: profesores e instituciones dan su clase aquí, ponen su tarifa y reciben su
              pago en USDC — sin perder un tercio del trabajo en comisiones y sin depender de un banco que no
              existe en su país.
            </p>
          </header>

          {/* 2 · La cuenta clara — comparación de comisiones */}
          <section className="profes-bloque" aria-label="Comparación de comisiones">
            <div className="profes-sticker" style={{ background: 'var(--card-peach)', ['--giro' as string]: '-1.2deg' }}>
              <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
                La cuenta clara · una clase de $10
              </p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div>
                  <p className="font-mono text-[0.62rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
                    Al tutor nuevo de Preply le llegan
                  </p>
                  <p className="profes-monto mt-1" style={{ color: 'var(--card-ink)', opacity: 0.55 }}>
                    $6.70
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
                    Aquí le llegan
                  </p>
                  <p className="profes-monto mt-1" style={{ color: 'var(--card-ink)' }}>
                    $9.90
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[0.8rem] leading-[1.5]" style={{ color: 'var(--card-ink-soft)' }}>
                Preply publica su comisión: 33% para quien empieza, 18% después de 400 horas — y la clase de
                prueba se la queda completa la plataforma. Aquí el pago viaja en USDC y el riel cuesta alrededor
                del 1%. El resto es tuyo.
              </p>
            </div>
          </section>

          {/* 3 · Así cobras — flujo editorial numerado */}
          <section className="profes-bloque" aria-label="Cómo cobras">
            <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
              Así cobras
            </h2>
            <div className="mt-4">
              <Paso n="01" titulo="Pon tu tarifa">
                Tu perfil, tu precio por hora. Sin escalones de comisión que premian regalar horas.
              </Paso>
              <Paso n="02" titulo="Tu alumno paga con un QR">
                En USDC desde cualquier wallet, en segundos. El pago con tarjeta está en camino.
              </Paso>
              <Paso n="03" titulo="La cadena confirma el pago">
                Sin intermediarios: la misma tubería construida para cobrar las suscripciones de esta app,
                verificada transacción por transacción en la red.
              </Paso>
              <Paso n="04" titulo="Retiras al instante">
                A tu wallet Pangea, creada con tu cuenta de Google — sin frase semilla, sin saber qué es el gas.
                El retiro a tu banco (ACH en EE.UU., SEPA en Europa) está en camino.
              </Paso>
            </div>
          </section>

          {/* 4 · Panel del profe — demo declarada */}
          <section className="profes-bloque" aria-label="Panel del profesor (demostración)">
            <div className="profes-sticker" style={{ background: 'var(--card-paper)', ['--giro' as string]: '0.8deg' }}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
                  Panel del profe
                </p>
                <span
                  className="rounded-full border px-2 py-0.5 font-mono text-[0.56rem] font-bold tracking-[0.14em] uppercase"
                  style={{ borderColor: 'var(--card-ink-soft)', color: 'var(--card-ink-soft)' }}
                >
                  Demo
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div>
                  <p className="font-mono text-[0.62rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
                    Tu semana
                  </p>
                  <p className="font-display mt-1 text-[1.5rem] leading-none font-extrabold tracking-[-0.02em]" style={{ color: 'var(--card-ink)' }}>
                    6 clases · 5 alumnos
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
                    Saldo
                  </p>
                  <p className="font-display mt-1 text-[1.5rem] leading-none font-extrabold tracking-[-0.02em]" style={{ color: 'var(--card-ink)' }}>
                    84.50 USDC
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
                    Tarifa
                  </p>
                  <p className="font-display mt-1 text-[1.5rem] leading-none font-extrabold tracking-[-0.02em]" style={{ color: 'var(--card-ink)' }}>
                    $12/hora
                  </p>
                </div>
              </div>

              {/* El botón del panel NO finge: abre la wallet real, que está en
                  producción. Un mock deshabilitado diría menos que el producto
                  vivo a un toque de distancia. */}
              <a
                href={PANGEA_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[0.88rem] font-bold"
                style={{ background: 'var(--card-ink)', color: 'var(--card-paper)' }}
              >
                Abrir mi wallet Pangea
                <ArrowUpRight size={15} strokeWidth={2.4} />
              </a>
              <p className="mt-3 text-[0.72rem] leading-[1.45]" style={{ color: 'var(--card-ink-soft)' }}>
                Los montos de este panel son de demostración. La wallet es real: está en producción, en mainnet.
              </p>
            </div>
          </section>

          {/* 5 · Qué hay hoy / qué está en camino */}
          <section className="profes-bloque" aria-label="Estado real del sistema">
            <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
              Qué hay hoy — y qué está en camino
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <Hecho hoy>Wallet Pangea en producción, en mainnet, moviendo dinero real.</Hecho>
              <Hecho hoy>Cobro en USDC verificado en la cadena de punta a punta — la tubería de la suscripción de esta app, probada con una transacción real.</Hecho>
              <Hecho hoy>Envíos gasless: quien recibe no necesita tener SOL ni saber qué es el gas.</Hecho>
              <Hecho hoy>Wallet con tu cuenta de Google, sin frase semilla.</Hecho>
              <Hecho>Retiro a tu moneda local.</Hecho>
              <Hecho>Cuentas bancarias ACH (EE.UU.) y SEPA (Europa) para recibir como local.</Hecho>
              <Hecho>Pago con tarjeta para tus alumnos.</Hecho>
              <Hecho>Pagos en lote para academias con varios profes.</Hecho>
            </ul>
          </section>

          {/* 6 · El contexto — tres números, sin adornos */}
          <section className="profes-bloque" aria-label="Números del mercado">
            <div
              className="rounded-[18px] border px-5 py-4"
              style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}
            >
              <p className="text-[0.88rem] leading-[1.65]" style={{ color: 'var(--text-secondary)' }}>
                Hablar inglés paga entre <Cifra>30% y 50% más</Cifra> en Latinoamérica. Las tutorías online mueven{' '}
                <Cifra>$12 mil millones</Cifra> este año. Y enviar $200 a la región todavía cuesta{' '}
                <Cifra>5.9% en promedio</Cifra> — en USDC cuesta alrededor del 1%.
              </p>
            </div>
          </section>

          {/* 7 · CTA */}
          <section className="profes-bloque pb-2" aria-label="Contacto">
            <h2
              className="font-display text-[clamp(1.5rem,6.5vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]"
              style={{ color: 'var(--text-primary)' }}
            >
              ¿Enseñas inglés?
            </h2>
            <p className="mt-2 max-w-[44ch] text-[0.9rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
              El piloto abre con la primera cohorte de profes: tarifa propia, alumnos de toda la región y el pago
              directo a tu wallet.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <motion.a
                whileTap={{ scale: 0.96 }}
                href={`mailto:${CORREO}?subject=Quiero%20ense%C3%B1ar%20en%20Hablarte`}
                className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-[0.92rem] font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                <Mail size={16} strokeWidth={2.2} />
                Escríbenos
              </motion.a>
              <motion.a
                whileTap={{ scale: 0.96 }}
                href={PANGEA_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border px-6 text-[0.92rem] font-semibold"
                style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-primary)' }}
              >
                Conoce Pangea Wallet
                <ArrowUpRight size={15} strokeWidth={2.2} />
              </motion.a>
            </div>
            <p className="mt-5 text-[0.7rem] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
              Las comisiones de otras plataformas son las publicadas por ellas (Preply: modelo 33%→18%, con su
              propio ejemplo de $10 → $6.70). El 5.9% es el promedio del Banco Mundial para enviar $200 a la
              región (2024).
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}

/* Un paso del flujo de cobro: número mono durazno + título display + nota.
   Lista editorial con divisores — deliberadamente NO un grid de tarjetas con
   ícono, que es exactamente el patrón que el brief prohíbe. */
function Paso({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="profes-paso">
      <span className="font-mono pt-0.5 text-[0.8rem] font-bold" style={{ color: 'var(--accent)' }}>
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-display text-[1.05rem] leading-[1.2] font-bold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
          {titulo}
        </p>
        <p className="mt-1 text-[0.85rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </p>
      </div>
    </div>
  );
}

/* Una línea del estado real: check durazno si ya existe, "EN CAMINO" mono si
   es visión. La etiqueta es la diferencia entre un pitch y una mentira. */
function Hecho({ hoy = false, children }: { hoy?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      {hoy ? (
        <span
          className="mt-0.5 inline-flex size-4.5 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          <Check size={11} strokeWidth={3} />
        </span>
      ) : (
        <span
          className="mt-[3px] shrink-0 rounded-full border px-1.5 py-px font-mono text-[0.5rem] font-bold tracking-[0.12em] uppercase"
          style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-muted)' }}
        >
          En camino
        </span>
      )}
      <span className="text-[0.86rem] leading-[1.5]" style={{ color: hoy ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {children}
      </span>
    </li>
  );
}

/* Cifra resaltada dentro de la prosa del contexto. */
function Cifra({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-bold" style={{ color: 'var(--text-primary)' }}>
      {children}
    </strong>
  );
}
