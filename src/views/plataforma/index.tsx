import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/stores/app';

import './plataforma.css';

/* Vista PLATAFORMA — el panel del profe completo, navegable, en DEMO.

   PROFES (la vista hermana) es la cara institucional: cuenta la propuesta.
   Esta vista es la propuesta por dentro: cómo se vería el día a día de un
   profesor que cobra por aquí — saldo, enlaces de cobro, retiros, agenda,
   alumnos, academia cripto, la línea de empresas y el plan de precios.

   Hereda la regla de PROFES al pie de la letra — HONESTIDAD DE ETIQUETA:
   · La vista entera lleva "DEMO" en la barra: los montos y alumnos son
     ficticios.
   · Cada capacidad lleva HOY (existe: la tubería USDC de esta app y la wallet
     Pangea en mainnet) o EN CAMINO (los rieles existen en el mercado, nuestra
     integración no). Prometer de más aquí cuesta la credibilidad entera.

   Los números de competidores NO son inventados y cada uno tiene fuente
   (verificados 19-08-2026):
   · Preply: 33% tutor nuevo → 28% tras 20 h → 18% en 400+ h, y la clase de
     prueba se la queda completa (help.preply.com, art. 4171383, su ejemplo
     oficial: $10 → $6.70).
   · italki: 15% histórico; en 2026 profesores reportan ~21% (no confirmado en
     fuente oficial — por eso lleva ~).
   · Cambly: tarifa fija de $10.20/h adultos ($12 Kids), sin precio propio.
   · Classgap: 32% → 16% por horas + 50-100% de la primera clase.
   · AmazingTalker: 30% → 15% por ingresos + ~8% de procesamiento.
   Si un número cambia, se actualiza aquí Y en el pie de la pestaña Plan —
   nunca dejar la cifra sin su fuente.

   Deep link: #/plataforma abre Inicio; #/plataforma/retiros (o cualquier
   pestaña) aterriza directo — mismo espíritu que vistaInicial() en
   stores/app.ts: una lectura al montar, sin listener, sin escribir la URL. */

const COLUMNA = 'mx-auto w-full max-w-[640px] lg:max-w-[1040px]';
const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

type Pestana =
  | 'inicio'
  | 'cobros'
  | 'retiros'
  | 'agenda'
  | 'alumnos'
  | 'academia'
  | 'empresas'
  | 'plan';

const PESTANAS: readonly { id: Pestana; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'cobros', label: 'Cobros' },
  { id: 'retiros', label: 'Retiros' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'alumnos', label: 'Alumnos' },
  { id: 'academia', label: 'Academia' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'plan', label: 'Plan' },
];

