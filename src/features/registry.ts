/* REGISTRO DE SECCIONES
   ============================================================
   CÓMO AGREGAR UNA SECCIÓN NUEVA (3 pasos):
   1. Creá la carpeta  src/features/mi-seccion/  con un index.ts que exporte por defecto
      una función  (ctx: ScreenCtx) => void  que dibuje la pantalla.
   2. Sumá UNA entrada acá abajo.
   3. (Opcional) Ponela en la barra o el menú desde src/core/config.ts → NAV.
   Listo: no hay que tocar el router, la navegación ni el menú.
   ============================================================ */
import type { IconName } from '@/components/icons';
import type { ScreenFn } from '@/core/screen';

export interface Feature {
  id: string;
  /** Ruta. Soporta parámetros: '/match/:id'. */
  path: string;
  title: string;
  icon: IconName;
  /** Carga diferida: el código de la pantalla solo se descarga al abrirla. */
  load: () => Promise<{ default: ScreenFn }>;
  /** Pantalla completa sin barra inferior (detalle de partido, admin…). */
  immersive?: boolean;
  /** Solo para admins (se verifica también en el servidor con RLS). */
  adminOnly?: boolean;
}

export const FEATURES: Feature[] = [
  { id: 'home', path: '/', title: 'Inicio', icon: 'home', load: () => import('./home') },
  { id: 'matches', path: '/matches', title: 'Partidos', icon: 'calendar', load: () => import('./matches') },
  { id: 'match', path: '/match/:id', title: 'Partido', icon: 'calendar', immersive: true, load: () => import('./matches/detail') },
  { id: 'standings', path: '/standings', title: 'Tabla', icon: 'list', load: () => import('./standings') },
  { id: 'tournaments', path: '/tournaments', title: 'Copas y torneos', icon: 'trophy', load: () => import('./tournaments') },
  { id: 'teams', path: '/teams', title: 'Equipos', icon: 'shield', load: () => import('./teams') },
  { id: 'team', path: '/team/:id', title: 'Equipo', icon: 'shield', load: () => import('./teams/detail') },
  { id: 'players', path: '/players', title: 'Jugadores', icon: 'users', load: () => import('./players') },
  { id: 'squads', path: '/squads', title: 'Planteles', icon: 'clipboard', load: () => import('./squads') },
  { id: 'news', path: '/news', title: 'Noticias', icon: 'newspaper', load: () => import('./news') },
  { id: 'article', path: '/news/:id', title: 'Noticia', icon: 'newspaper', immersive: true, load: () => import('./news/detail') },
  { id: 'predictions', path: '/predictions', title: 'Pronósticos', icon: 'target', load: () => import('./predictions') },
  { id: 'profile', path: '/profile', title: 'Perfil', icon: 'user', load: () => import('./profile') },
  { id: 'search', path: '/search', title: 'Búsqueda', icon: 'search', load: () => import('./search') },
  { id: 'notifications', path: '/notifications', title: 'Notificaciones', icon: 'bell', load: () => import('./notifications') },
  { id: 'about', path: '/about', title: 'La liga', icon: 'info', load: () => import('./about') },
  { id: 'admin', path: '/admin', title: 'Administración', icon: 'database', adminOnly: true, load: () => import('./admin') },
];

export const featureById = (id: string): Feature | undefined => FEATURES.find((f) => f.id === id);
