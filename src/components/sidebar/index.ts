/* MENÚ LATERAL (☰): secciones secundarias, apariencia, rendimiento e instalación. */
import { APP } from '@/core/config';
import { closeLayer, openLayer } from '@/core/layers';
import { drawerFeatures, isActive } from '@/core/navigation';
import { navigate } from '@/core/router';
import { effectivePerf, getPrefs, setPrefs, type PerfChoice, type Theme } from '@/core/prefs';
import { canInstall, isStandalone, promptInstall } from '@/core/lifecycle';
import { FEATURES } from '@/features/registry';
import { getData } from '@/services/data';
import { isAdmin } from '@/services/supabase/auth';
import { isLive } from '@/services/data/selectors';
import { esc } from '@/utils/dom';
import { icon } from '../icons';
import { toast } from '../modals';

const THEMES: Array<[Theme, string, 'sun' | 'moon' | 'monitor']> = [['light', 'Claro', 'sun'], ['dark', 'Oscuro', 'moon'], ['system', 'Sistema', 'monitor']];
const PERFS: Array<[PerfChoice, string]> = [['auto', 'Auto'], ['eco', 'ECO'], ['balanced', 'BALANCED'], ['ultra', 'ULTRA']];
const PERF_HINT: Record<string, string> = {
  eco: 'Sin desenfoque, animaciones mínimas. Ideal para celulares de gama baja.',
  balanced: 'Transiciones suaves y desenfoque solo donde aporta.',
  ultra: 'Efectos avanzados y animaciones Rive. Para equipos potentes.',
};

export function openDrawer(): void {
  const d = getData();
  const p = getPrefs();
  const live = d.matches.filter(isLive).length;
  const admin = FEATURES.find((f) => f.id === 'admin')!;
  const adminLink = isAdmin() ? `<a class="drawer__link" href="#${admin.path}">${icon(admin.icon, 20)}<span>${esc(admin.title)}</span>${icon('chevron-right', 16, 'drawer__chev')}</a>` : '';
  const links = drawerFeatures()
    .map((f) => `<a class="drawer__link ${isActive(f) ? 'is-active' : ''}" href="#${f.path}">${icon(f.icon, 20)}<span>${esc(f.title)}</span>${icon('chevron-right', 16, 'drawer__chev')}</a>`)
    .join('');
  const el = document.createElement('div');
  el.className = 'layer drawer';
  el.innerHTML = `
    <div class="layer__backdrop" data-close></div>
    <aside class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menú">
      <div class="drawer__head">
        <div class="drawer__brand">
          ${d.league.logo ? `<img src="${esc(d.league.logo)}" alt="" width="40" height="40">` : `<span class="brand__mark brand__mark--lg">${icon('zap', 22)}</span>`}
          <div><b data-secret>${esc(d.league.name || APP.name)}</b><small>${esc(d.league.season)} · ${esc(APP.edition)}</small></div>
        </div>
        <button class="icon-btn" data-close aria-label="Cerrar menú">${icon('x', 22)}</button>
      </div>
      ${live ? `<a class="drawer__live" href="#/matches">${icon('zap', 16)} ${live} partido${live > 1 ? 's' : ''} en vivo ahora</a>` : ''}
      <nav class="drawer__links">${links}${adminLink}</nav>
      <div class="drawer__sec">
        <h4>Apariencia</h4>
        <div class="seg seg--full">${THEMES.map(([v, t, ic]) => `<button class="seg__btn ${p.theme === v ? 'is-on' : ''}" data-theme-set="${v}">${icon(ic, 16)} ${t}</button>`).join('')}</div>
        <h4>Rendimiento <small>${p.perf === 'auto' ? `(auto: ${effectivePerf().toUpperCase()})` : ''}</small></h4>
        <div class="seg seg--full">${PERFS.map(([v, t]) => `<button class="seg__btn ${p.perf === v ? 'is-on' : ''}" data-perf-set="${v}">${t}</button>`).join('')}</div>
        <p class="drawer__hint" data-perf-hint>${esc(PERF_HINT[effectivePerf()])}</p>
      </div>
      <div class="drawer__foot">
        ${!isStandalone() && canInstall() ? `<button class="btn btn--secondary btn--block" data-install>${icon('download', 18)}<span>Instalar la app</span></button>` : ''}
        <small>${esc(APP.tagline)}</small>
      </div>
    </aside>`;
  const layer = openLayer(el);
  const close = () => closeLayer(layer);
  let taps = 0, tapTimer: ReturnType<typeof setTimeout>;
  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-close]')) return close();
    const th = t.closest<HTMLElement>('[data-theme-set]');
    if (th) { setPrefs({ theme: th.dataset.themeSet as Theme }); return syncSeg(el); }
    const pf = t.closest<HTMLElement>('[data-perf-set]');
    if (pf) { setPrefs({ perf: pf.dataset.perfSet as PerfChoice }); return syncSeg(el); }
    if (t.closest('[data-install]')) { if (await promptInstall()) toast('¡Instalada!', 'success'); return close(); }
    if (t.closest('[data-secret]')) {
      // Acceso al panel de administración: 7 toques seguidos al nombre de la liga.
      taps++; clearTimeout(tapTimer); tapTimer = setTimeout(() => (taps = 0), 1500);
      if (taps >= 7) { taps = 0; navigate('/admin'); }
      return;
    }
  });
}

function syncSeg(el: HTMLElement): void {
  const p = getPrefs();
  el.querySelectorAll<HTMLElement>('[data-theme-set]').forEach((b) => b.classList.toggle('is-on', b.dataset.themeSet === p.theme));
  el.querySelectorAll<HTMLElement>('[data-perf-set]').forEach((b) => b.classList.toggle('is-on', b.dataset.perfSet === p.perf));
  const hint = el.querySelector('[data-perf-hint]');
  if (hint) hint.textContent = PERF_HINT[effectivePerf()];
}
