/* Los tipos del fork son los del paquete: lo que cambia es la implementación de
   UNA capa interna (Curl/webgl/CurlWebglLayer.mjs), no la API. Reexportarlos
   evita mantener una copia de las firmas que se desincronizaría en silencio, y
   ata el fork a la versión instalada: si `@gfazioli/mantine-book` cambia su API,
   esto deja de compilar y hay que mirar el fork. Ver FORK.md. */
export { Book, BookPage, faceToTurnedPages, turnedPagesToFace } from '@gfazioli/mantine-book';
