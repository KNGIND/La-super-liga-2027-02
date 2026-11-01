/* TARJETA DE PARTIDO — poca información a la vista; al tocarla abre el detalle completo.
   Si la cambiás acá, cambia en Inicio, Partidos, Equipo, Copas y Búsqueda. */
import type { Dataset, Match } from '@/types';
import { competitionById, isLive, team } from '@/services/data/selectors';
import { dayShort, startsIn, timeOf } from '@/utils/format';
import { esc } from '@/utils/dom';
import { crest } from './crest';

export interface MatchCardOpts {
  /** Mostrar fecha además de la hora (cuando la lista no está agrupada por día). */
  showDate?: boolean;
  /** Resaltar este equipo (favorito). */
  favoriteIds?: string[];
  /** Tarjeta más grande para destacados. */
  large?: boolean;
}

export function statusBadge(m: Match): string {
  if (m.status === 'live') return `<span class="badge badge--live"><i></i>En vivo${m.minute ? ` · ${m.minute}'` : ''}</span>`;
  if (m.status === 'paused') return `<span class="badge badge--live"><i></i>Descanso</span>`;
  if (m.status === 'finished') return `<span class="badge">Final</span>`;
  return `<span class="badge badge--soft">${esc(startsIn(m.kickoff) || timeOf(m.kickoff))}</span>`;
}

export function scoreBlock(m: Match): string {
  if (m.status === 'upcoming' || m.homeScore == null)
    return `<div class="mc__score mc__score--time"><b>${esc(timeOf(m.kickoff))}</b><small>hs</small></div>`;
  const pens = m.pens ? `<small class="mc__pens">Pen. ${esc(m.pens)}</small>` : '';
  return `<div class="mc__score ${isLive(m) ? 'is-live' : ''}"><b>${m.homeScore}</b><span>-</span><b>${m.awayScore}</b>${pens}</div>`;
}

export function matchCard(d: Dataset, m: Match, o: MatchCardOpts = {}): string {
  const h = team(d, m.homeId), a = team(d, m.awayId);
  const comp = competitionById(d, m.competitionId);
  const fav = o.favoriteIds ?? [];
  const label = [comp?.name, m.round].filter(Boolean).join(' · ');
  return `<a class="mc card ${o.large ? 'mc--large' : ''} ${isLive(m) ? 'mc--live' : ''}" href="#/match/${esc(m.id)}" aria-label="${esc(h?.name)} contra ${esc(a?.name)}">
    <div class="mc__top"><span class="mc__comp">${esc(label)}${o.showDate ? ` · ${esc(dayShort(m.kickoff))}` : ''}</span>${statusBadge(m)}</div>
    <div class="mc__row">
      <div class="mc__team ${fav.includes(m.homeId) ? 'is-fav' : ''}">${crest(h, o.large ? 48 : 38)}<span>${esc(h?.name ?? '—')}</span></div>
      ${scoreBlock(m)}
      <div class="mc__team ${fav.includes(m.awayId) ? 'is-fav' : ''}">${crest(a, o.large ? 48 : 38)}<span>${esc(a?.name ?? '—')}</span></div>
    </div>
  </a>`;
}
