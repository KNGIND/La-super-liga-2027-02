/* Botones. Todos los botones de la app salen de acá (clase .btn en styles/components.css). */
import { esc } from '@/utils/dom';
import { icon, type IconName } from '../icons';

export interface BtnOpts {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  attrs?: string;
  small?: boolean;
  block?: boolean;
  href?: string;
}

export function button(label: string, o: BtnOpts = {}): string {
  const cls = `btn btn--${o.variant ?? 'secondary'}${o.small ? ' btn--sm' : ''}${o.block ? ' btn--block' : ''}`;
  const inner = `${o.icon ? icon(o.icon, o.small ? 16 : 18) : ''}<span>${esc(label)}</span>`;
  return o.href
    ? `<a class="${cls}" href="${esc(o.href)}" ${o.attrs ?? ''}>${inner}</a>`
    : `<button type="button" class="${cls}" ${o.attrs ?? ''}>${inner}</button>`;
}

export const iconButton = (name: IconName, label: string, attrs = '', badge = ''): string =>
  `<button type="button" class="icon-btn" aria-label="${esc(label)}" ${attrs}>${icon(name, 22)}${badge}</button>`;

/** Pestañas tipo segmentado: items = [valor, texto]. */
export function segmented(items: Array<[string, string]>, active: string, attr = 'data-seg'): string {
  return `<div class="seg" role="tablist">${items
    .map(([v, t]) => `<button type="button" role="tab" class="seg__btn ${v === active ? 'is-on' : ''}" aria-selected="${v === active}" ${attr}="${esc(v)}">${esc(t)}</button>`)
    .join('')}</div>`;
}
