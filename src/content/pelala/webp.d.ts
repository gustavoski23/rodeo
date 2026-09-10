/* Import de .webp como URL de asset (Vite emite el archivo y devuelve su ruta).
   El repo no referencia `vite/client`, así que declaramos el módulo a mano —igual
   que sticker-forge/assets.d.ts hace con *.mp3?inline. Sin ?inline: el webp NO se
   base64ea dentro del JS, se sirve aparte y se carga cuando el sticker se muestra. */
declare module '*.webp' {
  const src: string;
  export default src;
}
