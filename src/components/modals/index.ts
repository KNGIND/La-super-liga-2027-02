/* Modales, hojas inferiores, confirmaciones y avisos (toast).
   En celular se abren como hoja desde abajo; en pantallas grandes, centrados. */
import { closeLayer, openLayer, type Layer } from '@/core/layers';
import { esc } from '@/utils/dom';
import { icon } from '../icons';

export interface ModalAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Devolvé false para dejar el modal abierto (por ejemplo si hay un error de validación). */
  onClick?: (el: HTMLElement) => void | boolean | Promise<void | boolean>;
}

export interface ModalOpts {
  title: string;
  body: string;
  actions?: ModalAction[];
  /** Se llama con el elemento ya en pantalla (para enganchar eventos). */
  onMount?: (el: HTMLElement, close: () => void) => void;
  wide?: boolean;
}

export function openModal(o: ModalOpts): { el: HTMLElement; close: () => void } {
  const el = document.createElement('div');
  el.className = 'layer modal';
  el.innerHTML = `
    <div class="layer__backdrop" data-close></div>
    <section class="modal__panel ${o.wide ? 'modal__panel--wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
      <header class="modal__head"><h2>${esc(o.title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('x', 22)}</button></header>
      <div class="modal__body">${o.body}</div>
      ${o.actions?.length ? `<footer class="modal__foot">${o.actions.map((a, i) => `<button type="button" class="btn btn--${a.variant ?? 'secondary'}" data-act="${i}">${esc(a.label)}</button>`).join('')}</footer>` : ''}
    </section>`;
  let layer: Layer;
  const close = () => closeLayer(layer);
  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-close]')) return close();
    const b = t.closest<HTMLElement>('[data-act]');
    if (!b) return;
    const action = o.actions![Number(b.dataset.act)];
    b.setAttribute('disabled', '');
    try {
      const r = await action.onClick?.(el);
      if (r !== false) close();
    } finally {
      b.removeAttribute('disabled');
    }
  });
  layer = openLayer(el);
  o.onMount?.(el, close);
  return { el, close };
}

export function confirmDialog(message: string, o: { title?: string; confirm?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const done = (v: boolean) => { if (!answered) { answered = true; resolve(v); } };
    const { el } = openModal({
      title: o.title ?? 'Confirmar',
      body: `<p class="modal__text">${esc(message)}</p>`,
      actions: [
        { label: 'Cancelar', variant: 'ghost', onClick: () => void done(false) },
        { label: o.confirm ?? 'Aceptar', variant: o.danger ? 'danger' : 'primary', onClick: () => void done(true) },
      ],
    });
    new MutationObserver((_, obs) => { if (!el.isConnected) { done(false); obs.disconnect(); } }).observe(document.getElementById('layers')!, { childList: true });
  });
}

/* ---------- toast ---------- */
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string, kind: 'info' | 'success' | 'error' = 'info', ms = 3200): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.className = `toast toast--${kind} is-show`;
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove('is-show'), ms);
}
