# Desarrollo y pruebas

## Requisitos
Node 18+ y npm. En Android se puede usar **Termux** (`pkg install nodejs`) y editar con **Acode**.

## Comandos
```bash
npm install          # una sola vez
npm run dev          # servidor de desarrollo (http://localhost:5173)
npm run typecheck    # revisa tipos TypeScript
npm run build        # genera dist/ (incluye el service worker)
npm run preview      # sirve dist/ para probar la PWA real
npm run seed         # regenera src/data/seed.json desde scripts/legacy-data.json
```

## Probar desde el celular
1. En Termux: `npm run dev -- --host`.
2. Abrí `http://localhost:5173` en Chrome del mismo celular, o `http://IP-DEL-CELULAR:5173` desde otro dispositivo de la misma Wi‑Fi.
3. Para probar **instalación PWA y offline** usá `npm run build && npm run preview -- --host` (el service worker solo existe en el build).

## Sin instalar nada (solo Acode)
Podés editar los archivos y probarlos con cualquier servicio que compile Vite (StackBlitz, Codespaces, Vercel). Subí el proyecto a GitHub y Vercel lo compila solo (`npm run build`, carpeta `dist`).

## Variables de entorno
`.env` (ya incluido con la URL y la clave **anon** pública del proyecto Supabase anterior; las claves anon son públicas por diseño, protege la base el RLS):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
**Nunca** pongas la clave `service_role` en el proyecto.

Sin estas variables la app funciona en **modo local** (datos de ejemplo + cambios guardados en el dispositivo).

## Modos de datos
| Modo | Cuándo | Qué permite |
|---|---|---|
| `cloud` | Hay Supabase y existen las tablas `lsl2_*` | Todo, con cuentas y roles |
| `legacy` | Hay Supabase pero aún no corriste las migraciones | Lectura de los datos de la app anterior (`lsl_state`) |
| `local` | Sin Supabase / sin conexión inicial | Datos de ejemplo + borrador local |

## Lista de pruebas manuales
- Abrir cada pestaña, el menú ☰, búsqueda, notificaciones y perfil.
- Botón "atrás" de Android con el menú abierto: debe cerrar el menú, no salir.
- Cambiar tema (claro/oscuro/sistema) y perfil (ECO/BALANCED/ULTRA) desde el menú.
- Deslizar horizontalmente entre pestañas; verificar que no interfiere con scroll vertical ni con carruseles.
- Modo avión: debe aparecer la franja "Sin conexión" y seguir viendo datos guardados.
- Pronósticos: guardar uno en un partido próximo (en datos de ejemplo no hay partidos futuros: crealo desde Admin).
- Admin: crear/editar/borrar un partido, ver validaciones.
