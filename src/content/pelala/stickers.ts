/* Pack de stickers ILUSTRADOS de Pélala — SVG vectorial, no foto/PNG.
   Por qué SVG y no una imagen subida: el motor (sticker-forge) calcula la
   silueta del "die-cut" leyendo el canal alfa de la textura — sin transparencia
   real, pela como un rectángulo plano, no como una calcomanía. El SVG trae esa
   transparencia gratis (donde no hay trazo, no hay relleno) y no depende de
   ningún servicio externo de imágenes ni de quitar fondo a mano.

   Un término SIN entrada aquí sigue usando el sticker de texto de siempre
   (slangTextSource, en peel-sticker.tsx) — este mapa es opt-in, se va llenando
   término a término. */

export const STICKER_SVG: Record<string, string> = {
  'wind-up': `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <rect x="34" y="34" width="332" height="332" rx="92" fill="#EAF2FF" stroke="#FFFFFF" stroke-width="16"/>

  <circle cx="288" cy="98" r="34" fill="#FFD65C"/>
  <circle cx="303" cy="87" r="30" fill="#EAF2FF"/>
  <circle cx="246" cy="66" r="4" fill="#FFD65C"/>
  <circle cx="262" cy="118" r="3.2" fill="#FFD65C"/>
  <circle cx="232" cy="96" r="2.6" fill="#FFD65C"/>

  <path d="M 150 150 C 128 118, 196 108, 176 76 C 160 50, 214 44, 228 66"
        fill="none" stroke="#19191d" stroke-width="9" stroke-linecap="round"/>
  <circle cx="228" cy="66" r="6.5" fill="#19191d"/>

  <path d="M 66 158 h132 a24 24 0 0 1 24 24 v46 a24 24 0 0 1 -24 24 h-88 l-30 26 6-30
           h-20 a24 24 0 0 1 -24 -24 v-42 a24 24 0 0 1 24 -24 z"
        fill="rgb(36,126,245)"/>
  <circle cx="112" cy="206" r="8.5" fill="#FFFFFF"/>
  <circle cx="142" cy="206" r="8.5" fill="#FFFFFF"/>
  <circle cx="172" cy="206" r="8.5" fill="#FFFFFF"/>

  <text x="200" y="308" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
        font-weight="900" font-size="52" letter-spacing="1">
    <tspan fill="#19191d">WIND </tspan><tspan fill="rgb(36,126,245)">UP</tspan>
  </text>
  <text x="200" y="336" text-anchor="middle" font-family="Arial, sans-serif"
        font-weight="600" font-size="17" fill="#6b7280">¿cómo se dice?</text>
</svg>`,
};
