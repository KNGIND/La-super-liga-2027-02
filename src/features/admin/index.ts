/* PANEL DE ADMINISTRACIÓN
   - Modo nube: solo entran cuentas con rol admin/editor. El servidor igual verifica cada escritura (RLS).
   - Modo local: contraseña local (protege contra curiosos, NO es seguridad real: los datos son un borrador de este dispositivo).
   - Modo legacy (app vieja): solo lectura hasta correr las migraciones. */
import { segmented } from '@/components/buttons';
import { bindColorFields, checkField, colorField, readForm, selectField, textArea, textField } from '@/components/inputs';
import { emptyState, notice } from '@/components/loaders';
import { confirmDialog, openModal, toast } from '@/components/modals';
import { icon } from '@/components/icons';
import type { ScreenFn } from '@/core/screen';
import { canWrite, deleteRow, exportDataset, getData, getStatus, importDataset, refresh, resetLocal, saveLeague, saveRow } from '@/services/data';
import { settleLocal } from '@/services/data/predictions';
import { kvGet, kvSet } from '@/services/storage/kv';
import { currentProfile, listUsers, setUserRole } from '@/services/supabase/auth';
import { SbError, rpc } from '@/services/supabase/client';
import type { Dataset, League, UserProfile, UserRole } from '@/types';
import { downloadText, esc, pickFile } from '@/utils/dom';
import { resizeImage } from '@/utils/image';
import { ENTITIES, entityOf, formToValue, rowToForm, type Entity, type Field } from './schemas';

