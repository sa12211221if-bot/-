// عبد سيف — Auth UI (sign in / sign up modal + account panel)
import { el } from './utils.js';
import { icon } from './icons.js';
import { t, getLang } from './i18n.js';
import { modal, toast, input, field, applyAccent } from './ui.js';
import {
  configureCloud, clearCloudConfig, getCloudState, signIn, signUp,
  signOut, pullAndMerge, pushAllLocal, onCloudChange
} from './cloud.js';

const ar = getLang() === 'ar';
const L = (a, e) => (getLang() === 'ar' ? a : e);

// ─────────────────── Cloud configuration modal ───────────────────
// Step 1 of onboarding: collect Supabase URL + anon key (one time).
export function openCloudConfigModal(onDone) {
  const cs = getCloudState();
  const urlI  = input({ placeholder: 'https://xxxx.supabase.co', value: '' });
  const keyI  = input({ placeholder: 'anon key', value: '' });

  const m = modal({
    title: L('إعداد المزامنة السحابية', 'Cloud sync setup'),
    body: el('div', { class: 'col gap-12' },
      el('p', { class: 'text-sm text-muted' },
        L('أدخل بيانات مشروع Supabase الخاص بك. ستجدها في:  Project Settings → API.',
          'Enter your Supabase project credentials. Find them in Project Settings → API.')
      ),
      field('Supabase URL', urlI),
      field('Anon Public Key', keyI,
        L('المفتاح العام (anon) آمن للاستخدام في المتصفح.',
          'The anon key is safe to expose in the browser.'))
    ),
    footer: [
      el('button', { class: 'btn', onClick: () => m.close() }, t('cancel')),
      el('button', { class: 'btn btn--primary', onClick: () => {
        try {
          configureCloud({ url: urlI.value.trim(), anonKey: keyI.value.trim() });
          toast(L('تم حفظ إعدادات السحابة', 'Cloud configured'), 'success');
          m.close();
          onDone && onDone();
        } catch (e) {
          toast(e.message, 'error');
        }
      }}, t('save'))
    ]
  });
}