function pestanaInicial(): Pestana {
  if (typeof location === 'undefined') return 'inicio';
  const m = location.hash.match(/^#\/?plataforma\/([a-z]+)/i);
  const p = m?.[1]?.toLowerCase() as Pestana | undefined;
  return p && PESTANAS.some((x) => x.id === p) ? p : 'inicio';
}

export default function PlataformaView() {
  const setView = useApp((s) => s.setView);
  const [pestana, setPestana] = useState<Pestana>(pestanaInicial);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Barra de sección (patrón canónico de PROFES/PODCAST) ──────────── */}
      <div className={cn(COLUMNA, 'flex shrink-0 items-center gap-2 pb-3')}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('profes')}
          aria-label="Volver a Profes"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </motion.button>
        <span
          className="min-w-0 flex-1 truncate font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Plataforma · el panel del profe
        </span>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[0.56rem] font-bold tracking-[0.14em] uppercase"
          style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-muted)' }}
        >
          Demo
        </span>
      </div>

      {/* ── El scroller único ─────────────────────────────────────────────── */}
      <Card className={cn(COLUMNA, 'relative min-h-0 flex-1 gap-0 overflow-hidden rounded-[22px] py-0 shadow-sm')}>
        <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6', SIN_BARRA)}>
          {/* Pestañas: pills mono, con scroll horizontal en teléfono. */}
          <nav aria-label="Secciones del panel" className={cn('flex shrink-0 gap-1.5 overflow-x-auto pb-4', SIN_BARRA)}>
            {PESTANAS.map((p) => {
              const activa = p.id === pestana;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPestana(p.id)}
                  className="shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase transition-colors"
                  style={
                    activa
                      ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'transparent' }
                      : { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'var(--borde-sutil)' }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </nav>

          {/* key= remonta el árbol al cambiar de pestaña: así las entradas
             CSS (plata-bloque) se re-disparan por sección, no solo al entrar
             a la vista. */}
          <div key={pestana} className="flex flex-col gap-6">
            {pestana === 'inicio' && <SeccionInicio />}
            {pestana === 'cobros' && <SeccionCobros />}
            {pestana === 'retiros' && <SeccionRetiros />}
            {pestana === 'agenda' && <SeccionAgenda />}
            {pestana === 'alumnos' && <SeccionAlumnos />}
            {pestana === 'academia' && <SeccionAcademia />}
            {pestana === 'empresas' && <SeccionEmpresas />}
            {pestana === 'plan' && <SeccionPlan />}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════ INICIO ══════════════════ */

function SeccionInicio() {
  return (
    <>
      <header className="plata-bloque">
        <h1
          className="font-display text-[clamp(1.7rem,7vw,2.4rem)] leading-[0.98] font-extrabold tracking-[-0.03em]"
          style={{ color: 'var(--text-primary)' }}
        >
          Hola, Carolina
        </h1>
        <p className="mt-2 text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Profesora de inglés y español · Medellín · tarifa $20/hora
        </p>
      </header>

      {/* Saldo + los tres números del mes, en sticker durazno. */}
      <section className="plata-bloque" aria-label="Saldo y resumen del mes">
        <div className="plata-sticker" style={{ background: 'var(--card-peach)', ['--giro' as string]: '-0.9deg' }}>
          <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
            Saldo disponible · llega al instante, es tuyo
          </p>
          <p className="plata-monto mt-1" style={{ color: 'var(--card-ink)' }}>
            342.50 <span className="text-[1.1rem] font-bold tracking-normal">USDC</span>
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            <Dato label="Ingresos de agosto" valor="$1,240" />
            <Dato label="Horas dictadas" valor="62" />
            <Dato label="Alumnos activos" valor="14" />
          </div>
        </div>
      </section>

      {/* La cuenta comparada: la comisión que entregas, no la que te dicen. */}
      <section className="plata-bloque" aria-label="Comparación de comisiones del mes">
        <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          Este mes, comparado · 62 h × $20
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
            <p className="font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Comisión con Preply (tutor nuevo, 33%)
            </p>
            <p className="font-display mt-1 text-[1.9rem] leading-none font-extrabold tracking-[-0.02em]" style={{ color: 'var(--text-secondary)' }}>
              $409
            </p>
            <p className="mt-2 text-[0.76rem] leading-[1.45]" style={{ color: 'var(--text-muted)' }}>
              Y cada clase de prueba con alumno nuevo, completa para la plataforma.
            </p>
          </div>
          <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--accent-dim)', background: 'var(--accent-dim)' }}>
            <p className="font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-secondary)' }}>
              Comisión aquí ($1.50 por hora)
            </p>
            <p className="font-display mt-1 text-[1.9rem] leading-none font-extrabold tracking-[-0.02em]" style={{ color: 'var(--accent)' }}>
              $93
            </p>
            <p className="mt-2 text-[0.76rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
              La diferencia, $316, se queda en tu bolsillo. Y el pago no espera 25 días: es al instante.
            </p>
          </div>
        </div>
      </section>

      {/* Actividad: el feed que demuestra el flujo completo en una lista. */}
      <section className="plata-bloque" aria-label="Actividad reciente">
        <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          Actividad
        </h2>
        <ul className="mt-3 flex flex-col">
          <Fila titulo="Sofía pagó su clase en USDC — recibiste el pago al instante" nota="Hace 2 horas · enlace Clase 60 min" monto="+$20.00" entrante />
          <Fila titulo="Laura compró el paquete de 10 clases" nota="Ayer · 7:12 pm" monto="+$180.00" entrante />
          <Fila titulo="Retiro a tu wallet Pangea" nota="Ayer · 9:40 am · confirmado en la cadena en segundos" monto="−$250.00" />
          <Fila titulo="Kenji reservó clase de español para el martes" nota="Lunes · 6:03 pm · Tokio, UTC+9" monto="" />
        </ul>
      </section>
    </>
  );
}

/* ══════════════════ COBROS ══════════════════ */

function SeccionCobros() {
  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Un enlace, cualquier alumno
        </h1>
        <p className="mt-2 max-w-[52ch] text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Creas un enlace con tu tarifa y lo compartes donde sea. Tu alumno paga y a ti te llega USDC al
          instante — la misma tubería, verificada en la cadena, con la que esta app cobra sus suscripciones.
        </p>
      </header>

      {/* La cuenta de una clase: qué paga el alumno y qué recibes tú. */}
      <section className="plata-bloque" aria-label="Desglose de una clase">
        <div className="plata-sticker" style={{ background: 'var(--card-paper)', ['--giro' as string]: '0.7deg' }}>
          <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
            La cuenta de una clase de $20
          </p>
          <div className="mt-3 flex flex-col gap-2 text-[0.88rem]" style={{ color: 'var(--card-ink)' }}>
            <FilaCuenta k="Tu alumno paga en USDC" v="$20.00" />
            <FilaCuenta k="Tú recibes al instante" v="$20.00" fuerte />
            <FilaCuenta k="Comisión de la plataforma, por hora dictada" v="−$1.50" />
            <FilaCuenta k="Neto para ti" v="$18.50" fuerte divisor />
          </div>
          <p className="mt-3 text-[0.76rem] leading-[1.5]" style={{ color: 'var(--card-ink-soft)' }}>
            La misma clase deja $13.40 en Preply siendo tutor nuevo (33%) y $17.00 en italki (15%). Cuando entre
            el pago con tarjeta, su costo de procesamiento lo pagará el alumno encima del precio — de tus $20 no
            sale.
          </p>
        </div>
      </section>

      {/* Cómo cobra: HOY el riel cripto, EN CAMINO la tarjeta. */}
      <section className="plata-bloque" aria-label="Medios de pago del alumno">
        <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          Cómo paga tu alumno
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          <Capacidad hoy>USDC desde cualquier wallet, con QR o dirección — en segundos, verificado en la cadena.</Capacidad>
          <Capacidad hoy>Enlace de cobro que compartes por WhatsApp, Instagram o correo.</Capacidad>
          <Capacidad>Tarjeta de crédito o débito (Visa, Mastercard, Amex) — el costo del procesador lo paga el alumno.</Capacidad>
          <Capacidad>Paquetes de clases y mensualidad que se cobra sola.</Capacidad>
        </ul>
      </section>

      {/* Enlaces activos del demo. */}
      <section className="plata-bloque" aria-label="Tus enlaces de cobro">
        <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          Tus enlaces
        </h2>
        <ul className="mt-3 flex flex-col">
          <Fila titulo="Clase 60 min — conversación" nota="38 pagos este mes" monto="+$760" entrante />
          <Fila titulo="Paquete de 10 clases" nota="3 pagos este mes" monto="+$540" entrante />
          <Fila titulo="Mensualidad — Nexa BPO (grupo de 6)" nota="Renueva en 3 días" monto="+$540/mes" entrante />
        </ul>
      </section>
    </>
  );
}

