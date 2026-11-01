/* JUGADORES: búsqueda y filtros por posición/equipo, con favoritos. */
import { segmented } from '@/components/buttons';
import { crest } from '@/components/cards/crest';
import { icon } from '@/components/icons';
import { emptyState } from '@/components/loaders';
import { toast } from '@/components/modals';
import type { ScreenFn } from '@/core/screen';
import { getData } from '@/services/data';
import { statsOfPlayer, team } from '@/services/data/selectors';
import { favoritePlayers, toggleFavoritePlayer } from '@/services/user';
import { esc, norm } from '@/utils/dom';

const players: ScreenFn = (ctx) => {
  let q = '', pos = 'all', teamId = 'all', favOnly = false;
  const draw = () => {
    const d = getData();
    const fav = favoritePlayers();
    const list = d.players
      .filter((p) => (pos === 'all' || p.pos === pos) && (teamId === 'all' || p.teamId === teamId) && (!favOnly || fav.includes(p.id)) && (!q || norm(p.name).includes(norm(q))))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 120);
    ctx.el.querySelector('[data-list]')!.innerHTML = list.length
      ? list.map((p) => {
          const t = team(d, p.teamId), s = statsOfPlayer(d, p.teamId, p.name), on = fav.includes(p.id);
          return `<div class="card pc" style="--team:${esc(t?.color)}"><span class="pc__num">${p.number}</span><a class="pc__body" href="#/team/${esc(p.teamId)}"><b>${esc(p.name)}</b><small>${esc(t?.name)} · ${esc(p.pos || '—')}${s.goals ? ` · ${s.goals} goles` : ''}</small></a>${crest(t, 28)}<button class="icon-btn fav-btn ${on ? 'is-on' : ''}" data-pfav="${esc(p.id)}" aria-pressed="${on}" aria-label="Favorito">${icon('star', 20)}</button></div>`;
        }).join('')
      : emptyState('No hay jugadores con esos filtros', '', 'users');
  };
  ctx.view(() => {
    const d = getData();
    return `<div class="page-head"><h1>Jugadores</h1>
      <div class="searchbar" style="position:static;margin:0"><input class="input" id="pl-q" type="search" placeholder="Buscar jugador" value="${esc(q)}" autocomplete="off">${icon('search', 18)}</div>
      ${segmented([['all', 'Todos'], ['POR', 'Arqueros'], ['DEF', 'Defensas'], ['MED', 'Medios'], ['DEL', 'Delanteros']], pos, 'data-pos')}
      <div class="filters"><select class="input" data-team style="max-width:240px"><option value="all">Todos los equipos</option>${d.teams.map((t) => `<option value="${esc(t.id)}" ${t.id === teamId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
      <button class="chip ${favOnly ? 'chip--accent' : ''}" data-favonly>★ Favoritos</button></div></div>
      <div class="grid grid--2" data-list></div>`;
  }, { on: ['data', 'session'], after: draw });
  ctx.on('input', '#pl-q', (el) => { q = (el as HTMLInputElement).value; draw(); });
  ctx.on('click', '[data-pos]', (el) => { pos = el.dataset.pos!; ctx.refresh(); });
  ctx.on('change', '[data-team]', (el) => { teamId = (el as HTMLSelectElement).value; ctx.refresh(); });
  ctx.on('click', '[data-favonly]', () => { favOnly = !favOnly; ctx.refresh(); });
  ctx.on('click', '[data-pfav]', async (el) => {
    const p = getData().players.find((x) => x.id === el.dataset.pfav);
    if (p) try { await toggleFavoritePlayer(p.id, p.name); } catch { toast('No se pudo guardar', 'error'); }
  });
};
export default players;
