/* DETALLE DE PARTIDO — pantalla completa: resumen, alineaciones, estadísticas e info. */
import { segmented } from '@/components/buttons';
import { crest } from '@/components/cards/crest';
import { statusBadge } from '@/components/cards/match-card';
import { icon } from '@/components/icons';
import { emptyState } from '@/components/loaders';
import type { ScreenFn } from '@/core/screen';
import { getData } from '@/services/data';
import { channel, competitionById, team } from '@/services/data/selectors';
import type { Dataset, LineupPlayer, Match } from '@/types';
import { esc } from '@/utils/dom';
import { dateTime } from '@/utils/format';
import { formationRows } from '@/utils/lineup';

type Tab = 'summary' | 'lineups' | 'stats' | 'info';

function eventIcon(t: string): string {
  if (t === 'yellow') return '<i class="ev__ico ev__ico--yellow"></i>';
  if (t === 'red') return '<i class="ev__ico ev__ico--red"></i>';
  return `<i class="ev__ico ev__ico--goal">${icon('ball', 14)}</i>`;
}
const evLabel: Record<string, string> = { goal: '', pen_goal: ' (p)', own_goal: ' (en contra)', yellow: '', red: '' };

function summary(m: Match): string {
  const evs = m.events.slice().sort((a, b) => a.minute - b.minute);
  if (!evs.length) return emptyState(m.status === 'upcoming' ? 'El partido todavía no empezó' : 'Sin eventos registrados', '', 'clock');
  return `<div class="card card--pad timeline">${evs.map((e) => `
    <div class="ev ev--${e.side}"><div class="ev__txt">${eventIcon(e.type)}<span>${esc(e.player)}${evLabel[e.type] ?? ''}</span></div><span class="ev__min">${e.minute}'</span></div>`).join('')}</div>`;
}

function pitch(d: Dataset, m: Match, side: 'home' | 'away'): string {
  const t = team(d, side === 'home' ? m.homeId : m.awayId);
  const lineup: LineupPlayer[] = side === 'home' ? m.homeLineup : m.awayLineup;
  const formation = side === 'home' ? m.homeFormation : m.awayFormation;
  if (!lineup.length) return '';
  const rows = formationRows(formation, lineup);
  const style = `--c1:${esc(t?.color)};--c2:${esc(t?.color2)};--ink:#fff`;
  return `<section class="section"><div class="section__head"><h3 class="row">${crest(t, 28)} ${esc(t?.name)}</h3><span class="chip">${esc(formation || 'Sin formación')}</span></div>
    ${rows ? `<div class="pitch" style="${style}">${rows.map((r) => `<div class="pitch__line">${r.map((p) => `<div class="pp"><i>${p.number}</i><span>${esc(p.name)}</span></div>`).join('')}</div>`).join('')}</div>` : ''}
    <ul class="card card--pad lineup-list mt-3">${lineup.map((p) => `<li><b>${p.number}</b><span>${esc(p.name)}</span></li>`).join('')}</ul></section>`;
}

function stats(m: Match): string {
  const count = (side: 'home' | 'away', f: (t: string) => boolean) => m.events.filter((e) => e.side === side && f(e.type)).length;
  const rows: Array<[string, number, number]> = [
    ['Goles', m.homeScore ?? 0, m.awayScore ?? 0],
    ['Tarjetas amarillas', count('home', (t) => t === 'yellow'), count('away', (t) => t === 'yellow')],
    ['Tarjetas rojas', count('home', (t) => t === 'red'), count('away', (t) => t === 'red')],
  ];
  return `<div class="card card--pad">${rows.map(([l, a, b]) => {
    const tot = a + b || 1;
    return `<div class="stat"><b>${a}</b><div class="stat__mid"><span>${l}</span><div class="stat__bar"><i style="flex:${a / tot || 0.0001}"></i><i style="flex:${b / tot || 0.0001}"></i></div></div><b>${b}</b></div>`;
  }).join('')}</div><p class="faint mt-3"><small>Estadísticas calculadas a partir de los eventos cargados del partido.</small></p>`;
}

function info(d: Dataset, m: Match): string {
  const ch = channel(d, m.channelId);
  const comp = competitionById(d, m.competitionId);
  const row = (ic: Parameters<typeof icon>[0], label: string, val: string) => `<div class="info-row">${icon(ic, 20)}<div><small>${label}</small><b>${val}</b></div></div>`;
  return `<div class="card card--pad info-list">
    ${row('trophy', 'Competición', esc([comp?.name, m.round].filter(Boolean).join(' · ')))}
    ${row('clock', 'Fecha y hora', esc(dateTime(m.kickoff)))}
    ${m.stadium ? row('map-pin', 'Estadio', esc(m.stadium)) : ''}
    ${ch ? `<div class="info-row">${icon('tv', 20)}<div><small>Transmisión</small><b>${esc(ch.name)}</b></div>${ch.logo ? `<img src="${esc(ch.logo)}" alt="" style="margin-left:auto">` : ''}</div>` : ''}
    ${m.room ? row('lock', 'Código de sala', `<span class="code">${esc(m.room)}</span>`) : ''}
    ${m.firstLeg ? row('history', 'Resultado de la ida', esc(m.firstLeg)) : ''}
    ${m.notes ? row('info', 'Notas', esc(m.notes)) : ''}
  </div>`;
}

const detail: ScreenFn = (ctx) => {
  let tab: Tab = 'summary';
  ctx.view(() => {
    const d = getData();
    const m = d.matches.find((x) => x.id === ctx.params.id);
    if (!m) return emptyState('No encontramos el partido', 'Puede que se haya eliminado.', 'calendar', '<a class="btn btn--primary" href="#/matches">Ver partidos</a>');
    const h = team(d, m.homeId), a = team(d, m.awayId);
    const comp = competitionById(d, m.competitionId);
    const score = m.homeScore == null
      ? `<div class="md-score md-score--time">${esc(new Date(m.kickoff).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }))}</div>`
      : `<div class="md-score"><b>${m.homeScore}</b><span>-</span><b>${m.awayScore}</b></div>`;
    const body = tab === 'summary' ? summary(m)
      : tab === 'lineups' ? (pitch(d, m, 'home') + pitch(d, m, 'away') || emptyState('Alineaciones sin cargar', 'Todavía no se publicaron los titulares.', 'clipboard'))
      : tab === 'stats' ? stats(m) : info(d, m);
    return `
      <section class="card md-hero">
        <div class="md-hero__meta"><span class="chip">${esc(comp?.name)}</span>${m.round ? `<span class="chip">${esc(m.round)}</span>` : ''}${statusBadge(m)}</div>
        <div class="md-hero__row">
          <a class="md-team" href="#/team/${esc(m.homeId)}">${crest(h, 64)}<b>${esc(h?.name)}</b></a>
          <div>${score}${m.pens ? `<div class="md-pens">Penales ${esc(m.pens)}</div>` : ''}</div>
          <a class="md-team" href="#/team/${esc(m.awayId)}">${crest(a, 64)}<b>${esc(a?.name)}</b></a>
        </div>
      </section>
      <div class="md-tabs">${segmented([['summary', 'Resumen'], ['lineups', 'Alineaciones'], ['stats', 'Estadísticas'], ['info', 'Info']], tab, 'data-tab').replace('class="seg"', 'class="seg seg--full"')}</div>
      ${body}`;
  });
  ctx.on('click', '[data-tab]', (el) => { tab = el.dataset.tab as Tab; ctx.refresh(); });
};
export default detail;