// ─────────────────── Sign in / sign up modal ─────────────────────
export function openAuthModal({ initialMode = 'signin', onDone } = {}) {
  let mode = initialMode; // 'signin' | 'signup'
  const emailI = input({ type: 'email', placeholder: L('بريدك الإلكتروني', 'your email'), autocomplete: 'email' });
  const passI  = input({ type: 'password', placeholder: L('كلمة السر', 'password'), autocomplete: mode === 'signup' ? 'new-password' : 'current-password' });

  const titleNode = el('span', {}, mode === 'signin' ? L('تسجيل الدخول', 'Sign in') : L('إنشاء حساب', 'Create account'));
  const bodyEl = el('div', { class: 'col gap-12' });
  const errEl = el('div', { class: 'text-sm', style: { color: 'var(--danger)', minHeight: '20px' } });
  const submitBtn = el('button', { class: 'btn btn--primary btn--block' }, mode === 'signin' ? L('دخول', 'Sign in') : L('إنشاء حساب', 'Sign up'));
  const switchBtn = el('button', { class: 'btn btn--ghost btn--block' });

  const renderBody = () => {
    bodyEl.innerHTML = '';
    bodyEl.append(
      field(L('البريد الإلكتروني', 'Email'), emailI),
      field(L('كلمة السر', 'Password'), passI,
        mode === 'signup' ? L('على الأقل 6 أحرف.', 'At least 6 characters.') : null),
      errEl,
      submitBtn,
      el('div', { class: 'text-center text-sm text-muted' },
        mode === 'signin' ? L('ليس عندك حساب؟', "Don't have an account?")
                          : L('عندك حساب أصلاً؟', 'Already have an account?')),
      switchBtn
    );
    submitBtn.textContent = mode === 'signin' ? L('دخول', 'Sign in') : L('إنشاء حساب', 'Sign up');
    switchBtn.textContent = mode === 'signin' ? L('إنشاء حساب جديد', 'Create new account')
                                              : L('عندي حساب — دخول', 'I have an account — sign in');
    titleNode.textContent = mode === 'signin' ? L('تسجيل الدخول', 'Sign in') : L('إنشاء حساب', 'Create account');
  };

  switchBtn.onclick = () => { mode = mode === 'signin' ? 'signup' : 'signin'; renderBody(); };

  submitBtn.onclick = async () => {
    errEl.textContent = '';
    const email = emailI.value.trim();
    const pass  = passI.value;
    if (!email || !pass) { errEl.textContent = L('عبّي كل الحقول.', 'Please fill all fields.'); return; }
    if (mode === 'signup' && pass.length < 6) { errEl.textContent = L('كلمة السر قصيرة (6 أحرف على الأقل).', 'Password too short (6+ chars).'); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = L('جاري...', 'Working...');
    try {
      if (mode === 'signin') {
        await signIn(email, pass);
      } else {
        const data = await signUp(email, pass);
        // If email confirmation is enabled, there will be no session yet.
        if (!data?.access_token) {
          toast(L('تحقق من بريدك لتأكيد الحساب.', 'Check your email to confirm your account.'), 'info', 6000);
        } else {
          // First-time sign up → upload local data to cloud.
          await pushAllLocal().catch(() => {});
        }
      }
      toast(L('أهلاً بك!', 'Welcome!'), 'success');
      m.close();
      onDone && onDone();
    } catch (e) {
      errEl.textContent = e.message || L('فشل تسجيل الدخول', 'Sign-in failed');
    } finally {
      submitBtn.disabled = false;
      renderBody();
    }
  };

  const m = modal({
    title: titleNode,
    body: bodyEl,
    footer: null
  });
  renderBody();
  setTimeout(() => emailI.focus(), 100);
}

// ─────────────────── Account panel (used by Settings) ──────────
export function buildAccountPanel(rerender) {
  const panel = el('div', { class: 'glass panel' });
  const cs = getCloudState();

  panel.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '14px' } }, [
    el('span', { html: icon('users') }),
    el('span', {}, L('الحساب والمزامنة', 'Account & sync'))
  ]));

  // Status row
  const statusRow = el('div', { class: 'col gap-8', style: { marginBottom: '14px' } });
  const dot = (color) => el('span', { style: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', background: color, marginInlineEnd: '8px' } });

  if (!cs.configured) {
    statusRow.appendChild(el('div', { class: 'row align-center' },
      dot('#888'),
      el('span', {}, L('السحابة غير مُعدّة', 'Cloud not configured'))));
    statusRow.appendChild(el('p', { class: 'text-sm text-muted' },
      L('اربط مشروع Supabase الخاص بك للمزامنة بين الأجهزة. هذه خطوة لمرة واحدة.',
        'Link your Supabase project to sync across devices. One-time setup.')));
    statusRow.appendChild(el('button', { class: 'btn btn--primary', onClick: () => openCloudConfigModal(rerender) },
      L('إعداد المزامنة', 'Set up sync')));
  } else if (!cs.signedIn) {
    statusRow.appendChild(el('div', { class: 'row align-center' },
      dot('#f5a524'),
      el('span', {}, L('السحابة جاهزة — لم يتم تسجيل الدخول', 'Cloud ready — not signed in'))));
    const row = el('div', { class: 'row gap-8 flex-wrap' });
    row.appendChild(el('button', { class: 'btn btn--primary', onClick: () => openAuthModal({ initialMode: 'signin', onDone: rerender }) }, L('تسجيل الدخول', 'Sign in')));
    row.appendChild(el('button', { class: 'btn', onClick: () => openAuthModal({ initialMode: 'signup', onDone: rerender }) }, L('إنشاء حساب', 'Create account')));
    row.appendChild(el('button', { class: 'btn btn--ghost', onClick: () => { clearCloudConfig(); rerender && rerender(); } }, L('تغيير إعدادات السحابة', 'Change cloud settings')));
    statusRow.appendChild(row);
  } else {
    statusRow.appendChild(el('div', { class: 'row align-center' },
      dot('#22c55e'),
      el('span', {}, L('متصل ومتزامن', 'Signed in & syncing'))));
    statusRow.appendChild(el('div', { class: 'row gap-8 flex-wrap' },
      el('span', { class: 'text-muted' }, L('المستخدم:', 'User:')),
      el('span', { class: 'font-mono' }, cs.user.email || cs.user.id)
    ));
    if (cs.lastSync) {
      statusRow.appendChild(el('div', { class: 'text-sm text-muted' },
        L('آخر مزامنة: ', 'Last sync: ') + new Date(cs.lastSync).toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-US')));
    }
    statusRow.appendChild(el('div', { class: 'text-sm', style: { color: cs.online ? 'var(--success, #22c55e)' : 'var(--danger)' } },
      cs.online ? L('● متصل بالإنترنت', '● Online') : L('● بدون اتصال — التغييرات ستُرفع لاحقاً', '● Offline — changes will sync later')));

    const row = el('div', { class: 'row gap-8 flex-wrap', style: { marginTop: '8px' } });
    row.appendChild(el('button', { class: 'btn', onClick: async () => {
      try {
        const { applied } = await pullAndMerge();
        toast(L(`تمت المزامنة (${applied} عنصر)`, `Synced (${applied} items)`), 'success');
        rerender && rerender();
      } catch (e) { toast(e.message, 'error'); }
    } }, L('مزامنة الآن', 'Sync now')));
    row.appendChild(el('button', { class: 'btn', onClick: async () => {
      try {
        const n = await pushAllLocal();
        toast(L(`تم رفع ${n} عنصر`, `Uploaded ${n} items`), 'success');
        rerender && rerender();
      } catch (e) { toast(e.message, 'error'); }
    } }, L('رفع كل البيانات للسحابة', 'Upload all to cloud')));
    row.appendChild(el('button', { class: 'btn btn--danger', onClick: async () => {
      await signOut();
      toast(L('تم تسجيل الخروج', 'Signed out'), 'info');
      rerender && rerender();
    } }, L('تسجيل الخروج', 'Sign out')));
    statusRow.appendChild(row);
  }

  panel.appendChild(statusRow);
  return panel;
}

// Re-render the account panel whenever cloud state changes.
export function attachAccountAutoRender(rerender) {
  return onCloudChange(() => rerender && rerender());
}
