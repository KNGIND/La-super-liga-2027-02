/* Utilidades de DOM chiquitas. Nada de librerías. */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para meterlo en HTML. Usalo SIEMPRE con datos que vienen de usuarios o de la base. */
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

/** Delegación de eventos: escucha en `root` y llama a `fn` si el click cayó dentro de `sel`. */
export function delegate<K extends keyof HTMLElementEventMap>(
  root: HTMLElement,
  type: K,
  sel: string,
  fn: (target: HTMLElement, ev: HTMLElementEventMap[K]) => void,
): () => void {
  const h = (ev: Event) => {
    const t = (ev.target as Element | null)?.closest<HTMLElement>(sel);
    if (t && root.contains(t)) fn(t, ev as HTMLElementEventMap[K]);
  };
  root.addEventListener(type, h);
  return () => root.removeEventListener(type, h);
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): (...a: A) => void {
  let t: ReturnType<typeof setTimeout>;
  return (...a: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const uid = (prefix = 'id'): string =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Normaliza texto para buscar: sin tildes, minúsculas. */
export const norm = (s: string): string =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Descarga un archivo de texto desde el navegador. */
export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function pickFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.onchange = () => {
      const f = i.files?.[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsText(f);
    };
    i.click();
  });
}
