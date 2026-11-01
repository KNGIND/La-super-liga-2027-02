# Guía "¿Dónde cambio X?"

| Quiero cambiar… | Archivo | Detalle |
|---|---|---|
| **Colores del tema oscuro** | `src/styles/design-tokens.css` | Sección 1: `--bg`, `--surface`, `--card`, `--border`, `--text`, `--accent`… |
| **Colores del tema claro** | `src/styles/themes.css` | Mismos nombres de variable, dentro de `:root[data-theme='light']` |
| **Color de acento (azul)** | `--accent`, `--accent-strong`, `--accent-soft` en ambos archivos | |
| **Tipografía** | `design-tokens.css` | `--font`, `--font-display`, tamaños `--fs-*`, pesos `--fw-*` |
| **Radios, espaciados, alturas** | `design-tokens.css` | `--r-*`, `--sp-*`, ancho de la barra lateral `--rail-w` |
| **Duración de animaciones** | `design-tokens.css` | `--dur-fast`, `--dur`, `--dur-slow` |
| **Efectos por perfil ECO/BALANCED/ULTRA** | `src/styles/animations.css` | Bloques `html[data-perf="eco"] (y balanced, ultra)` (blur, sombras, animaciones) |
| **Perfil predeterminado** | `src/core/config.ts` → `DEFAULTS.perf` | `auto` elige según el dispositivo |
| **Nombre de la app / edición / lema** | `src/core/config.ts` → `APP` | |
| **Pestañas de abajo y orden** | `src/core/config.ts` → `NAV.tabs` | Máximo 5 recomendado |
| **Opciones del menú ☰** | `src/core/config.ts` → `NAV.drawer` | |
| **Apagar una sección** | `src/core/config.ts` → `NAV.disabled` | |
| **Íconos de las secciones** | `src/features/registry.ts` (campo `icon`) y `src/components/icons.ts` | Para un ícono nuevo, agregá su SVG a `icons.ts` |
| **Reglas de puntos de pronósticos** | `config.ts` → `SCORING` **y** `supabase/migrations/001_core.sql` (`lsl2_points`) | En modo nube manda el servidor |
| **Frecuencia de actualización** | `config.ts` → `DATA` | |
| **Funciones experimentales** | `config.ts` → `EXPERIMENTAL` | Navegación TV, toque secreto de admin |
| **Tarjeta de partido** | `src/components/cards/match-card.ts` + estilos `.mc` en `components.css` | Cambia en Inicio, Partidos, Equipo, etc. |
| **Tarjeta de equipo / jugador / noticia** | `src/components/cards/*.ts` | |
| **Escudos (círculos con siglas)** | `src/components/cards/crest.ts` | |
| **Botones** | `src/components/buttons/index.ts` + `.btn` en `components.css` | |
| **Modales, confirmaciones, avisos** | `src/components/modals/index.ts` | `openModal`, `confirmDialog`, `toast` |
| **Formularios** | `src/components/inputs/index.ts` | |
| **Encabezado** | `src/components/header/index.ts` | |
| **Barra inferior / lateral** | `src/components/navigation/index.ts` | |
| **Menú lateral** | `src/components/sidebar/index.ts` | |
| **Diseño por tamaño de pantalla** | `src/styles/responsive.css` | Cortes en 600 / 840 / 1200 / 1600 px |
| **Textos de una pantalla** | `src/features/<pantalla>/index.ts` | Los textos están en el propio archivo |
| **Datos de ejemplo** | `src/data/seed.json` (se regenera con `npm run seed`) | Solo se usan en modo local |
| **Conexión a Supabase** | `.env` y `config.ts` → `BACKEND` | Prefijo de tablas `lsl2_` |
| **Consultas a Supabase** | `src/services/data/` y `src/services/supabase/` | Nunca dentro de pantallas |
| **Campos del panel admin** | `src/features/admin/schemas.ts` | Una entidad = un bloque; agrega columnas y validaciones |
| **Ícono / nombre al instalar la PWA** | `public/manifest.webmanifest` y `public/icons/` | |
| **Caché offline** | `src/sw-template.js` | |
| **Animaciones Rive** | `public/rive/*.riv` + `src/animations/rive/index.ts` | Solo se cargan en perfil ULTRA |

## Cambiar un color paso a paso
1. Abrí `src/styles/design-tokens.css`.
2. Buscá `--accent` y poné el color nuevo.
3. Para el tema claro, hacé lo mismo en `src/styles/themes.css`.
4. Guardá: se actualiza toda la app. No hay colores fijos en los demás CSS.

## Agregar un tema nuevo
Copiá el bloque `[data-theme='light']` de `themes.css`, cambiá el nombre y los valores, y agregá la opción en `src/components/sidebar/index.ts` y en el tipo de `src/core/prefs.ts`.