/* ══════════════════ RETIROS ══════════════════ */

function SeccionRetiros() {
  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Tu dinero, por la puerta que elijas
        </h1>
        <p className="mt-2 max-w-[52ch] text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Recibes USDC y nadie más lo toca: la plataforma nunca custodia tu dinero. Cada puerta de salida lleva
          su etiqueta honesta — lo que ya funciona y lo que está en camino con proveedores reales.
        </p>
      </header>

      <section className="plata-bloque" aria-label="Puertas de retiro">
        <div className="mt-1">
          <Puerta hoy titulo="A tu wallet Pangea" nota="Al instante, gasless: no necesitas tener SOL ni saber qué es el gas. Tu wallet se crea con tu cuenta de Google, sin frase semilla." />
          <Puerta titulo="Efectivo por MoneyGram" nota="USDC a efectivo en tu moneda. El riel ya existe: MoneyGram opera cash-out cripto en más de 170 países, con límites diarios. Nuestra integración está en camino." />
          <Puerta titulo="Tu banco local" nota="Colombia, México, Brasil o Europa, en tu moneda. Los proveedores del riel ya lo hacen; lo estamos conectando." />
          <Puerta titulo="Cuenta bancaria en EE.UU. a tu nombre" nota="Para recibir como local y guardar en dólares. El proveedor está en pruebas reales en este momento." />
          <Puerta titulo="Tarjeta virtual" nota="Paga con el teléfono desde tu saldo, sin retirar. Existe hoy en el ecosistema por $5 de emisión única; la traeremos dentro del panel." />
          <Puerta titulo="QR local" nota="PIX en Brasil y equivalentes de la región, directo desde tu saldo." />
        </div>
      </section>

      <section className="plata-bloque" aria-label="Nota de custodia">
        <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
          <p className="text-[0.84rem] leading-[1.6]" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Por qué importa que sea sin custodia:</strong> tu saldo
            vive en tu wallet, no en una cuenta de la plataforma. Si esta app desapareciera mañana, tu dinero
            sigue siendo tuyo, en la cadena, con tus llaves.
          </p>
        </div>
      </section>
    </>
  );
}

