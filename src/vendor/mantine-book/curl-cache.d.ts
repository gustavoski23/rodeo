/** Tira todas las texturas de cara guardadas. La vista la llama cuando cambia
    algo que reordena el texto sin cambiar el tamaño de la página: la escala del
    lector (A−/A+) y el libro activo. */
export declare function invalidarCaras(): void;
/** Generación actual de la caché; forma parte de la clave de captura. */
export declare function generacionActual(): number;
/** Cuántas caras hay guardadas ahora mismo (tope 6). Para las pruebas. */
export declare function carasGuardadas(): number;