/* ---------- contraseña local ---------- */
let unlocked = false;
async function hash(s: string): Promise<string> {
  if (crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lsl27:' + s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; // http sin https: no hay crypto.subtle → hash simple (solo cosmético)
  for (const c of 'lsl27:' + s) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return 'x' + h;
}

/* ---------- formulario genérico ---------- */
function fieldHtml(f: Field, v: unknown, d: Dataset): string {
  const val = rowToForm(f, v);
  const base = { name: f.name, label: f.label, required: f.required, hint: f.hint };
  switch (f.type) {
    case 'select': return selectField({ ...base, value: val, options: f.options!(d) });
    case 'textarea': case 'events': case 'lineup': return textArea({ ...base, value: val, rows: f.rows });
    case 'number': return textField({ ...base, value: val, type: 'number' });
    case 'datetime': return textField({ ...base, value: val, type: 'datetime-local' });
    case 'color': return colorField({ ...base, value: val });
    case 'check': return checkField({ ...base, checked: !!v });
    case 'image': return `<div class="field"><span class="field__label">${esc(f.label)}</span><div class="color-row"><input class="input" name="${esc(f.name)}" value="${esc(val.startsWith('data:') ? '(imagen cargada)' : val)}" data-imgurl placeholder="https://… o subí un archivo"><label class="btn btn--sm" style="align-self:center">${icon('upload', 16)}<input type="file" accept="image/*" hidden data-img="${esc(f.name)}"></label></div>${val.startsWith('data:') ? `<img src="${esc(val)}" alt="" style="max-height:64px;margin-top:8px;border-radius:8px">` : ''}</div>`;
    default: return textField({ ...base, value: val });
  }
}

function openEntityForm(e: Entity, original: Record<string, unknown> | null, onSaved: () => void): void {
  const d = getData();
  const row = original ?? e.blank(d);
  const images: Record<string, string> = {};
  const { el } = openModal({
    title: `${original ? 'Editar' : 'Nuevo'} ${e.singular}`,
    wide: true,
    body: `<form class="form-grid" data-form novalidate>${e.fields.map((f) => `<div style="${['textarea', 'events', 'lineup', 'image'].includes(f.type) ? 'grid-column:1/-1' : ''}">${fieldHtml(f, row[f.name], d)}</div>`).join('')}</form><p class="form-error" data-err role="alert" hidden></p>`,
    actions: [
      { label: 'Cancelar', variant: 'ghost' },
      {
        label: 'Guardar', variant: 'primary',
        onClick: async (m) => {
          const err = m.querySelector<HTMLElement>('[data-err]')!;
          const raw = readForm(m.querySelector('[data-form]')!);
          const next: Record<string, unknown> = { ...row };
          try {
            for (const f of e.fields) {
              if (f.type === 'image') { next[f.name] = images[f.name] ?? (String(raw[f.name]).startsWith('(imagen') ? row[f.name] : String(raw[f.name]).trim()); continue; }
              if (f.required && typeof raw[f.name] === 'string' && !String(raw[f.name]).trim()) throw new Error(`Falta completar: ${f.label}.`);
              next[f.name] = formToValue(f, raw[f.name]);
            }
            const bad = e.validate?.(next, d);
            if (bad) throw new Error(bad);
            await saveRow(e.table, next as never);
            toast('Guardado', 'success');
            onSaved();
          } catch (x) {
            err.hidden = false;
            err.textContent = x instanceof SbError ? x.friendly : (x as Error).message;
            return false;
          }
        },
      },
    ],
    onMount: (m) => {
      bindColorFields(m);
      m.addEventListener('change', async (ev) => {
        const inp = ev.target as HTMLInputElement;
        if (!inp.dataset.img || !inp.files?.[0]) return;
        try {
          images[inp.dataset.img] = await resizeImage(inp.files[0], inp.dataset.img === 'image' ? 900 : 256);
          (m.querySelector(`[name="${inp.dataset.img}"]`) as HTMLInputElement).value = '(imagen cargada)';
          toast('Imagen lista', 'success');
        } catch (x) { toast((x as Error).message, 'error'); }
      });
    },
  });
  void el;
}

/* ---------- pantalla ---------- */
const admin: ScreenFn = (ctx) => {
  let tab = 'matches';
  let msg = '';
  let users: UserProfile[] | null = null;

  const roleOk = (e: Entity): boolean => {
    const st = getStatus();
    if (st.mode !== 'cloud') return true;
    const r = currentProfile()?.role;
    return !!r && r !== 'user' && e.roles.includes(r as 'admin' | 'editor');
  };

  ctx.view(() => {
    const st = getStatus();
    const prof = currentProfile();
    const d = getData();

    if (st.mode === 'cloud' && (!prof || prof.role === 'user'))
      return `<div class="card gate">${icon('lock', 28)}<h2>Acceso restringido</h2><p class="muted">${prof ? 'Tu cuenta no tiene permisos de administración.' : 'Iniciá sesión con una cuenta de administrador.'}</p><a class="btn btn--primary" href="#/profile">Ir a mi perfil</a></div>`;

    if (st.mode === 'local' && !unlocked) {
      const has = ctx.el.dataset.hasPass === '1';
      return `<form class="card gate" data-gate>${icon('lock', 28)}<h2>${has ? 'Panel de administración' : 'Creá una contraseña local'}</h2>
        <p class="muted">${has ? 'Escribí la contraseña de este dispositivo.' : 'Protege el panel en este dispositivo. Los cambios que hagas quedan como borrador local.'}</p>
        <label class="field"><span class="field__label">Contraseña</span><input class="input" type="password" name="p" autocomplete="${has ? 'current-password' : 'new-password'}" required minlength="4"></label>
        <p class="form-error" data-gate-err hidden></p><button class="btn btn--primary" type="submit">${has ? 'Entrar' : 'Crear y entrar'}</button></form>`;
    }

    const isAdm = st.mode !== 'cloud' || prof?.role === 'admin';
    const tabs: Array<[string, string]> = [
      ...ENTITIES.filter(roleOk).map((e) => [e.tab, e.plural] as [string, string]),
      ...(isAdm ? [['league', 'La liga'], ['predictions', 'Pronósticos']] as Array<[string, string]> : []),
      ...(st.mode === 'cloud' && isAdm ? [['users', 'Usuarios y roles']] as Array<[string, string]> : []),
      ['data', 'Datos'],
    ];
    if (!tabs.some(([t]) => t === tab)) tab = tabs[0][0];
    const ro = !canWrite();
    const head = `<div class="page-head"><h1>Administración</h1>
      ${ro ? notice('Solo lectura: los datos vienen de la app anterior. Ejecutá supabase/migrations/001_core.sql y 002_import_legacy.sql para poder editar.', 'warn') : ''}
      ${msg ? notice(msg, 'info') : ''}
      <div class="adm-tabs">${segmented(tabs, tab, 'data-tab')}</div></div>`;

    const e = entityOf(tab);
    if (e) {
      const list = (d[e.table] as unknown as Array<Record<string, unknown>>).slice();
      if (e.sort) list.sort(e.sort);
      return head + `<div class="adm-bar"><small>${list.length} ${e.plural.toLowerCase()}</small><button class="btn btn--primary btn--sm" data-new ${ro ? 'disabled' : ''}>${icon('plus', 16)} Nuevo ${e.singular}</button></div>
        ${list.length ? `<div class="stack stack--sm">${list.map((r) => {
          const s = e.summary(r, d);
          const live = e.table === 'matches' && (r.status === 'live' || r.status === 'paused');
          return `<div class="card adm-row"><div class="adm-row__main"><b>${esc(s.title)}</b><small>${esc(s.sub)}</small>
            ${live ? `<div class="row row--wrap mt-2"><button class="btn btn--sm" data-quick="${esc(r.id)}|home">+1 local</button><button class="btn btn--sm" data-quick="${esc(r.id)}|away">+1 visitante</button><button class="btn btn--sm btn--primary" data-quick="${esc(r.id)}|end">Finalizar</button></div>` : ''}</div>
            <div class="adm-row__acts"><button class="icon-btn" data-edit="${esc(r.id)}" aria-label="Editar" ${ro ? 'disabled' : ''}>${icon('pencil', 18)}</button><button class="icon-btn" data-del="${esc(r.id)}" aria-label="Borrar" ${ro ? 'disabled' : ''}>${icon('trash', 18)}</button></div></div>`;
        }).join('')}</div>` : emptyState(`No hay ${e.plural.toLowerCase()}`, 'Creá el primero con el botón de arriba.', 'database')}`;
    }

    if (tab === 'league') {
      const L = d.league;
      const f = (name: keyof League, label: string, type = 'text') => textField({ name, label, value: L[name] as string | number, type });
      return head + `<form class="card card--pad" data-league novalidate><div class="form-grid">${f('name', 'Nombre de la liga')}${f('short', 'Sigla')}${f('season', 'Temporada')}${f('seasonStatus', 'Estado de la temporada')}${f('pointsWin', 'Puntos por victoria', 'number')}${f('pointsDraw', 'Puntos por empate', 'number')}${f('pointsLoss', 'Puntos por derrota', 'number')}${f('zoneTop', 'Equipos en zona de clasificación', 'number')}${f('zoneBottom', 'Equipos en zona de descenso', 'number')}${f('tagline', 'Lema')}</div>
        ${textArea({ name: 'info', label: 'Información de la liga', value: L.info, rows: 4 })}${textArea({ name: 'rules', label: 'Reglamento', value: L.rules, rows: 6 })}${textField({ name: 'logo', label: 'Logo (URL)', value: L.logo.startsWith('data:') ? '' : L.logo })}
        <p class="form-error" data-err hidden></p><button class="btn btn--primary" type="submit" ${ro ? 'disabled' : ''}>Guardar cambios</button></form>`;
    }

    if (tab === 'predictions')
      return head + `<div class="card card--pad stack"><h3>Cálculo de puntos</h3><p class="muted">${st.mode === 'cloud' ? 'En modo nube, los puntos los calcula el servidor automáticamente cuando un partido pasa a "Finalizado" (trigger SQL). Si corregiste un resultado, podés recalcular todo.' : 'En modo local los puntos se calculan en este dispositivo.'}</p>
        <button class="btn btn--primary" data-settle>${icon('refresh', 18)} Recalcular puntos</button></div>`;

    if (tab === 'users') {
      if (!users) { void listUsers().then((u) => { users = u; ctx.refresh(); }).catch((x) => { msg = x instanceof SbError ? x.friendly : 'No se pudo cargar usuarios.'; users = []; ctx.refresh(); }); return head + '<div class="center mt-6"><span class="spinner"></span></div>'; }
      return head + (users.length ? `<div class="stack stack--sm">${users.map((u) => `<div class="card adm-row"><div class="adm-row__main"><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div><select class="input" style="width:auto" data-role="${esc(u.id)}" ${u.id === prof?.id ? 'disabled' : ''}>${(['user', 'editor', 'admin'] as UserRole[]).map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`).join('')}</div>` : emptyState('Sin usuarios', '', 'users'));
    }

    return head + `<div class="stack">
      <div class="card card--pad"><h3>Estado</h3><p class="muted mt-2">Modo: <b>${st.mode}</b> · Origen: <b>${st.origin}</b>${st.error ? ` · <span style="color:var(--danger)">${esc(st.error)}</span>` : ''}</p></div>
      <div class="card card--pad stack"><h3>Respaldo</h3><p class="muted">Exportá todos los datos a un archivo JSON, o importá uno (reemplaza lo actual).</p><div class="row row--wrap"><button class="btn" data-export>${icon('download', 18)} Exportar</button><button class="btn" data-import ${ro ? 'disabled' : ''}>${icon('upload', 18)} Importar</button><button class="btn" data-csv>${icon('download', 18)} Partidos (CSV)</button></div></div>
      ${st.mode === 'local' ? `<div class="card card--pad stack"><h3>Borrador local</h3><p class="muted">Tus cambios están solo en este dispositivo. Exportá el respaldo para no perderlos.</p><button class="btn btn--danger" data-reset>Descartar cambios locales</button></div>` : `<button class="btn" data-sync>${icon('refresh', 18)} Sincronizar ahora</button>`}</div>`;
  }, { on: ['data', 'session'] });

  const fresh = () => ctx.refresh();
  void kvGet('admin:pass', '').then((h) => { ctx.el.dataset.hasPass = h ? '1' : '0'; if (getStatus().mode === 'local' && !unlocked) fresh(); });

  ctx.on('submit' as 'click', '[data-gate]', async (form, ev) => {
    ev.preventDefault();
    const p = String(new FormData(form as HTMLFormElement).get('p') ?? '');
    const err = form.querySelector<HTMLElement>('[data-gate-err]')!;
    const stored = await kvGet('admin:pass', '');
    const h = await hash(p);
    if (stored && stored !== h) { err.hidden = false; err.textContent = 'Contraseña incorrecta.'; return; }
    if (p.length < 4) { err.hidden = false; err.textContent = 'Mínimo 4 caracteres.'; return; }
    if (!stored) await kvSet('admin:pass', h);
    unlocked = true; fresh();
  });
  ctx.on('click', '[data-tab]', (el) => { tab = el.dataset.tab!; msg = ''; fresh(); });
  ctx.on('click', '[data-new]', () => { const e = entityOf(tab); if (e) openEntityForm(e, null, fresh); });
  ctx.on('click', '[data-edit]', (el) => {
    const e = entityOf(tab); if (!e) return;
    const r = (getData()[e.table] as unknown as Array<Record<string, unknown>>).find((x) => x.id === el.dataset.edit);
    if (r) openEntityForm(e, r, fresh);
  });
  ctx.on('click', '[data-del]', async (el) => {
    const e = entityOf(tab); if (!e) return;
    const id = el.dataset.del!;
    const block = e.inUse?.(id, getData());
    if (block) return toast(block, 'error', 5000);
    if (!(await confirmDialog(`¿Borrar este ${e.singular}? No se puede deshacer.`, { danger: true, confirm: 'Borrar' }))) return;
    try { await deleteRow(e.table, id); toast('Borrado', 'success'); } catch (x) { toast(x instanceof SbError ? x.friendly : (x as Error).message, 'error', 5000); }
  });
  ctx.on('click', '[data-quick]', async (el) => {
    const [id, what] = el.dataset.quick!.split('|');
    const m = getData().matches.find((x) => x.id === id);
    if (!m) return;
    const next = { ...m };
    if (what === 'home') next.homeScore = (m.homeScore ?? 0) + 1;
    else if (what === 'away') next.awayScore = (m.awayScore ?? 0) + 1;
    else { next.status = 'finished'; next.homeScore ??= 0; next.awayScore ??= 0; }
    try { await saveRow('matches', next); } catch (x) { toast(x instanceof SbError ? x.friendly : (x as Error).message, 'error'); }
  });
  ctx.on('submit' as 'click', '[data-league]', async (form, ev) => {
    ev.preventDefault();
    const raw = readForm(form);
    const num = (k: string) => Math.max(0, Math.floor(Number(raw[k]) || 0));
    const err = form.querySelector<HTMLElement>('[data-err]')!;
    if (!String(raw.name).trim()) { err.hidden = false; err.textContent = 'La liga necesita un nombre.'; return; }
    try {
      await saveLeague({ name: String(raw.name).trim(), short: String(raw.short).trim(), season: String(raw.season).trim(), seasonStatus: String(raw.seasonStatus).trim(), tagline: String(raw.tagline).trim(), info: String(raw.info), rules: String(raw.rules), logo: String(raw.logo).trim() || getData().league.logo, pointsWin: num('pointsWin'), pointsDraw: num('pointsDraw'), pointsLoss: num('pointsLoss'), zoneTop: num('zoneTop'), zoneBottom: num('zoneBottom') });
      err.hidden = true; toast('Liga actualizada', 'success');
    } catch (x) { err.hidden = false; err.textContent = x instanceof SbError ? x.friendly : (x as Error).message; }
  });
  ctx.on('click', '[data-settle]', async () => {
    try { if (getStatus().mode === 'cloud') { await rpc('settle_all'); toast('Puntos recalculados', 'success'); } else { settleLocal(getData()); toast('Puntos locales recalculados', 'success'); } }
    catch (x) { toast(x instanceof SbError ? x.friendly : 'No se pudo recalcular', 'error'); }
  });
  ctx.on('change', '[data-role]', async (el) => {
    try { await setUserRole(el.dataset.role!, (el as HTMLSelectElement).value as UserRole); toast('Rol actualizado', 'success'); } catch (x) { toast(x instanceof SbError ? x.friendly : 'No se pudo cambiar el rol', 'error'); users = null; fresh(); }
  });
  ctx.on('click', '[data-export]', () => downloadText(`la-super-liga-${new Date().toISOString().slice(0, 10)}.json`, exportDataset()));
  ctx.on('click', '[data-csv]', () => {
    const d = getData(), q = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const nm = (id: string) => d.teams.find((t) => t.id === id)?.name ?? id;
    downloadText('partidos.csv', ['fecha,competicion,fase,local,goles_local,goles_visitante,visitante,estado', ...d.matches.map((m) => [m.kickoff, m.competitionId, m.round, nm(m.homeId), m.homeScore ?? '', m.awayScore ?? '', nm(m.awayId), m.status].map(q).join(','))].join('\n'), 'text/csv');
  });
  ctx.on('click', '[data-import]', async () => {
    const text = await pickFile('application/json,.json');
    if (!text) return;
    try {
      const obj = JSON.parse(text);
      if (!(await confirmDialog('Esto REEMPLAZA los datos actuales por los del archivo.', { danger: true, confirm: 'Importar' }))) return;
      await importDataset(obj); toast('Datos importados', 'success');
    } catch (x) { toast(x instanceof SyntaxError ? 'El archivo no es un JSON válido.' : x instanceof SbError ? x.friendly : (x as Error).message, 'error', 5000); }
  });
  ctx.on('click', '[data-reset]', async () => { if (await confirmDialog('Se borran tus cambios locales.', { danger: true })) { await resetLocal(); toast('Restaurado', 'success'); } });
  ctx.on('click', '[data-sync]', async () => toast((await refresh()) ? 'Sincronizado' : 'No se pudo sincronizar', 'info'));
};
export default admin;