/* ══════════════════ AGENDA ══════════════════ */

function SeccionAgenda() {
  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Tu semana
        </h1>
        <p className="mt-2 text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          18 – 24 de agosto · America/Bogota. Las clases se agendan solas: el alumno paga tu enlace y elige hora
          dentro de tu disponibilidad.
        </p>
      </header>

      <section className="plata-bloque" aria-label="Clases de la semana">
        <div className="mt-1">
          <Dia nombre="Hoy · martes 19" clases={[
            { hora: '10:00 am', quien: 'Laura V. — inglés B1', pagada: true },
            { hora: '4:00 pm', quien: 'Sofía R. — inglés B2', pagada: true },
            { hora: '8:00 pm', quien: 'Kenji O. — español para negocios', pagada: true },
          ]} />
          <Dia nombre="Miércoles 20" clases={[
            { hora: '8:00 am', quien: 'Nexa BPO — grupo A1 (6 personas)', pagada: true },
            { hora: '6:00 pm', quien: 'Andrés T. — entrevista de trabajo', pagada: false },
          ]} />
          <Dia nombre="Jueves 21" clases={[
            { hora: '10:00 am', quien: 'Laura V. — inglés B1', pagada: true },
            { hora: '4:00 pm', quien: 'Diana C. — IELTS', pagada: true },
          ]} />
          <Dia nombre="Viernes 22" clases={[
            { hora: '8:00 am', quien: 'Nexa BPO — grupo A1 (6 personas)', pagada: true },
            { hora: '4:00 pm', quien: 'Sofía R. — inglés B2', pagada: true },
            { hora: '6:00 pm', quien: 'Camila P. — conversación', pagada: true },
          ]} />
          <Dia nombre="Sábado 23" clases={[{ hora: '10:00 am', quien: 'Miguel A. — inglés A2', pagada: true }]} />
        </div>
        <p className="mt-4 text-[0.74rem]" style={{ color: 'var(--text-muted)' }}>
          El punto durazno marca clase ya pagada. Sin punto: pago pendiente — el recordatorio le llega al alumno,
          no lo persigues tú.
        </p>
      </section>
    </>
  );
}

/* ══════════════════ ALUMNOS ══════════════════ */

function SeccionAlumnos() {
  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Tus alumnos
        </h1>
        <p className="mt-2 text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          14 activos · quién pagó, quién sigue y cuánto ha dejado cada relación.
        </p>
      </header>

      <section className="plata-bloque" aria-label="Lista de alumnos">
        <ul className="mt-1 flex flex-col">
          <Alumno nombre="Sofía R." detalle="Inglés B2 · desde marzo · próxima: hoy 4:00 pm" estado="al-dia" total="$460" />
          <Alumno nombre="Laura V." detalle="Inglés B1 · paquete de 10, quedan 7 · próxima: jueves 10:00 am" estado="al-dia" total="$1,120" />
          <Alumno nombre="Nexa BPO — grupo A1" detalle="6 personas · corporativo · mensualidad" estado="renueva" total="$2,700" />
          <Alumno nombre="Andrés T." detalle="Entrevistas de trabajo · desde julio · próxima: miércoles 6:00 pm" estado="pendiente" total="$180" />
          <Alumno nombre="Kenji O." detalle="Español para negocios · Tokio · paquete de 10, quedan 2" estado="al-dia" total="$740" />
          <Alumno nombre="Diana C." detalle="IELTS · mensualidad · próxima: jueves 4:00 pm" estado="al-dia" total="$390" />
        </ul>
      </section>
    </>
  );
}

