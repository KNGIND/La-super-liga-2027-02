/* ADMIN · ENTIDADES EDITABLES
   Cada entidad describe sus campos una sola vez y el panel arma solo la lista, el formulario,
   la validación y el borrado. Para agregar una pantalla de edición nueva: sumá una entidad acá.
   Los permisos reales los pone el servidor (RLS en supabase/migrations). */
import type { Dataset, EventType, Match, MatchEvent, LineupPlayer, TableName } from '@/types';
import { uid } from '@/utils/dom';
import { dateTime, fromLocalInput, toLocalInput } from '@/utils/format';
import { isHex } from '@/utils/color';

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'color' | 'datetime' | 'check' | 'events' | 'lineup' | 'image';

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  rows?: number;
  /** Opciones para 'select'. Se calculan al abrir el formulario (usan los datos actuales). */
  options?: (d: Dataset) => Array<[string, string]>;
  /** number: permite dejarlo vacío (queda null). */
  nullable?: boolean;
}

export interface Entity {
  table: TableName;
  tab: string;
  singular: string;
  plural: string;
  /** Roles que ven esta pestaña en modo nube. */
  roles: Array<'admin' | 'editor'>;
  fields: Field[];
  blank: (d: Dataset) => Record<string, unknown>;
  summary: (row: Record<string, unknown>, d: Dataset) => { title: string; sub: string };
  validate?: (row: Record<string, unknown>, d: Dataset) => string | null;
  /** Mensaje si borrar rompería otros datos. */
  inUse?: (id: string, d: Dataset) => string | null;
  sort?: (a: Record<string, unknown>, b: Record<string, unknown>) => number;
}

const teamOpts = (d: Dataset): Array<[string, string]> => d.teams.map((t) => [t.id, t.name]);
const name = (d: Dataset, id: unknown) => d.teams.find((t) => t.id === id)?.name ?? '—';

/* ---------- eventos y alineaciones como texto simple ----------
   Evento:      minuto | tipo | local o visitante | jugador      →  12 | gol | local | Marcos Aguirre
   Alineación:  número | nombre | posición                       →  10 | Franco Sosa | MED */
const EV_IN: Record<string, EventType> = { gol: 'goal', penal: 'pen_goal', autogol: 'own_goal', amarilla: 'yellow', roja: 'red', goal: 'goal', yellow: 'yellow', red: 'red' };
const EV_OUT: Record<EventType, string> = { goal: 'gol', pen_goal: 'penal', own_goal: 'autogol', yellow: 'amarilla', red: 'roja' };

export function eventsToText(evs: MatchEvent[]): string {
  return evs.map((e) => `${e.minute} | ${EV_OUT[e.type]} | ${e.side === 'home' ? 'local' : 'visitante'} | ${e.player}`).join('\n');
}
export function parseEvents(text: string): MatchEvent[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const [min, type, side, ...rest] = line.split('|').map((x) => x.trim());
    const t = EV_IN[type?.toLowerCase()];
    const s = /^l/i.test(side ?? '') ? 'home' : /^v/i.test(side ?? '') ? 'away' : '';
    if (!/^\d+$/.test(min ?? '') || !t || !s) throw new Error(`Evento, línea ${i + 1}: usá "minuto | gol/penal/autogol/amarilla/roja | local/visitante | jugador".`);
    return { minute: Number(min), type: t, side: s, player: rest.join('|') };
  });
}
export const lineupToText = (l: LineupPlayer[]): string => l.map((p) => `${p.number} | ${p.name}${p.pos ? ` | ${p.pos}` : ''}`).join('\n');
export function parseLineup(text: string): LineupPlayer[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const [n, nm, pos] = line.split('|').map((x) => x.trim());
    if (!/^\d+$/.test(n ?? '') || !nm) throw new Error(`Alineación, línea ${i + 1}: usá "número | nombre | posición".`);
    return { number: Number(n), name: nm, pos: pos ?? '' };
  });
}

