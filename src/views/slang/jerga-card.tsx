import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import type { JergaCard } from '@/stores/slang';

/* Tarjeta de resultado de JERGA → GRINGO — port de L4888-4900.
   Sin rotación (el viejo no la aplica aquí), sin botón de guardar y sin TTS:
   es una consulta puntual, no material que se colecciona. El titular es la
   frase que escribió el usuario, entre comillas; `d.phrase` del modelo se
   ignora a propósito en el store. */
export function JergaCardView({ card }: { card: JergaCard }) {
  return (
    <motion.div
      className={cn('rd-slang-card', card.theme.text)}
      style={{ background: card.theme.bg }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="label-mini">jerga → inglés real</span>
      <div className="term" style={{ fontSize: 'clamp(1.8rem, 8vw, 2.6rem)' }}>
        "{card.phrase}"
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {card.equivalents.map((eq, i) => (
          <div key={i} className="eq">
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>
              {eq.en} <span className="label-mini" style={{ fontWeight: 700 }}>· {eq.register}</span>
            </div>
            {eq.example && (
              <div className="ex" style={{ marginTop: 3 }}>
                "{eq.example}"
              </div>
            )}
            {eq.note_es && (
              <div className="ex-es" style={{ marginTop: 2 }}>
                {eq.note_es}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
