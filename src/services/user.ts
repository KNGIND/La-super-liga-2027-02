/* USUARIO: perfil, favoritos e historial de actividad.
   Con sesión en la nube se guarda en Supabase (lsl2_profiles). Sin sesión, en este dispositivo.
   Las pantallas solo usan esto: no saben dónde se guarda. */
import { bus } from '@/core/events';
import { kvGet, kvSet } from '@/services/storage/kv';
import { currentProfile, isLoggedIn, updateProfile } from '@/services/supabase/auth';
import { BACKEND } from '@/core/config';

export interface ActivityItem { at: string; text: string }
interface LocalProfile { name: string; favoriteTeams: string[]; favoritePlayers: string[] }

const K_PROFILE = 'user:local';
const K_ACT = 'user:activity';
let local: LocalProfile = { name: '', favoriteTeams: [], favoritePlayers: [] };
let activity: ActivityItem[] = [];

export async function initUser(): Promise<void> {
  local = { ...local, ...(await kvGet<Partial<LocalProfile>>(K_PROFILE, {})) };
  activity = await kvGet<ActivityItem[]>(K_ACT, []);
  bus.emit('session', undefined);
}

const cloud = (): boolean => BACKEND.enabled && isLoggedIn() && !!currentProfile();

export const userName = (): string => (cloud() ? currentProfile()!.name : local.name) || '';
export const favoriteTeams = (): string[] => (cloud() ? currentProfile()!.favoriteTeams : local.favoriteTeams);
export const favoritePlayers = (): string[] => (cloud() ? currentProfile()!.favoritePlayers : local.favoritePlayers);
export const getActivity = (): ActivityItem[] => activity;
export const initialOf = (): string => (userName().trim()[0] ?? '·').toUpperCase();

export function logActivity(text: string): void {
  activity = [{ at: new Date().toISOString(), text }, ...activity].slice(0, 50);
  void kvSet(K_ACT, activity);
  bus.emit('session', undefined);
}

async function save(patch: Partial<LocalProfile>): Promise<void> {
  if (cloud()) await updateProfile(patch);
  else {
    local = { ...local, ...patch };
    await kvSet(K_PROFILE, local);
    bus.emit('session', undefined);
  }
}

export const setName = (name: string): Promise<void> => save({ name: name.trim().slice(0, 30) });

export async function toggleFavoriteTeam(id: string, label: string): Promise<boolean> {
  const list = favoriteTeams();
  const on = !list.includes(id);
  await save({ favoriteTeams: on ? [...list, id] : list.filter((x) => x !== id) });
  logActivity(`${on ? 'Agregaste a favoritos' : 'Quitaste de favoritos'}: ${label}`);
  return on;
}

export async function toggleFavoritePlayer(id: string, label: string): Promise<boolean> {
  const list = favoritePlayers();
  const on = !list.includes(id);
  await save({ favoritePlayers: on ? [...list, id] : list.filter((x) => x !== id) });
  logActivity(`${on ? 'Agregaste a favoritos' : 'Quitaste de favoritos'}: ${label}`);
  return on;
}