/* ══════════════════ ACADEMIA ══════════════════ */

function SeccionAcademia() {
  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Academia cripto para profes
        </h1>
        <p className="mt-2 max-w-[52ch] text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Cobrar en dólares digitales no debería dar miedo. Cuatro módulos cortos, a tu ritmo, para que sepas
          exactamente dónde está tu dinero y cómo moverlo.
        </p>
      </header>

      <section className="plata-bloque" aria-label="Módulos de la academia">
        <div className="mt-1">
          <Modulo n="01" titulo="Tus dólares digitales" nota="Qué es USDC, por qué vale 1 dólar y dónde vive tu saldo en realidad." progreso={100} />
          <Modulo n="02" titulo="Retira sin sustos" nota="Wallet, efectivo, banco o tarjeta: cuál conviene según cuánto y cuándo." progreso={60} />
          <Modulo n="03" titulo="Tu propia wallet" nota="Autocustodia con Pangea: tus llaves, tu dinero, sin intermediarios." progreso={0} />
          <Modulo n="04" titulo="Haz crecer tu ahorro" nota="Rendimiento en USDC: qué es real, qué es humo y cómo medir el riesgo." progreso={0} />
        </div>
      </section>

      <section className="plata-bloque" aria-label="Clase en vivo">
        <div className="plata-sticker" style={{ background: 'var(--card-yellow)', ['--giro' as string]: '-0.7deg' }}>
          <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
            Clase en vivo del mes · jueves 28, 7:00 pm
          </p>
          <p className="font-display mt-2 text-[1.15rem] leading-[1.15] font-bold tracking-[-0.01em]" style={{ color: 'var(--card-ink)' }}>
            Impuestos y facturación para profes que cobran en USDC
          </p>
          <p className="mt-2 text-[0.8rem] leading-[1.5]" style={{ color: 'var(--card-ink-soft)' }}>
            Colombia y México, con sesión de preguntas. Queda grabada en la Academia.
          </p>
        </div>
      </section>
    </>
  );
}

/* ══════════════════ EMPRESAS ══════════════════ */

