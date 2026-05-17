// عبد سيف — Quotes Page
// User-curated motivational quotes. Random one shows on Dashboard each visit
// + scheduled push notifications throughout the day (handled in notifications.js).
import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, getLang, fmtDate } from '../i18n.js';
import { getState, upsert, remove } from '../store.js';
import { input, field, modal, toast, confirmDialog } from '../ui.js';

const ar = () => getLang() === 'ar';
const L = (a, e) => (ar() ? a : e);

// Seed list — only inserted if user has zero quotes saved yet.
const SEED = [
  { text: 'الحياة قصيرة جداً لتعيشها على هامش حياة غيرك.', author: 'مجهول' },
  { text: 'النجاح هو الذهاب من فشل إلى فشل دون أن تفقد حماسك.', author: 'تشرشل' },
  { text: 'كل يوم لا تتعلم فيه شيئاً جديداً هو يوم ضائع.', author: 'مجهول' },
  { text: 'أصعب جزء في أي مشروع هو البدء.', author: 'مارك توين' },
  { text: 'لا تقارن بدايتك بنهاية شخص آخر.', author: 'جون أكوف' }
];

export async function renderQuotes() {
  const root = el('div', {});
  const state = getState();

  // Seed once if empty
  if ((state.quotes || []).length === 0 && !localStorage.getItem('abdsaif:quotes:seeded')) {
    localStorage.setItem('abdsaif:quotes:seeded', '1');
    for (const q of SEED) {
      await upsert('quotes', { ...q, favorite: false });
    }
  }

  // Header
  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, L('عبارات وتذكيرات', 'Quotes & Reminders')),
      el('div', { class: 'page-header__subtitle' }, L('عبارات تظهر في الواجهة وتذكّرك على شكل إشعارات', 'Shown on the dashboard and pushed as notifications'))
    ),
    el('div', { class: 'page-header__actions' },
      Object.assign(el('button', { class: 'btn btn--primary', onClick: () => openQuoteModal() }),
        { innerHTML: icon('plus') + ' ' + L('عبارة جديدة', 'New quote') })
    )
  ));

  // List
  const list = el('div', { class: 'col gap-12' });
  const quotes = (state.quotes || []).slice().sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0));
  if (quotes.length === 0) {
    list.appendChild(el('div', { class: 'empty', style: { padding: '40px 20px' } },
      el('div', { class: 'empty__icon', html: icon('bulb') }),
      el('div', { class: 'empty__title' }, L('لا عبارات بعد', 'No quotes yet')),
      el('div', { class: 'empty__hint' }, L('أضف أول عبارة عجبتك لتظهر في الرئيسية', 'Add your first quote to see it on the dashboard'))
    ));
  } else {
    quotes.forEach((q) => list.appendChild(buildQuoteCard(q)));
  }
  root.appendChild(list);
  return root;
}

function buildQuoteCard(q) {
  const card = el('div', { class: 'glass panel' });
  card.style.position = 'relative';
  card.innerHTML = `
    <div style="font-size:32px; line-height:1; opacity:0.18; position:absolute; top:14px; inset-inline-start:18px;">"</div>
    <div style="font-size:15px; line-height:1.7; padding-inline-start:30px; margin-bottom:12px; white-space:pre-wrap;">${escapeHtml(q.text)}</div>
    <div class="row justify-between" style="margin-top:10px;">
      <div class="text-sm text-muted">${q.author ? '— ' + escapeHtml(q.author) : ''}</div>
      <div class="row gap-8">
        <button class="btn btn--ghost btn--sm" data-fav>
          ${icon(q.favorite ? 'star' : 'star_outline', { size: 16 })}
          ${q.favorite ? L('مفضلة', 'Favorite') : L('تفضيل', 'Favorite')}
        </button>
        <button class="btn btn--ghost btn--sm" data-edit>${icon('edit', { size: 16 })}</button>
        <button class="btn btn--ghost btn--sm" data-del>${icon('trash', { size: 16 })}</button>
      </div>
    </div>
  `;
  card.querySelector('[data-fav]').onclick = async () => {
    await upsert('quotes', { ...q, favorite: !q.favorite });
    toast(q.favorite ? L('أُزيل من المفضلة', 'Unfavorited') : L('أُضيف للمفضلة', 'Favorited'), 'success');
  };
  card.querySelector('[data-edit]').onclick = () => openQuoteModal(q);
  card.querySelector('[data-del]').onclick = async () => {
    if (!await confirmDialog(L('حذف هذه العبارة؟', 'Delete this quote?'))) return;
    await remove('quotes', q.id);
    toast(L('تم الحذف', 'Deleted'), 'success');
  };
  return card;
}

function openQuoteModal(existing) {
  const textT = el('textarea', {
    class: 'textarea',
    placeholder: L('اكتب العبارة هنا...', 'Type the quote here...'),
    style: { minHeight: '120px', fontSize: '14px', lineHeight: '1.6' }
  });
  if (existing) textT.value = existing.text;
  const authorI = input({ placeholder: L('القائل (اختياري)', 'Author (optional)'), value: existing?.author || '' });
  const m = modal({
    title: existing ? L('تعديل العبارة', 'Edit quote') : L('عبارة جديدة', 'New quote'),
    body: el('div', { class: 'col gap-12' },
      field(L('النص', 'Text'), textT),
      field(L('القائل', 'Author'), authorI)
    ),
    footer: [
      el('button', { class: 'btn', onClick: () => m.close() }, L('إلغاء', 'Cancel')),
      el('button', { class: 'btn btn--primary', onClick: async () => {
        const text = textT.value.trim();
        if (!text) { toast(L('اكتب العبارة', 'Enter the quote'), 'error'); return; }
        await upsert('quotes', { ...(existing || {}), text, author: authorI.value.trim(), favorite: existing?.favorite || false });
        toast(L('تم الحفظ', 'Saved'), 'success');
        m.close();
      }}, icon('check') + ' ' + L('حفظ', 'Save'))
    ]
  });
  setTimeout(() => textT.focus(), 80);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
