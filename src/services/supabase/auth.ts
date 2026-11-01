/* Autenticación y perfil del usuario (Supabase Auth por REST). */
import { BACKEND } from '@/core/config';
import { bus } from '@/core/events';
import type { UserProfile, UserRole } from '@/types';
import {
  type AuthResponse, SbError, getSession, onSessionChange, request, rpc, select, setSession, toSession,
} from './client';

let profile: UserProfile | null = null;

export const authEnabled = (): boolean => BACKEND.enabled;
export const currentProfile = (): UserProfile | null => profile;
export const isLoggedIn = (): boolean => !!getSession();
export const isAdmin = (): boolean => profile?.role === 'admin';
export const canEdit = (): boolean => profile?.role === 'admin' || profile?.role === 'editor';

interface ProfileRow {
  id: string; email: string; name: string; role: UserRole;
  favorite_teams: string[] | null; favorite_players: string[] | null;
}

const fromRow = (r: ProfileRow): UserProfile => ({
  id: r.id, email: r.email, name: r.name || r.email.split('@')[0], role: r.role,
  favoriteTeams: r.favorite_teams ?? [], favoritePlayers: r.favorite_players ?? [],
});

export async function loadProfile(): Promise<UserProfile | null> {
  const s = getSession();
  if (!s || !BACKEND.enabled) { profile = null; return null; }
  try {
    const rows = await select<ProfileRow>('profiles', `select=*&id=eq.${s.userId}`);
    profile = rows[0] ? fromRow(rows[0]) : null;
  } catch {
    profile = null; // sin red o sin tabla: la sesión sigue, pero sin rol
  }
  bus.emit('session', undefined);
  return profile;
}

export async function signIn(email: string, password: string): Promise<void> {
  const r = (await request('/auth/v1/token?grant_type=password', {
    method: 'POST', auth: false, body: JSON.stringify({ email, password }),
  }).catch((e) => {
    if (e instanceof SbError && e.status === 400) throw new SbError(400, 'bad_credentials', 'Email o contraseña incorrectos.');
    throw e;
  })) as AuthResponse;
  setSession(toSession(r));
  await loadProfile();
}

/** Devuelve true si quedó con sesión iniciada; false si Supabase pide confirmar el email primero. */
export async function signUp(email: string, password: string, name: string): Promise<boolean> {
  const r = (await request('/auth/v1/signup', {
    method: 'POST', auth: false, body: JSON.stringify({ email, password, data: { name } }),
  })) as AuthResponse;
  if (!r.access_token) return false;
  setSession(toSession(r));
  await loadProfile();
  return true;
}

export async function signOut(): Promise<void> {
  const s = getSession();
  setSession(null);
  profile = null;
  bus.emit('session', undefined);
  if (s) request('/auth/v1/logout', { method: 'POST', headers: { Authorization: `Bearer ${s.access}` }, auth: false }).catch(() => {});
}

export async function updateProfile(patch: Partial<Pick<UserProfile, 'name' | 'favoriteTeams' | 'favoritePlayers'>>): Promise<void> {
  if (!profile) return;
  const next = { ...profile, ...patch };
  // PATCH (no upsert): el servidor solo deja cambiar nombre y favoritos, nunca el rol.
  await request(`/rest/v1/${BACKEND.tablePrefix}profiles?id=eq.${profile.id}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ name: next.name, favorite_teams: next.favoriteTeams, favorite_players: next.favoritePlayers }),
  });
  profile = next;
  bus.emit('session', undefined);
}

export async function listUsers(): Promise<UserProfile[]> {
  return (await select<ProfileRow>('profiles', 'select=*&order=created_at.desc')).map(fromRow);
}

export async function setUserRole(id: string, role: UserRole): Promise<void> {
  await rpc('set_role', { p_user: id, p_role: role }); // función SQL: solo admins, y no sobre uno mismo
}

onSessionChange(() => bus.emit('session', undefined));