/* ---------- entidades ---------- */
export const ENTITIES: Entity[] = [
  {
    table: 'matches', tab: 'matches', singular: 'partido', plural: 'Partidos', roles: ['admin', 'editor'],
    fields: [
      { name: 'competitionId', label: 'Competición', type: 'select', required: true, options: (d) => d.competitions.map((c) => [c.id, c.name]) },
      { name: 'round', label: 'Jornada / fase', type: 'text', hint: 'Ej.: Jornada 7, Semifinal, Final' },
      { name: 'leg', label: 'Ida / vuelta', type: 'select', options: () => [['', 'Partido único'], ['ida', 'Ida'], ['vuelta', 'Vuelta']] },
      { name: 'firstLeg', label: 'Resultado de la ida (si es vuelta)', type: 'text' },
      { name: 'homeId', label: 'Local', type: 'select', required: true, options: teamOpts },
      { name: 'awayId', label: 'Visitante', type: 'select', required: true, options: teamOpts },
      { name: 'kickoff', label: 'Fecha y hora', type: 'datetime', required: true },
      { name: 'status', label: 'Estado', type: 'select', options: () => [['upcoming', 'Por jugar'], ['live', 'En vivo'], ['paused', 'Descanso'], ['finished', 'Finalizado']] },
      { name: 'minute', label: 'Minuto (en vivo)', type: 'number' },
      { name: 'homeScore', label: 'Goles local', type: 'number', nullable: true },
      { name: 'awayScore', label: 'Goles visitante', type: 'number', nullable: true },
      { name: 'pens', label: 'Penales (local-visitante)', type: 'text', hint: 'Ej.: 5-4' },
      { name: 'stadium', label: 'Estadio', type: 'text' },
      { name: 'channelId', label: 'Canal de transmisión', type: 'select', options: (d) => [['', 'Sin canal'], ...d.channels.map((c) => [c.id, c.name] as [string, string])] },
      { name: 'room', label: 'Código de sala', type: 'text' },
      { name: 'homeFormation', label: 'Formación local', type: 'text', hint: 'Ej.: 4-3-3' },
      { name: 'homeLineup', label: 'Titulares locales', type: 'lineup', rows: 6, hint: 'Uno por línea: número | nombre | posición. El primero es el arquero.' },
      { name: 'awayFormation', label: 'Formación visitante', type: 'text' },
      { name: 'awayLineup', label: 'Titulares visitantes', type: 'lineup', rows: 6 },
      { name: 'events', label: 'Eventos', type: 'events', rows: 6, hint: 'Uno por línea: minuto | gol/penal/autogol/amarilla/roja | local/visitante | jugador' },
      { name: 'notes', label: 'Notas', type: 'textarea', rows: 2 },
    ],
    blank: (d) => ({
      id: uid('m'), seasonId: d.seasons.find((s) => s.current)?.id ?? d.seasons[0]?.id ?? 's1', competitionId: d.competitions[0]?.id ?? 'liga',
      round: '', leg: null, firstLeg: '', homeId: d.teams[0]?.id ?? '', awayId: d.teams[1]?.id ?? '',
      kickoff: new Date(Date.now() + 864e5).toISOString(), status: 'upcoming', minute: 0, homeScore: null, awayScore: null, pens: '',
      stadium: '', channelId: '', room: '', homeFormation: '', awayFormation: '', homeLineup: [], awayLineup: [], events: [], notes: '',
    }),
    summary: (r, d) => ({ title: `${name(d, r.homeId)} ${r.homeScore ?? ''}${r.homeScore != null ? '-' + r.awayScore : ' vs '} ${name(d, r.awayId)}`.replace(/\s+/g, ' '), sub: `${dateTime(r.kickoff as string)} · ${r.round || ''} · ${{ upcoming: 'Por jugar', live: 'EN VIVO', paused: 'Descanso', finished: 'Final' }[r.status as string]}` }),
    validate: (r) => {
      if (r.homeId === r.awayId) return 'El local y el visitante no pueden ser el mismo equipo.';
      if (!r.kickoff) return 'Falta la fecha y hora.';
      if (r.status === 'finished' && (r.homeScore == null || r.awayScore == null)) return 'Un partido finalizado necesita los dos resultados.';
      if (r.pens && !/^\d+\s*-\s*\d+$/.test(r.pens as string)) return 'Los penales se escriben así: 5-4.';
      return null;
    },
    sort: (a, b) => String(b.kickoff).localeCompare(String(a.kickoff)),
  },
  {
    table: 'teams', tab: 'teams', singular: 'equipo', plural: 'Equipos', roles: ['admin'],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'short', label: 'Sigla (3 letras)', type: 'text', required: true },
      { name: 'color', label: 'Color principal', type: 'color', required: true },
      { name: 'color2', label: 'Color secundario', type: 'color', required: true },
      { name: 'logo', label: 'Escudo (URL o imagen)', type: 'image' },
      { name: 'adjust', label: 'Ajuste de puntos', type: 'number', hint: 'Suma o resta puntos a la tabla (sanciones, premios).' },
    ],
    blank: () => ({ id: uid('t'), name: '', short: '', color: '#3B82F6', color2: '#FFFFFF', logo: '', adjust: 0 }),
    summary: (r) => ({ title: String(r.name), sub: `${r.short}` }),
    validate: (r) => (!isHex(String(r.color)) || !isHex(String(r.color2)) ? 'Los colores deben ser HEX (#RRGGBB).' : String(r.short).length > 5 ? 'La sigla es demasiado larga.' : null),
    inUse: (id, d) => (d.matches.some((m) => m.homeId === id || m.awayId === id) ? 'Este equipo tiene partidos. Borrá o cambiá esos partidos primero.' : null),
    sort: (a, b) => String(a.name).localeCompare(String(b.name)),
  },
  {
    table: 'players', tab: 'players', singular: 'jugador', plural: 'Jugadores', roles: ['admin'],
    fields: [
      { name: 'teamId', label: 'Equipo', type: 'select', required: true, options: teamOpts },
      { name: 'number', label: 'Número', type: 'number', required: true },
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'pos', label: 'Posición', type: 'select', options: () => [['POR', 'Arquero'], ['DEF', 'Defensor'], ['MED', 'Mediocampista'], ['DEL', 'Delantero'], ['', 'Sin definir']] },
    ],
    blank: (d) => ({ id: uid('p'), teamId: d.teams[0]?.id ?? '', number: 1, name: '', pos: 'MED' }),
    summary: (r, d) => ({ title: `${r.number}. ${r.name}`, sub: `${name(d, r.teamId)} · ${r.pos || '—'}` }),
    validate: (r, d) => (d.players.some((p) => p.id !== r.id && p.teamId === r.teamId && p.number === r.number) ? 'Ese número ya lo usa otro jugador del equipo.' : null),
    sort: (a, b) => String(a.name).localeCompare(String(b.name)),
  },
  {
    table: 'news', tab: 'news', singular: 'noticia', plural: 'Noticias y comunicados', roles: ['admin', 'editor'],
    fields: [
      { name: 'kind', label: 'Tipo', type: 'select', options: () => [['news', 'Noticia'], ['announcement', 'Comunicado']] },
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'category', label: 'Categoría', type: 'text', hint: 'Resultados, Análisis, Fichajes…' },
      { name: 'summary', label: 'Resumen', type: 'textarea', rows: 2 },
      { name: 'body', label: 'Texto', type: 'textarea', rows: 8, hint: 'Separá los párrafos con una línea en blanco.' },
      { name: 'image', label: 'Imagen (URL o archivo)', type: 'image' },
      { name: 'publishedAt', label: 'Publicar el', type: 'datetime', required: true, hint: 'Si ponés una fecha futura, se publica sola cuando llegue.' },
      { name: 'pinned', label: 'Destacada (aparece primero)', type: 'check' },
    ],
    blank: () => ({ id: uid('n'), kind: 'news', title: '', category: 'Noticias', summary: '', body: '', image: '', publishedAt: new Date().toISOString(), pinned: false }),
    summary: (r) => ({ title: String(r.title), sub: `${r.kind === 'announcement' ? 'Comunicado' : r.category} · ${dateTime(r.publishedAt as string)}` }),
    sort: (a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)),
  },
  {
    table: 'channels', tab: 'channels', singular: 'canal', plural: 'Transmisiones', roles: ['admin', 'editor'],
    fields: [
      { name: 'name', label: 'Nombre del canal', type: 'text', required: true },
      { name: 'logo', label: 'Logo (URL o imagen)', type: 'image' },
      { name: 'url', label: 'Enlace de la transmisión', type: 'text', hint: 'Opcional. Debe empezar con https://' },
    ],
    blank: () => ({ id: uid('c'), name: '', logo: '', url: '' }),
    summary: (r) => ({ title: String(r.name), sub: String(r.url || 'Sin enlace') }),
    validate: (r) => (r.url && !/^https:\/\//i.test(String(r.url)) ? 'El enlace tiene que empezar con https://' : null),
    inUse: (id, d) => (d.matches.some((m) => m.channelId === id) ? 'Hay partidos que usan este canal.' : null),
  },
  {
    table: 'sanctions', tab: 'sanctions', singular: 'sanción', plural: 'Sanciones', roles: ['admin', 'editor'],
    fields: [
      { name: 'player', label: 'Jugador', type: 'text', required: true },
      { name: 'teamId', label: 'Equipo', type: 'select', options: teamOpts },
      { name: 'type', label: 'Tipo', type: 'select', options: () => [['yellow', 'Amarillas acumuladas'], ['red', 'Roja'], ['injury', 'Lesión']] },
      { name: 'duration', label: 'Duración', type: 'text', hint: 'Ej.: 2 partidos' },
      { name: 'notes', label: 'Notas', type: 'text' },
    ],
    blank: (d) => ({ id: uid('s'), player: '', teamId: d.teams[0]?.id ?? '', type: 'yellow', duration: '1 partido', notes: '' }),
    summary: (r, d) => ({ title: String(r.player), sub: `${name(d, r.teamId)} · ${r.duration}` }),
  },
  {
    table: 'competitions', tab: 'competitions', singular: 'competición', plural: 'Competiciones', roles: ['admin'],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'kind', label: 'Tipo', type: 'select', options: () => [['liga', 'Liga'], ['copa', 'Copa'], ['amistoso', 'Amistosos']] },
    ],
    blank: () => ({ id: uid('comp'), name: '', kind: 'copa' }),
    summary: (r) => ({ title: String(r.name), sub: String(r.kind) }),
    inUse: (id, d) => (d.matches.some((m) => m.competitionId === id) ? 'Hay partidos en esta competición.' : null),
  },
  {
    table: 'seasons', tab: 'seasons', singular: 'temporada', plural: 'Temporadas', roles: ['admin'],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, hint: 'Ej.: Temporada 10' },
      { name: 'status', label: 'Estado', type: 'text', hint: 'En curso, Finalizada…' },
      { name: 'current', label: 'Es la temporada actual', type: 'check' },
    ],
    blank: () => ({ id: uid('s'), name: '', status: 'En curso', current: false }),
    summary: (r) => ({ title: String(r.name), sub: `${r.status}${r.current ? ' · actual' : ''}` }),
    inUse: (id, d) => (d.matches.some((m) => m.seasonId === id) ? 'Hay partidos en esta temporada.' : null),
  },
  {
    table: 'notifications', tab: 'notifications', singular: 'aviso', plural: 'Avisos', roles: ['admin', 'editor'],
    fields: [
      { name: 'kind', label: 'Tipo', type: 'select', options: () => [['announcement', 'Comunicado'], ['news', 'Noticia'], ['match', 'Partido'], ['result', 'Resultado']] },
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'body', label: 'Mensaje', type: 'textarea', rows: 3, required: true },
      { name: 'link', label: 'Enlace dentro de la app', type: 'text', hint: 'Ej.: /match/m22 o /news/n1 (opcional)' },
    ],
    blank: () => ({ id: uid('a'), kind: 'announcement', title: '', body: '', link: '', createdAt: new Date().toISOString() }),
    summary: (r) => ({ title: String(r.title), sub: dateTime(r.createdAt as string) }),
    sort: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
  },
];

/* ---------- convertir lo que escribe la persona al registro ---------- */
export function rowToForm(f: Field, v: unknown): string {
  if (f.type === 'datetime') return toLocalInput(String(v ?? ''));
  if (f.type === 'events') return eventsToText((v as MatchEvent[]) ?? []);
  if (f.type === 'lineup') return lineupToText((v as LineupPlayer[]) ?? []);
  return v == null ? '' : String(v);
}

export function formToValue(f: Field, raw: string | boolean): unknown {
  if (f.type === 'check') return !!raw;
  const s = String(raw).trim();
  if (f.type === 'number') return s === '' ? (f.nullable ? null : 0) : Number(s);
  if (f.type === 'datetime') return fromLocalInput(s);
  if (f.type === 'events') return parseEvents(s);
  if (f.type === 'lineup') return parseLineup(s);
  if (f.name === 'leg') return s || null;
  return typeof raw === 'string' && f.type !== 'textarea' ? s : raw;
}

export const entityOf = (tab: string): Entity | undefined => ENTITIES.find((e) => e.tab === tab);
export type { Match };
