/* Transiciones entre pantallas con la View Transitions API (si el navegador la tiene y el perfil no es ECO).
   Hoy la app usa una animación CSS simple (animations.css → view-in). Esto queda listo para usar en ULTRA. */
import { effectivePerf, reducedMotion } from '@/core/prefs';

export function withTransition(update: () => void): void {
  const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (d.startViewTransition && effectivePerf() === 'ultra' && !reducedMotion()) d.startViewTransition(update);
  else update();
}