function SeccionEmpresas() {
  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Inglés que suena al trabajo real
        </h1>
        <p className="mt-2 max-w-[56ch] text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          La capacitación genérica no prepara a nadie. Aquí el equipo escucha llamadas de ejemplo de su propia
          campaña, practica contra un cliente de IA que se comporta como los de verdad, y el trainer deja de
          dictar teoría para corregir con datos. <span style={{ color: 'var(--text-muted)' }}>Esta línea está en
          diseño: lo que ves es la maqueta de la idea.</span>
        </p>
      </header>

      {/* La simulación: transcript sticker + scorecard. El corazón del pitch. */}
      <section className="plata-bloque grid gap-3 lg:grid-cols-2" aria-label="Simulación de llamada">
        <div className="plata-sticker" style={{ background: 'var(--card-blue)', ['--giro' as string]: '-0.8deg' }}>
          <p className="font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
            Simulación · campaña de seguros médicos · cliente IA: escéptico, con prisa
          </p>
          <div className="mt-3 flex flex-col gap-2 text-[0.84rem] leading-[1.45]" style={{ color: 'var(--card-ink)' }}>
            <p><strong>Cliente (IA):</strong> Look, I already have coverage through my job. Why would I pay for another plan?</p>
            <p><strong>Practicante:</strong> Many of my clients said the same thing at first. Can I ask what your current plan covers for emergencies abroad?</p>
            <p><strong>Cliente (IA):</strong> Hmm… I actually don't know. Probably nothing?</p>
          </div>
          <p className="mt-3 text-[0.72rem]" style={{ color: 'var(--card-ink-soft)' }}>
            Semana 1 es para equivocarse sin que cueste un contrato. Semana 2 es para medir la mejora.
          </p>
        </div>
        <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
          <p className="font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Scorecard del practicante · semana 2
          </p>
          <div className="mt-3">
            <Puntaje label="Manejo de objeciones" valor={74} />
            <Puntaje label="Protocolo de campaña" valor={91} />
            <Puntaje label="Fluidez y pronunciación" valor={82} />
            <Puntaje label="Empatía y tono" valor={68} />
          </div>
          <p className="mt-3 text-[0.8rem]" style={{ color: 'var(--accent)' }}>
            +19 puntos frente a la semana 1
          </p>
          <p className="mt-1 text-[0.74rem] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
            El trainer recibe esto por practicante y por campaña: corrige donde duele, no repite teoría.
          </p>
        </div>
      </section>

      {/* El contexto con números verificados — la razón de ser de la línea. */}
      <section className="plata-bloque" aria-label="Por qué esta línea">
        <div className="rounded-[18px] border px-5 py-4" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
          <p className="text-[0.86rem] leading-[1.65]" style={{ color: 'var(--text-secondary)' }}>
            En Colombia, hablar inglés B2+ paga alrededor del <strong style={{ color: 'var(--text-primary)' }}>doble</strong> en
            el sector BPO. Los grandes call centers ya compran simulación con IA para entrenar habilidades de
            venta — pero <strong style={{ color: 'var(--text-primary)' }}>nadie entrena el idioma dentro del contexto de la
            campaña</strong>: ese es el espacio. La idea nace de experiencia propia: entrenamientos donde jamás se
            escucha una conversación real antes de atender la primera llamada.
          </p>
        </div>
      </section>
    </>
  );
}

/* ══════════════════ PLAN ══════════════════ */

function SeccionPlan() {
  return (
    <>
      <header className="plata-bloque">
        <h1 className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.02] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          Un trato justo, en una pantalla
        </h1>
        <p className="mt-2 max-w-[52ch] text-[0.88rem] leading-[1.55]" style={{ color: 'var(--text-secondary)' }}>
          Sin comisiones escondidas ni primera clase gratis para la plataforma. Los precios de abajo son la
          hipótesis en estudio — se publican cuando abra el piloto.
        </p>
      </header>

      <section className="plata-bloque grid gap-3 sm:grid-cols-2" aria-label="Planes">
        <div className="rounded-[18px] border px-5 py-5" style={{ borderColor: 'var(--borde-sutil)', background: 'var(--bg-surface)' }}>
          <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Empieza · $0/mes
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            <Linea>Comisión de $2.00 por hora dictada</Linea>
            <Linea>Enlaces de cobro ilimitados</Linea>
            <Linea>Retiro a tu wallet, agenda y lista de alumnos</Linea>
            <Linea>Academia: primeros dos módulos</Linea>
          </ul>
        </div>
        <div className="plata-sticker" style={{ background: 'var(--card-green)', ['--giro' as string]: '0.6deg' }}>
          <p className="font-mono text-[0.62rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
            Pro · $19/mes
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            <LineaCard>Comisión de $1.50 por hora dictada</LineaCard>
            <LineaCard>Página de perfil pública con reservas</LineaCard>
            <LineaCard>Retiros prioritarios y tarjeta incluida cuando lleguen</LineaCard>
            <LineaCard>Academia completa + clase en vivo mensual</LineaCard>
          </ul>
        </div>
      </section>

      {/* La tabla que sostiene el pitch: 40 h/mes a $20/h, con fuentes. */}
      <section className="plata-bloque" aria-label="Comparación con otras plataformas">
        <h2 className="font-mono text-[0.64rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--accent)' }}>
          La cuenta clara · 40 h al mes a $20 la hora
        </h2>
        <div className="plata-tabla mt-3">
          <table>
            <thead>
              <tr>
                <th>Plataforma</th>
                <th>Cómo cobra</th>
                <th>Te queda</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Aquí (Pro)</strong></td>
                <td>$1.50/h + $19/mes</td>
                <td><strong style={{ color: 'var(--accent)' }}>$721 · 90%</strong></td>
              </tr>
              <tr>
                <td><strong>Aquí (Empieza)</strong></td>
                <td>$2.00/h, sin mensualidad</td>
                <td><strong style={{ color: 'var(--accent)' }}>$720 · 90%</strong></td>
              </tr>
              <tr>
                <td>italki</td>
                <td>15% histórico · profes reportan ~21% en 2026</td>
                <td>$680 · 85% (~$632 si es 21%)</td>
              </tr>
              <tr>
                <td>Preply</td>
                <td>33% → 18% por horas + clase de prueba completa</td>
                <td>$536 – $656 · 67 – 82%</td>
              </tr>
              <tr>
                <td>Classgap</td>
                <td>32% → 16% + 50-100% de la primera clase</td>
                <td>$544 – $672</td>
              </tr>
              <tr>
                <td>Cambly</td>
                <td>Tarifa fija $10.20/h — no pones tu precio</td>
                <td>$408</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.7rem] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
          Cifras publicadas por cada plataforma en sus centros de ayuda, verificadas el 19-08-2026 (Preply art.
          4171383 con su ejemplo $10 → $6.70; Cambly y Classgap en sus páginas oficiales). El ~21% de italki es
          reporte de profesores, sin confirmación oficial — por eso lleva ~. Aquí el pago llega al instante; en
          las demás tarda de 3 a 25 días según la plataforma y el método.
        </p>
      </section>
    </>
  );
}

