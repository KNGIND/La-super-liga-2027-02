/* Reparte los 11 titulares en líneas según la formación ("4-3-3"). El primero de la lista es el arquero. */
import type { LineupPlayer } from '@/types';

export function formationRows(formation: string, players: LineupPlayer[]): LineupPlayer[][] | null {
  const counts = formation.split('-').map(Number);
  if (!counts.length || counts.some((n) => !n || n < 1) || players.length !== counts.reduce((a, b) => a + b, 0) + 1) return null;
  const rows: LineupPlayer[][] = [[players[0]]];
  let i = 1;
  for (const c of counts) { rows.push(players.slice(i, i + c)); i += c; }
  return rows; // [arquero, defensa, …, ataque]
}
