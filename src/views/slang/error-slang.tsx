import { motion } from 'motion/react';

/* Estado de error visible. El viejo solo lanzaba `toast('Error: …', 6000)`: si
   mirabas a otro lado, el error se iba y quedaba una pantalla vacía sin
   explicación. El toast se mantiene tal cual (misma copia, mismos ms) y esto se
   suma dentro del feed, con el reintento a mano — que es lo que el usuario iba
   a hacer de todos modos volviendo a pulsar DROP.

   Los mensajes que llegan aquí son los del legacy: 'Respuesta inválida, dale
   otra vez' (JSON sucio), 'No pude traducir eso, intenta de nuevo', y los de la
   capa de API ('Error de conexión', 'Sin PIN no hay rodeo.', el detalle del
   servidor). */
export function ErrorSlang({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-start gap-2 rounded-[18px] border px-4 py-3.5"
      style={{
        borderColor: 'color-mix(in oklch, var(--danger) 34%, transparent)',
        background: 'var(--danger-dim)',
      }}
    >
      <p className="font-mono text-[0.6rem] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--danger)' }}>
        No salió
      </p>
      <p className="text-[0.9rem] leading-[1.5]" style={{ color: 'var(--text-primary)' }}>
        {mensaje}
      </p>
      <button
        type="button"
        onClick={onReintentar}
        className="min-h-11 cursor-pointer bg-transparent p-0 text-[0.85rem] font-bold underline underline-offset-[3px]"
        style={{ color: 'var(--danger)' }}
      >
        Intentar de nuevo
      </button>
    </motion.div>
  );
}
