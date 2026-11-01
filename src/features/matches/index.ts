/* PARTIDOS: calendario con filtros (próximos / en vivo / resultados / todos) y por competición. */
import { segmented } from '@/components/buttons';
import { matchCard } from '@/components/cards/match-card';
import { emptyState } from '@/components/loaders';
import type { ScreenFn } from '@/core/screen';
import { getData } from '@/services/data';
import { groupByDay, isLive, sortedMatches } from '@/services/data/selectors';
import { favoriteTeams } from '@/services/user';
import { esc } from '@/utils/dom';
import { dayLong, relativeDay, ts } from '@/utils/format';

type Tab = 'upcoming' | 'live' | 'results' | 'all';
const TABS: Array<[Tab, string]> = [['upcoming', 'Próximos'], ['live', 'En vivo'], ['results', 'Resultados'], ['all', 'Todos']];

const matches: ScreenFn = (ctx) => {
  const want = ctx.query.get('tab') as Tab | null;
  let tab: Tab = want && TABS.some(([t]) => t === want) ? want : 'upcoming';
  let comp = 'all';
  let onlyFav = false;
  let first = !want;

  ctx.view(() => {
    const d = getData();
    const all = sortedMatches(d);
    if (first) { // elige una pestaña útil la primera vez
      first = false;
      if (all.some(isLive)) tab = 'live';
      else if (!all.some((m) => m.status === 'upcoming')) tab = 'results';
    }
    const fav = favoriteTeams();
    let list = all.filter((m) => comp === 'all' || m.competitionId === comp);
    if (onlyFav && fav.length) list = list.filter((m) => fav.includes(m.homeId) || fav.includes(m.awayId));
    if (tab === 'upcoming') list = list.filter((m) => m.status === 'upcoming');
    if (tab === 'live') list = list.filter(isLive);
    if (tab === 'results') list = list.filter((m) => m.status === 'finished').reverse();
    const groups = groupByDay(list);
    const liveCount = all.filter(isLive).length;

    return `
      <div class="page-head">
        <h1>Partidos</h1>
        ${segmented(TABS.map(([t, l]) => [t, t === 'live' && liveCount ? `${l} (${liveCount})` : l] as [string, string]), tab, 'data-tab')}
        <div class="filters">
          ${segmented([['all', 'Todas'], ...d.competitions.map((c) => [c.id, c.name] as [string, string])], comp, 'data-comp')}
          ${fav.length ? `<button class="chip ${onlyFav ? 'chip--accent' : ''}" data-fav aria-pressed="${onlyFav}">★ Mis equipos</button>` : ''}
        </div>
      </div>
      ${groups.length ? groups.map((g) => `
        <div class="daylabel">${esc(relativeDay(g.iso))} <small>${esc(dayLong(g.iso))}</small></div>
        <div class="grid grid--2">${g.matches.map((m) => matchCard(d, m, { favoriteIds: fav })).join('')}</div>`).join('')
        : emptyState(tab === 'live' ? 'No hay partidos en vivo' : tab === 'upcoming' ? 'No hay partidos próximos' : 'Sin partidos para mostrar', 'Probá con otro filtro.', 'calendar')}
    `;
  });
  void ts;
  ctx.on('click', '[data-tab]', (el) => { tab = el.dataset.tab as Tab; ctx.refresh(); });
  ctx.on('click', '[data-comp]', (el) => { comp = el.dataset.comp!; ctx.refresh(); });
  ctx.on('click', '[data-fav]', () => { onlyFav = !onlyFav; ctx.refresh(); });
};
export default matches;