/* ══════════════════ piezas compartidas ══════════════════ */

/* Cifra con etiqueta mono encima — para el sticker de saldo. */
function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--card-ink-soft)' }}>
        {label}
      </p>
      <p className="font-display mt-0.5 text-[1.4rem] leading-none font-extrabold tracking-[-0.02em] tabular-nums" style={{ color: 'var(--card-ink)' }}>
        {valor}
      </p>
    </div>
  );
}

/* Fila de feed/lista: título + nota + monto a la derecha. Lista editorial con
   divisores — no tarjetas. El monto entrante va en durazno (= --success). */
function Fila({ titulo, nota, monto, entrante = false }: { titulo: string; nota: string; monto: string; entrante?: boolean }) {
  return (
    <li className="plata-fila">
      <div className="min-w-0 flex-1">
        <p className="text-[0.88rem] leading-[1.35] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {titulo}
        </p>
        <p className="mt-0.5 text-[0.74rem]" style={{ color: 'var(--text-muted)' }}>
          {nota}
        </p>
      </div>
      {monto && (
        <span className="shrink-0 text-[0.9rem] font-bold tabular-nums" style={{ color: entrante ? 'var(--accent)' : 'var(--text-secondary)' }}>
          {monto}
        </span>
      )}
    </li>
  );
}

/* Renglón del desglose de una clase (sobre card clara). */
function FilaCuenta({ k, v, fuerte = false, divisor = false }: { k: string; v: string; fuerte?: boolean; divisor?: boolean }) {
  return (
    <div
      className={cn('flex items-baseline justify-between gap-4', divisor && 'border-t pt-2')}
      style={divisor ? { borderColor: 'oklch(24% 0.03 265 / 0.18)' } : undefined}
    >
      <span style={{ color: 'var(--card-ink-soft)' }}>{k}</span>
      <span className={cn('tabular-nums', fuerte ? 'font-bold' : undefined)}>{v}</span>
    </div>
  );
}

/* Una capacidad con su etiqueta honesta: check durazno = HOY, "EN CAMINO" mono
   si es visión. Mismo lenguaje que la lista de estado de PROFES. */
