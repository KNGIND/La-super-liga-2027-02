/* DETALLE DE NOTICIA (pantalla completa) con botón de compartir. */
import { button } from '@/components/buttons';
import { emptyState } from '@/components/loaders';
import { toast } from '@/components/modals';
import type { ScreenFn } from '@/core/screen';
import { getData } from '@/services/data';
import { esc } from '@/utils/dom';
import { dateTime } from '@/utils/format';

const detail: ScreenFn = (ctx) => {
  ctx.view(() => {
    const n = getData().news.find((x) => x.id === ctx.params.id);
    if (!n) return emptyState('No encontramos la noticia', '', 'newspaper', '<a class="btn btn--primary" href="#/news">Ver noticias</a>');
    return `<article class="article">
      ${n.image ? `<img src="${esc(n.image)}" alt="">` : ''}
      <div class="row row--wrap"><span class="chip ${n.kind === 'announcement' ? 'chip--accent' : ''}">${n.kind === 'announcement' ? 'Comunicado' : esc(n.category)}</span><small>${esc(dateTime(n.publishedAt))}</small></div>
      <h1>${esc(n.title)}</h1>
      ${n.summary ? `<p class="muted" style="font-size:var(--fs-lg)">${esc(n.summary)}</p>` : ''}
      <div class="article__body">${n.body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>
      <div>${button('Compartir', { icon: 'share', attrs: 'data-share' })}</div></article>`;
  });
  ctx.on('click', '[data-share]', async () => {
    const n = getData().news.find((x) => x.id === ctx.params.id);
    if (!n) return;
    const data = { title: n.title, text: n.summary || n.title, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); toast('Enlace copiado', 'success'); }
    } catch { /* cancelado */ }
  });
};
export default detail;
