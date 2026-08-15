/* Banderas en SVG — se ven en TODOS los dispositivos.

   Por qué no emoji (🇪🇸 / 🇺🇸): las banderas emoji son pares de "indicadores
   regionales" que el sistema tiene que componer con su fuente de color. Android
   e iOS traen esa fuente, pero Windows NO — Chrome/Edge en Windows pintan las
   dos letras sueltas ("ES", "US") o nada. Por eso en el cel se veían las
   banderas y en la compu no. Dibujarlas como SVG las hace idénticas en todas
   partes, sin depender de la fuente del sistema.

   Se mantienen simples a propósito (a ~20 px el detalle fino no se ve): España
   es la franja roja-amarilla-roja; Estados Unidos, las 13 franjas + el cantón
   azul con estrellas. `preserveAspectRatio="xMidYMid slice"` llena el rectángulo
   redondeado sin deformar. */

type Props = { className?: string };

/** 🇪🇸 Bandera de España (rojo / amarillo / rojo). */
export function BanderaES({ className }: Props) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
    >
      <rect width="30" height="20" fill="#c60b1e" />
      <rect y="5" width="30" height="10" fill="#ffc400" />
    </svg>
  );
}

/** 🇺🇸 Bandera de Estados Unidos (13 franjas + cantón azul con estrellas). */
export function BanderaUS({ className }: Props) {
  const ROJO = '#b22234';
  const AZUL = '#3c3b6e';
  const franjaAlto = 20 / 13; // 13 franjas repartidas en 20 de alto

  const franjas = [];
  for (let i = 1; i < 13; i += 2) {
    // Fondo blanco + franjas ROJAS encima en los índices pares (0,2,4…): con el
    // fondo blanco basta con pintar las 6 blancas "por ausencia".
    franjas.push(<rect key={i} y={i * franjaAlto} width="30" height={franjaAlto} fill="#fff" />);
  }

  const estrellas = [];
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 5; col++) {
      estrellas.push(
        <circle key={`${fila}-${col}`} cx={1.6 + col * 2.1} cy={1.5 + fila * 2.4} r="0.7" fill="#fff" />,
      );
    }
  }

  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
    >
      <rect width="30" height="20" fill={ROJO} />
      {franjas}
      <rect width="12" height={franjaAlto * 7} fill={AZUL} />
      {estrellas}
    </svg>
  );
}