function Capacidad({ hoy = false, children }: { hoy?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      {hoy ? (
        <span className="mt-0.5 inline-flex size-4.5 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          <Check size={11} strokeWidth={3} />
        </span>
      ) : (
        <span className="mt-[3px] shrink-0 rounded-full border px-1.5 py-px font-mono text-[0.5rem] font-bold tracking-[0.12em] uppercase" style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-muted)' }}>
          En camino
        </span>
      )}
      <span className="text-[0.86rem] leading-[1.5]" style={{ color: hoy ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {children}
      </span>
    </li>
  );
}

/* Puerta de retiro: renglón editorial con etiqueta HOY/EN CAMINO. */
function Puerta({ hoy = false, titulo, nota }: { hoy?: boolean; titulo: string; nota: string }) {
  return (
    <div className="plata-puerta">
      <div className="flex items-center gap-2.5">
        <p className="font-display text-[1.02rem] leading-[1.2] font-bold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
          {titulo}
        </p>
        {hoy ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.52rem] font-bold tracking-[0.12em] uppercase" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <Check size={9} strokeWidth={3.5} /> Hoy
          </span>
        ) : (
          <span className="shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[0.52rem] font-bold tracking-[0.12em] uppercase" style={{ borderColor: 'var(--borde-sutil)', color: 'var(--text-muted)' }}>
            En camino
          </span>
        )}
      </div>
      <p className="mt-1 text-[0.82rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
        {nota}
      </p>
    </div>
  );
}

/* Un día de la agenda: nombre + clases como renglones con punto de pago. */
function Dia({ nombre, clases }: { nombre: string; clases: { hora: string; quien: string; pagada: boolean }[] }) {
  return (
    <div className="plata-puerta">
      <p className="font-mono text-[0.6rem] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-muted)' }}>
        {nombre}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {clases.map((c) => (
          <li key={c.hora + c.quien} className="flex items-center gap-2.5 text-[0.86rem]">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: c.pagada ? 'var(--accent)' : 'transparent', border: c.pagada ? 'none' : '1px solid var(--borde-sutil)' }}
              aria-label={c.pagada ? 'Clase pagada' : 'Pago pendiente'}
            />
            <span className="w-[4.6rem] shrink-0 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {c.hora}
            </span>
            <span style={{ color: 'var(--text-primary)' }}>{c.quien}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Renglón de alumno con estado de pago. */
function Alumno({ nombre, detalle, estado, total }: { nombre: string; detalle: string; estado: 'al-dia' | 'pendiente' | 'renueva'; total: string }) {
  const chip =
    estado === 'al-dia'
      ? { texto: 'Al día', style: { background: 'var(--accent-dim)', color: 'var(--accent)' } }
      : estado === 'renueva'
        ? { texto: 'Renueva en 3 días', style: { background: 'transparent', color: 'var(--warn)', border: '1px solid var(--borde-sutil)' } }
        : { texto: 'Pago pendiente', style: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--borde-sutil)' } };
  return (
    <li className="plata-fila">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.9rem] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {nombre}
          </p>
          <span className="rounded-full px-2 py-0.5 font-mono text-[0.52rem] font-bold tracking-[0.12em] uppercase" style={chip.style}>
            {chip.texto}
          </span>
        </div>
        <p className="mt-0.5 text-[0.74rem]" style={{ color: 'var(--text-muted)' }}>
          {detalle}
        </p>
      </div>
      <span className="shrink-0 text-[0.88rem] font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {total}
      </span>
    </li>
  );
}

/* Módulo de la academia: número mono + título + barra de progreso durazno. */
function Modulo({ n, titulo, nota, progreso }: { n: string; titulo: string; nota: string; progreso: number }) {
  return (
    <div className="plata-puerta">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[0.8rem] font-bold" style={{ color: 'var(--accent)' }}>
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.02rem] leading-[1.2] font-bold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
            {titulo}
          </p>
          <p className="mt-1 text-[0.82rem] leading-[1.5]" style={{ color: 'var(--text-secondary)' }}>
            {nota}
          </p>
          <div className="plata-progreso mt-2.5" role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Barra de puntaje del scorecard B2B. */
function Puntaje({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-[11rem] shrink-0 text-[0.78rem]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div className="plata-progreso flex-1" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${valor}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right text-[0.82rem] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {valor}
      </span>
    </div>
  );
}

/* Renglón de plan sobre shell (Empieza) y sobre card (Pro). */
function Linea({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[0.84rem] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
      <Check size={13} strokeWidth={2.6} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
      <span>{children}</span>
    </li>
  );
}
function LineaCard({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[0.84rem] leading-[1.45]" style={{ color: 'var(--card-ink)' }}>
      <Check size={13} strokeWidth={2.6} className="mt-0.5 shrink-0" style={{ color: 'var(--card-ink-soft)' }} />
      <span>{children}</span>
    </li>
  );
}
