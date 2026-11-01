import type { Dataset, Player } from '@/types';
import { team } from '@/services/data/selectors';
import { esc } from '@/utils/dom';
import { crest } from './crest';

export function playerCard(d: Dataset, p: Player, extra = ''): string {
  const t = team(d, p.teamId);
  return `<a class="pc card" href="#/team/${esc(p.teamId)}" style="--team:${esc(t?.color ?? '#3b82f6')}">
    <span class="pc__num">${p.number}</span>
    <div class="pc__body"><b>${esc(p.name)}</b><small>${esc(t?.name ?? '')} · ${esc(p.pos || '—')}</small></div>
    ${extra}${crest(t, 28)}
  </a>`;
}
