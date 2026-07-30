/* Pista de esquina "por dónde pelar" — reemplaza al borde azul del engine.
   Sutil, en la esquina superior derecha, solo la primera vez (el reto la marca
   como vista y se persiste). Un puntito que se arrastra en diagonal hacia adentro
   (la dirección del peel) con un anillo que pulsa: "toca aquí y jala".
   CSS keyframes (no GSAP) para que sea fiable, según la regla de oro de Rodeo. */

export function CornerHint() {
  return (
    <div
      className="pointer-events-none absolute right-3 top-3 z-20"
      aria-hidden="true"
    >
      <div className="pelala-corner">
        <span className="pelala-corner-ring" />
        <span className="pelala-corner-dot" />
      </div>
      <style>{`
        @keyframes pelala-corner-drift {
          0%, 100% { transform: translate(0, 0); }
          50%      { transform: translate(-9px, 9px); }
        }
        @keyframes pelala-corner-pulse {
          0%   { transform: scale(0.6); opacity: 0.55; }
          70%  { transform: scale(1.7); opacity: 0; }
          100% { opacity: 0; }
        }
        .pelala-corner {
          position: relative;
          width: 26px;
          height: 26px;
          animation: pelala-corner-drift 1.7s ease-in-out infinite;
        }
        .pelala-corner-dot {
          position: absolute;
          inset: 7px;
          border-radius: 9999px;
          background: rgb(36, 126, 245);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
        }
        .pelala-corner-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid rgba(36, 126, 245, 0.8);
          animation: pelala-corner-pulse 1.7s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pelala-corner, .pelala-corner-ring { animation: none; }
          .pelala-corner-ring { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
