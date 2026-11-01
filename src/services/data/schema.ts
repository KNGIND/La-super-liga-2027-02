/* Puente entre el modelo de la app (camelCase) y las tablas de Supabase (snake_case).
   Para agregar una tabla: sumala a TABLE_NAMES, crea el tipo en src/types y la migración SQL. */
import type { Dataset, TableName } from '@/types';

export const TABLE_NAMES: TableName[] = [
  'seasons', 'competitions', 'teams', 'players', 'matches', 'news', 'channels', 'sanctions', 'notifications',
];

/** Orden en que se piden las tablas. */
export const ORDER: Partial<Record<TableName, string>> = {
  matches: 'kickoff.asc',
  news: 'published_at.desc',
  notifications: 'created_at.desc',
};

export const snake = (s: string): string => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
export const camel = (s: string): string => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function toRow(obj: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[snake(k)] = v;
  return out;
}

export function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[camel(k)] = v;
  return out as T;
}

export function emptyDataset(): Dataset {
  return {
    league: {
      id: 1, name: 'La Súper Liga', short: 'LSL', season: 'Temporada 1', seasonStatus: 'En curso', tagline: '',
      info: '', rules: '', pointsWin: 3, pointsDraw: 1, pointsLoss: 0, zoneTop: 0, zoneBottom: 0, logo: '',
    },
    seasons: [], competitions: [], teams: [], players: [], matches: [], news: [], channels: [], sanctions: [], notifications: [],
  };
}

/** Rellena campos faltantes (datos viejos, imports incompletos) para que la UI nunca reciba undefined. */
export function normalizeDataset(raw: Partial<Dataset> | null | undefined): Dataset {
  const base = emptyDataset();
  const d = raw ?? {};
  return {
    league: { ...base.league, ...(d.league ?? {}) },
    seasons: d.seasons ?? [],
    competitions: d.competitions ?? [],
    teams: (d.teams ?? []).map((t) => ({ ...t, logo: t.logo ?? '', color: t.color ?? '#3b82f6', color2: t.color2 ?? '#ffffff', adjust: t.adjust ?? 0, short: t.short ?? (t.name ?? '').slice(0, 3).toUpperCase() })),
    players: d.players ?? [],
    matches: (d.matches ?? []).map((m) => ({
      ...m, round: m.round ?? '', leg: m.leg ?? null, firstLeg: m.firstLeg ?? '', minute: m.minute ?? 0, homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null, pens: m.pens ?? '', stadium: m.stadium ?? '', channelId: m.channelId ?? '', room: m.room ?? '',
      homeFormation: m.homeFormation ?? '', awayFormation: m.awayFormation ?? '', homeLineup: m.homeLineup ?? [], awayLineup: m.awayLineup ?? [],
      events: m.events ?? [], notes: m.notes ?? '',
    })),
    news: (d.news ?? []).map((n) => ({ ...n, kind: n.kind ?? ('news' as const), category: n.category ?? 'Noticias', summary: n.summary ?? '', body: n.body ?? '', image: n.image ?? '', pinned: n.pinned ?? false })),
    channels: d.channels ?? [],
    sanctions: d.sanctions ?? [],
    notifications: d.notifications ?? [],
  };
}
