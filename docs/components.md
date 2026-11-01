# Componentes compartidos

Todos devuelven **strings HTML** (sin framework) y se estilizan desde `src/styles/components.css`. Cambiás el componente → cambia en todas las pantallas que lo usan.

| Componente | Archivo | Se usa en |
|---|---|---|
| `matchCard` | `components/cards/match-card.ts` | Inicio, Partidos, Equipo, Búsqueda |
| `teamCard` | `components/cards/team-card.ts` | Equipos, Búsqueda |
| `playerCard` | `components/cards/player-card.ts` | Jugadores, Equipo, Búsqueda |
| `newsCard` | `components/cards/news-card.ts` | Inicio, Noticias, Búsqueda |
| `crest` | `components/cards/crest.ts` | Escudo circular de equipo |
| Botones | `components/buttons/index.ts` | Todas |
| Modales | `components/modals/index.ts` → `openModal`, `confirmDialog`, `toast` | Admin, Perfil, Pronósticos |
| Inputs | `components/inputs/index.ts` | Formularios (admin, login) |
| Cargas/estados | `components/loaders/index.ts` → esqueletos, `emptyState`, error | Todas |
| Encabezado | `components/header/index.ts` | Global |
| Navegación | `components/navigation/index.ts` | Barra inferior (celular) / lateral (tablet, PC) |
| Menú lateral | `components/sidebar/index.ts` | Global |
| Íconos | `components/icons.ts` → `icon('nombre', tamaño)` | Todas |

## Convenciones
- Escapá siempre texto de usuario con `esc()` (`utils/dom.ts`).
- No pongas colores fijos: usá variables (`var(--card)`, `var(--accent)`…).
- Usá `data-*` para enganchar eventos (`data-act="back"`), no clases de estilo.
- Estados: toda pantalla que carga datos debe contemplar vacío (`emptyState`), error y carga.
