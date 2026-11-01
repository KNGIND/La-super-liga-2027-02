/* Escudo de equipo: imagen si tiene logo, o círculo con iniciales y sus colores. */
import type { Team } from '@/types';
import { esc } from '@/utils/dom';
import { ink } from '@/utils/color';

export function crest(t: Team | undefined, size = 36): string {
  if (!t) return `<span class="crest crest--empty" style="--s:${size}px">?</span>`;
  if (t.logo) return `<span class="crest" style="--s:${size}px"><img src="${esc(t.logo)}" alt="" loading="lazy" decoding="async" width="${size}" height="${size}"></span>`;
  const label = esc((t.short || t.name).slice(0, 3).toUpperCase());
  return `<span class="crest crest--text" style="--s:${size}px;--c1:${esc(t.color)};--c2:${esc(t.color2)};--ink:${ink(t.color)}" aria-hidden="true">${label}</span>`;
}
