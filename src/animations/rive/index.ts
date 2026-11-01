/* RIVE (animaciones interactivas) — solo en perfil ULTRA y solo si existe el archivo .riv.
   - Dependencia: @rive-app/canvas-lite (liviana, ~170 KB; sin ella no se descarga nada). Se descarga SOLO cuando hace falta (import dinámico).
   - Archivos: poné tus animaciones en public/rive/ (por ejemplo public/rive/gol.riv).
     Este proyecto NO trae archivos .riv: hay que crearlos en https://rive.app y exportarlos.
   Uso desde una pantalla:  mountRive(el, 'gol.riv', { stateMachine: 'State Machine 1' })  */
import { EXPERIMENTAL } from '@/core/config';
import { effectivePerf, reducedMotion } from '@/core/prefs';

export interface RiveOptions { stateMachine?: string; autoplay?: boolean }

/* Tipos mínimos para no depender del paquete en tiempo de compilación. */
interface RiveInstance { cleanup(): void }
type RiveCtor = new (o: { src: string; canvas: HTMLCanvasElement; autoplay: boolean; stateMachines?: string; onLoadError?: () => void }) => RiveInstance;

export async function mountRive(host: HTMLElement, file: string, o: RiveOptions = {}): Promise<(() => void) | null> {
  if (!EXPERIMENTAL.rive || effectivePerf() !== 'ultra' || reducedMotion()) return null;
  const src = `${import.meta.env.BASE_URL}rive/${file}`;
  try {
    const head = await fetch(src, { method: 'HEAD' });
    if (!head.ok) return null; // no hay archivo: no mostramos nada
    // @ts-ignore — el paquete trae sus propios tipos cuando está instalado (npm install)
    const mod = (await import('@rive-app/canvas-lite')) as unknown as { Rive: RiveCtor };
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 440;
    host.appendChild(canvas);
    const r = new mod.Rive({ src, canvas, autoplay: o.autoplay ?? true, stateMachines: o.stateMachine, onLoadError: () => canvas.remove() });
    return () => { r.cleanup(); canvas.remove(); };
  } catch {
    return null; // paquete no instalado o error de carga: la app sigue igual
  }
}
