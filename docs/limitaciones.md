# Estado real, pendientes y límites

## Verificado
- `tsc --noEmit` sin errores (TypeScript estricto).
- Recorrido automatizado con Chromium (Playwright) sobre un bundle de prueba: todas las rutas sin errores de consola en celular oscuro/claro y escritorio; menú + botón atrás; cambio de tema y perfil; deslizar entre pestañas; panel admin local (crear/validar/editar partidos, goles rápidos); pronóstico exacto = +5 puntos y persistencia al recargar; búsqueda sin acentos; alineaciones; banner offline.

## NO verificado (no se pudo en el entorno de construcción)
- `npm install` / `npm run build` de Vite reales (sin acceso al registro npm). El bundle de prueba se hizo con esbuild. Si `npm run build` falla, avisá el error: probablemente sea un ajuste menor.
- Generación de `dist/sw.js` por el plugin de Vite y comportamiento offline del service worker en un build real.
- Migraciones SQL contra una base real y el modo `cloud` (registro, login, roles, ranking).
- Rive: el código está listo pero **no hay archivos `.riv`** (hay que crearlos en rive.app y ponerlos en `public/rive/`).
- Empaquetado APK.

## Pendiente / decisiones
- Push con la app cerrada (ver `notificaciones-push.md`).
- Cuentas y pronósticos viejos no migrados (falta su SQL).
- Datos de ejemplo: los partidos de `seed.json` están en el pasado; para probar pronósticos creá un partido futuro en Admin.
- Importación/exportación: JSON del dataset completo desde Admin. No hay importación CSV.
- Transmisiones: se gestionan como "canales" por partido; no hay reproductor integrado.

## Televisores
- Con pantallas ≥1600 px se activa la navegación con flechas (foco espacial), foco visible y textos más grandes.
- Los navegadores de Smart TV (Tizen, webOS, Android TV) varían mucho: algunos no soportan *container queries*, `backdrop-filter` ni service workers. En ECO/auto la app evita el blur. No se prometió compatibilidad total: probá en tu TV real.
- El control remoto debe enviar eventos de flechas y Enter estándar.

## Navegadores
Pensado para navegadores modernos (Chrome/Edge/Firefox/Safari de los últimos ~3 años). En Android con Chrome 100+ funciona todo; en navegadores más viejos pueden fallar las container queries o IndexedDB en modo privado (la app sigue con datos en memoria).
