# Arquitectura

## Mapa de carpetas
```
src/
  main.ts            Punto de entrada: importa CSS y llama a boot()
  core/              Cerebro de la app (sin pantallas)
    config.ts          Configuración general (editable)
    app.ts             Arranque: datos → encabezado/barras → router → servicios
    router.ts          Router por hash (#/ruta), carga diferida de pantallas
    screen.ts          Contrato de pantalla (ScreenFn / ScreenCtx)
    layers.ts          Menú/modales + botón "atrás" de Android
    navigation.ts      Qué secciones van en tabs/menú + gestos de deslizar
    prefs.ts           Tema, perfil de rendimiento, preferencias
    events.ts          Bus de eventos (data, prefs, session, connection, route, predictions)
    lifecycle.ts       Service worker, actualizaciones, instalación, navegación TV
    status.ts          Textos de estado ("hace 3 min")
  features/          Una carpeta por sección (home, matches, standings, …)
    registry.ts        LISTA de secciones (el único lugar donde se registran)
  components/        Piezas visuales reutilizables (cards, buttons, modals, inputs, loaders, header, navigation, sidebar, icons)
  services/          Todo lo externo
    data/              Dataset único: modo nube/legacy/local, caché, polling, selectores, pronósticos
    supabase/          Cliente REST y autenticación
    storage/kv.ts      IndexedDB (clave-valor)
    notifications/     Detección de novedades y avisos
    user.ts            Preferencias/favoritos del usuario
  animations/        Rive (carga diferida) y transiciones
  styles/            design-tokens, themes, global, layout, components, screens, responsive, animations, utilities
  types/ utils/ data/
supabase/migrations/ SQL
scripts/             Conversión de datos viejos → seed.json
public/              manifest, íconos, rive/
```

## Flujo de datos
```
Pantalla ──pide──▶ getData()/selectors ◀── services/data ◀── Supabase (REST) / IndexedDB / seed.json
   ▲                                         │
   └────────── bus.on('data') ◀──────────────┘  (polling 20 s en vivo / 90 s)
```
- Una sola fuente de verdad (`Dataset`) en memoria. Se muestra **al instante** desde caché o ejemplo y se actualiza en segundo plano.
- Cada dato lleva su **origen** (`seed`, `draft`, `cache`, `server`). La franja superior avisa cuando lo que ves no está confirmado por el servidor.
- La tabla de posiciones se **calcula** desde los partidos (`selectors.ts`); nunca se carga a mano.

## Contrato de una pantalla
```ts
import type { ScreenFn } from '@/core/screen';
const miPantalla: ScreenFn = (ctx) => {
  ctx.view(() => `<h1>Hola</h1><button data-hola>Tocar</button>`);  // devuelve HTML; se vuelve a dibujar con ctx.refresh()
  ctx.on('click', '[data-hola]', () => ctx.navigate('/matches'));    // eventos delegados, se limpian solos
};
export default miPantalla;
```
`ctx.listen(...)` y `bus.on` dentro de una pantalla también se limpian al salir.

## Agregar una sección nueva (3 pasos)
1. Crear `src/features/mi-seccion/index.ts` con el contrato de arriba.
2. Agregar una línea en `src/features/registry.ts`:
   ```ts
   { id: 'mi-seccion', path: '/mi-seccion', title: 'Mi sección', icon: 'star', load: () => import('./mi-seccion') },
   ```
3. Para que aparezca en la navegación, agregar `'mi-seccion'` a `NAV.tabs` o `NAV.drawer` en `src/core/config.ts`.

Opciones del registro: `immersive: true` (pantalla completa con flecha de volver), `adminOnly: true`, rutas con parámetro (`/team/:id`).

## Capas y botón "atrás"
Menú y modales empujan una entrada al historial; el botón atrás de Android cierra la capa de arriba en vez de salir de la app (`core/layers.ts`).

## Rendimiento
- Cada pantalla es un *chunk* que se descarga al visitarla (`import()` dinámico).
- Efectos pesados (blur, sombras, animaciones) dependen de `<html data-perf>`; `auto` elige ECO en equipos de pocos núcleos/memoria.
- `prefers-reduced-motion` desactiva animaciones.
- Rive solo se descarga en ULTRA y solo si existe el `.riv`.

## Decisiones
- **Cliente Supabase propio por REST** (en vez de `@supabase/supabase-js`): menos peso y cero dependencias. Si querés realtime/websockets, se puede cambiar `services/supabase/client.ts` sin tocar las pantallas.
- **Íconos propios** (`components/icons.ts`) en vez de Lucide: mismo estilo de trazo, sin dependencia. Se pueden reemplazar por Lucide si se prefiere.
- **Dependencias**: solo `@rive-app/canvas-lite` (animaciones). Dev: `typescript`, `vite`.
