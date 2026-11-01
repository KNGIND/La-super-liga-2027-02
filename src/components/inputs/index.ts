/* Campos de formulario reutilizables (clase .field en styles/components.css). */
import { esc } from '@/utils/dom';

interface Base { name: string; label: string; hint?: string; required?: boolean; id?: string }

const wrap = (b: Base, control: string): string =>
  `<label class="field"><span class="field__label">${esc(b.label)}${b.required ? ' *' : ''}</span>${control}${b.hint ? `<small class="field__hint">${esc(b.hint)}</small>` : ''}</label>`;

export const textField = (b: Base & { value?: string | number; type?: string; placeholder?: string; autocomplete?: string; min?: number; max?: number }): string =>
  wrap(b, `<input class="input" name="${esc(b.name)}" type="${b.type ?? 'text'}" value="${esc(b.value ?? '')}" placeholder="${esc(b.placeholder ?? '')}" ${b.required ? 'required' : ''} ${b.autocomplete ? `autocomplete="${b.autocomplete}"` : ''} ${b.min != null ? `min="${b.min}"` : ''} ${b.max != null ? `max="${b.max}"` : ''} ${b.id ? `id="${b.id}"` : ''}>`);

export const textArea = (b: Base & { value?: string; rows?: number; placeholder?: string }): string =>
  wrap(b, `<textarea class="input" name="${esc(b.name)}" rows="${b.rows ?? 4}" placeholder="${esc(b.placeholder ?? '')}" ${b.required ? 'required' : ''}>${esc(b.value ?? '')}</textarea>`);

export const selectField = (b: Base & { value?: string; options: Array<[string, string]> }): string =>
  wrap(b, `<select class="input" name="${esc(b.name)}" ${b.required ? 'required' : ''}>${b.options.map(([v, t]) => `<option value="${esc(v)}" ${v === (b.value ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`);

export const colorField = (b: Base & { value?: string }): string =>
  wrap(b, `<span class="color-row"><input class="input input--color" type="color" value="${esc(b.value || '#3b82f6')}" data-color-for="${esc(b.name)}"><input class="input" name="${esc(b.name)}" value="${esc(b.value ?? '')}" placeholder="#RRGGBB" maxlength="7"></span>`);

export const checkField = (b: Base & { checked?: boolean }): string =>
  `<label class="check"><input type="checkbox" name="${esc(b.name)}" ${b.checked ? 'checked' : ''}><span class="check__box"></span><span>${esc(b.label)}</span></label>`;

export const toggle = (name: string, label: string, on: boolean, hint = ''): string =>
  `<label class="toggle-row"><span><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span><input type="checkbox" class="switch" name="${esc(name)}" data-pref="${esc(name)}" ${on ? 'checked' : ''}></label>`;

/** Lee un <form> o contenedor y devuelve {nombre: valor}. Los checkbox dan boolean. */
export function readForm(root: HTMLElement): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]').forEach((el) => {
    out[el.name] = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : el.value;
  });
  return out;
}

/** Sincroniza los <input type=color> con su campo de texto. Llamalo tras dibujar el formulario. */
export function bindColorFields(root: HTMLElement): void {
  root.querySelectorAll<HTMLInputElement>('[data-color-for]').forEach((c) => {
    const txt = root.querySelector<HTMLInputElement>(`input[name="${c.dataset.colorFor}"]`)!;
    c.addEventListener('input', () => (txt.value = c.value.toUpperCase()));
    txt.addEventListener('input', () => /^#[0-9a-f]{6}$/i.test(txt.value) && (c.value = txt.value));
  });
}
