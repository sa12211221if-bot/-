// Designer OS — Rate Calculator
import { el } from '../utils.js';
import { icon } from '../icons.js';
import { t, fmtCurrency, getLang } from '../i18n.js';
import { getState, setSetting } from '../store.js';
import { input, field, select, toast } from '../ui.js';

export async function renderCalculator() {
  const root = el('div', {});
  const state = getState();

  root.appendChild(el('div', { class: 'page-header' },
    el('div', {},
      el('h2', { class: 'page-header__title' }, t('rate_calculator')),
      el('div', { class: 'page-header__subtitle' }, t('calculator_intro'))
    )
  ));

  // Project type presets (multipliers)
  const projectTypes = [
    { id: 'logo', label: t('cat_logo'), baseHours: 8 },
    { id: 'branding', label: t('cat_branding'), baseHours: 30 },
    { id: 'social', label: t('cat_social'), baseHours: 4 },
    { id: 'print', label: t('cat_print'), baseHours: 6 },
    { id: 'web', label: t('cat_web'), baseHours: 24 },
    { id: 'custom', label: getLang() === 'ar' ? 'مخصص' : 'Custom', baseHours: 0 }
  ];

  let projectType = 'logo';
  let hours = projectTypes[0].baseHours;
  let rate = state.hourlyRate || 25000;
  let complexity = 1.0;
  let rush = 1.0;
  let revisions = 2;

  const wrap = el('div', { class: 'grid-2' });

  // Left: form
  const form = el('div', { class: 'glass panel' });
  form.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '16px' } }, [
    el('span', { html: icon('calculator') }),
    el('span', {}, t('rate_calculator'))
  ]));

  const typeS = select(projectTypes.map((p) => ({ value: p.id, label: p.label })), { value: projectType });
  typeS.addEventListener('change', () => {
    projectType = typeS.value;
    const preset = projectTypes.find((p) => p.id === projectType);
    if (preset.baseHours) {
      hoursI.value = preset.baseHours;
      hours = preset.baseHours;
      compute();
    }
  });
  form.appendChild(field(t('project_type'), typeS));

  const hoursI = input({ value: hours, type: 'number', oninput: (e) => { hours = parseFloat(e.target.value) || 0; compute(); } });
  form.appendChild(field(t('estimated_hours'), hoursI));

  const rateI = input({ value: rate, type: 'number', oninput: async (e) => {
    rate = parseFloat(e.target.value) || 0;
    await setSetting('hourlyRate', rate);
    compute();
  } });
  form.appendChild(field(`${t('hourly_rate')} (${state.currency})`, rateI));

  const compS = el('input', { type: 'range', min: '0.5', max: '2.5', step: '0.1', value: complexity });
  const compLabel = el('span', { class: 'text-accent', style: { fontVariantNumeric: 'tabular-nums' } }, complexity.toFixed(1) + 'x');
  compS.oninput = () => { complexity = parseFloat(compS.value); compLabel.textContent = complexity.toFixed(1) + 'x'; compute(); };
  form.appendChild(field(
    el('span', { class: 'row justify-between' }, [t('complexity'), compLabel]),
    compS,
    getLang() === 'ar' ? '0.5 = بسيط، 2.5 = معقّد جداً' : '0.5 = simple, 2.5 = highly complex'
  ));

  const rushS = el('input', { type: 'range', min: '1', max: '2.5', step: '0.1', value: rush });
  const rushLabel = el('span', { class: 'text-accent', style: { fontVariantNumeric: 'tabular-nums' } }, rush.toFixed(1) + 'x');
  rushS.oninput = () => { rush = parseFloat(rushS.value); rushLabel.textContent = rush.toFixed(1) + 'x'; compute(); };
  form.appendChild(field(
    el('span', { class: 'row justify-between' }, [t('rush_factor'), rushLabel]),
    rushS,
    getLang() === 'ar' ? '1 = جدول طبيعي، 2.5 = مستعجل جداً' : '1 = normal, 2.5 = very rushed'
  ));

  const revI = input({ value: revisions, type: 'number', min: '0', max: '20', oninput: (e) => { revisions = parseInt(e.target.value) || 0; compute(); } });
  form.appendChild(field(t('revisions'), revI));

  wrap.appendChild(form);

  // Right: result
  const result = el('div', { class: 'glass panel glass-accent' });
  wrap.appendChild(result);

  function compute() {
    const baseAmount = hours * rate;
    const complexAmount = baseAmount * complexity;
    const rushAmount = complexAmount * rush;
    const revisionsCost = Math.max(0, revisions - 2) * (hours * 0.15) * rate; // each revision past 2 = 15% of hours
    const final = rushAmount + revisionsCost;

    result.innerHTML = '';
    result.appendChild(el('h3', { class: 'panel__title', style: { marginBottom: '16px' } }, [
      el('span', { html: icon('dollar') }),
      el('span', {}, t('final_price'))
    ]));

    result.appendChild(el('div', { style: { fontSize: '40px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 } },
      fmtCurrency(final)
    ));
    result.appendChild(el('div', { class: 'text-muted text-sm', style: { marginTop: '4px', marginBottom: '16px' } },
      `${hours}h × ${fmtCurrency(rate)} × ${complexity.toFixed(1)} × ${rush.toFixed(1)}`));

    const breakdown = el('div', { class: 'col gap-12' });
    breakdown.appendChild(breakdownRow(t('base_rate'), fmtCurrency(baseAmount)));
    breakdown.appendChild(breakdownRow(t('complexity') + ` (${complexity.toFixed(1)}x)`, fmtCurrency(complexAmount - baseAmount)));
    breakdown.appendChild(breakdownRow(t('rush_factor') + ` (${rush.toFixed(1)}x)`, fmtCurrency(rushAmount - complexAmount)));
    breakdown.appendChild(breakdownRow(t('revisions') + ` (${revisions})`, fmtCurrency(revisionsCost)));
    result.appendChild(breakdown);

    // Helper notes
    result.appendChild(el('hr', { class: 'hr' }));
    result.appendChild(el('div', { class: 'text-sm text-muted' },
      getLang() === 'ar'
        ? '💡 اقتراح: اطلب 50% مقدّماً وقدّم 2 مراجعات مجانية'
        : '💡 Tip: Ask for 50% upfront and offer 2 free revisions'
    ));
  }
  compute();

  root.appendChild(wrap);
  return root;
}

function breakdownRow(label, value) {
  return el('div', { class: 'row justify-between' },
    el('span', { class: 'text-muted text-sm' }, label),
    el('span', { class: 'text-sm', style: { fontWeight: 600 } }, value)
  );
}
