import type { NewsItem } from '@/types';
import { esc } from '@/utils/dom';
import { timeAgo } from '@/utils/format';
import { icon } from '../icons';

export function newsCard(n: NewsItem, opts: { large?: boolean } = {}): string {
  const img = n.image ? `<img class="nc__img" src="${esc(n.image)}" alt="" loading="lazy" decoding="async">` : '';
  return `<a class="nc card ${opts.large ? 'nc--large' : ''} ${n.image ? 'has-img' : ''}" href="#/news/${esc(n.id)}">
    ${img}
    <div class="nc__body">
      <div class="nc__meta"><span class="chip ${n.kind === 'announcement' ? 'chip--accent' : ''}">${n.kind === 'announcement' ? icon('megaphone', 12) + ' Comunicado' : esc(n.category)}</span><small>${esc(timeAgo(n.publishedAt))}</small></div>
      <h3>${esc(n.title)}</h3>
      ${opts.large && n.summary ? `<p>${esc(n.summary)}</p>` : ''}
    </div>
  </a>`;
}
