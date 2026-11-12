# Fuentes y criterio de calidad

El directorio `src/data/alimentos.ts` es una **semilla representativa de desarrollo**, no una copia exhaustiva de la TCAC ni un inventario de todos los productos vendidos en Colombia.

## Fuentes generales enlazadas por registro

- **ICBF — Tabla de Composición de Alimentos Colombianos (TCAC):** marco de referencia para alimentos y preparaciones locales. La semilla lo declara explícitamente cuando la homologación documental sigue pendiente; esa etiqueta no certifica coincidencia exacta con una edición concreta.
- **USDA FoodData Central:** valores genéricos de referencia para numerosos alimentos crudos y cocidos.
- **Open Food Facts (Colombia):** fuente prevista para una fase comercial posterior. Los datos de empaque deben importarse por código de barras y presentación, no extrapolarse entre marcas.

## Regla antes de producción

1. Contrastar cada fila con página/tabla o fotografía legible de etiqueta.
2. Registrar estado (crudo/cocido/seco/escurrido), porción y densidad cuando la unidad sea ml.
3. Sustituir `fuente.documento` por referencia exacta de página, ID FDC/GTIN y fecha de consulta.
4. No llamar `VERIFICADO` a un dato sin doble revisión humana.
5. Mantener los valores originales y unidad de ingesta en el ETL para auditoría.

## Taxonomía de origen

`CRIOLLO` y `NO_CRIOLLO` son clasificaciones **editoriales**, no certificaciones de denominación de origen, raza, país de fabricación ni calidad nutricional. Un alimento americano introducido en otra región, una variedad moderna cultivada localmente y una preparación tradicional pueden requerir criterios distintos. El campo `detalleOrigen` siempre explica la decisión.
