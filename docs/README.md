# La Súper Liga 2027 — Documentación

App web (PWA) hecha con **HTML + CSS + TypeScript (sin frameworks)** y **Vite**. Se puede usar en el navegador, instalar como PWA y empaquetar como APK con Capacitor.

## Índice

| Documento | Para qué sirve |
|---|---|
| [development.md](development.md) | Cómo correr y probar la app (también desde Android) |
| [customization.md](customization.md) | **"¿Dónde cambio X?"** — colores, textos, navegación, tarjetas… |
| [architecture.md](architecture.md) | Cómo está organizado el código y cómo agregar una sección |
| [components.md](components.md) | Componentes compartidos (tarjetas, botones, modales…) |
| [supabase.md](supabase.md) | Base de datos, migraciones, roles, cómo ser admin |
| [android-apk.md](android-apk.md) | Generar el APK con Capacitor + compilación en la nube |
| [notificaciones-push.md](notificaciones-push.md) | Qué notificaciones hay hoy y qué falta para push real |
| [limitaciones.md](limitaciones.md) | Estado real, pendientes y límites conocidos (TV, navegadores) |

## Resumen en 30 segundos

- `src/styles/design-tokens.css` → colores, tamaños, tipografía, duraciones.
- `src/core/config.ts` → nombre, navegación, preferencias, reglas de puntos.
- `src/features/registry.ts` → lista de pantallas. Agregar una = carpeta nueva + 1 línea.
- `src/services/` → todo lo que habla con el exterior (Supabase, IndexedDB, notificaciones). Las pantallas nunca hacen consultas directas.
- `supabase/migrations/` → SQL para crear/actualizar la base.
