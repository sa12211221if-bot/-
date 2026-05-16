// Designer OS — AI Context Builder
// Builds a compressed snapshot of the user's data for the LLM system prompt.
// Also defines slash-commands the AI understands.

import { getState, sel } from './store.js';
import { getLang } from './i18n.js';

// ============================================================
// System prompt with full context
// ============================================================

export function buildSystemPrompt() {
  const s = getState();
  const ar = getLang() === 'ar';
  const today = new Date();

  const todayTasks = sel.todayTasks();
  const overdue = sel.overdueTasks();
  const upcoming = sel.upcomingTasks(8);
  const activeProjects = sel.activeProjects();
  const focusMin = sel.focusMinutesToday();
  const habitsDone = sel.habitsDoneToday();
  const habitsTotal = s.habits.length;
  const v = sel.latestVitals();
  const monthRev = sel.monthRevenue();
  const monthExp = sel.monthExpenses();
  const streak = sel.streak();

  const prelude = ar ? `
أنت مساعد شخصي ذكي لـ "Designer OS" — نظام تشغيل شخصي لمصمم فريلانس عربي.
مهمتك: تساعده يدير شغله، يحلل بياناته، يكتب له briefs، يولد تقارير، يقترح أولويات، ويذكّره بالتزامه الديني.

أسلوبك:
- مختصر ومباشر — لا حشو
- عملي — كل اقتراح قابل للتنفيذ
- ودود لكن محترف
- جاوب بالعربية (ما لم يُطلب غير ذلك)
- استخدم بيانات المستخدم الفعلية أدناه

عند الطلب على "/report" أو "تقرير" — ولّد تقريراً منظماً.
عند الطلب على "/brief" أو "كتابة بريف" — اطلب تفاصيل العميل ثم اكتب brief احترافي.
عند طلب تحليل تأخر مشروع — استخدم البيانات أدناه واقترح أسباباً وحلولاً.
عند طلب تسعيرة — استخدم نموذج التسعير على المهمة (لا الساعة): مهمة أساسية + سعر مراجعات.
` : `
You are an intelligent personal assistant for "Designer OS" — a life operating system for an Arabic-speaking freelance designer.
Your job: help manage work, analyze data, write client briefs, generate reports, prioritize, and support spiritual commitment.

Style:
- Concise, direct, no fluff
- Actionable — every suggestion executable
- Friendly but professional
- Default language: Arabic unless asked otherwise

Slash commands: /report, /brief, /analyze, /price, /challenge.
`;

  const ctx = ar ? buildArabicContext({ s, todayTasks, overdue, upcoming, activeProjects, focusMin, habitsDone, habitsTotal, v, monthRev, monthExp, streak, today })
                 : buildEnglishContext({ s, todayTasks, overdue, upcoming, activeProjects, focusMin, habitsDone, habitsTotal, v, monthRev, monthExp, streak, today });

  return prelude + '\n\n' + ctx;
}

function buildArabicContext({ s, todayTasks, overdue, upcoming, activeProjects, focusMin, habitsDone, habitsTotal, v, monthRev, monthExp, streak, today }) {
  const lines = ['=== بيانات المستخدم الحقيقية الآن ==='];
  lines.push(`التاريخ: ${today.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push(`الوقت: ${today.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push(`الوضع الحالي: ${s.mode}`);
  lines.push(`سلسلة الإنجاز: ${streak} يوم`);

  // Vitals
  if (v) {
    lines.push(`\nالحالة الذهنية (آخر تسجيل):`);
    lines.push(`- التركيز: ${v.focus || 0}/5  | المزاج: ${v.mood || 0}/5  | الطاقة: ${v.energy || 0}/5`);
    lines.push(`- التوتر: ${v.stress || 0}/5  | النوم: ${v.sleep || 0}/5  | الكافيين: ${v.caffeine || 0}/5`);
  }

  // Tasks
  lines.push(`\n=== المهام ===`);
  lines.push(`متأخرة: ${overdue.length}  |  اليوم: ${todayTasks.length}  |  قادمة: ${upcoming.length}`);
  if (overdue.length) {
    lines.push(`\nمهام متأخرة:`);
    overdue.slice(0, 8).forEach((t, i) => {
      const proj = sel.projectById(t.projectId);
      lines.push(`  ${i+1}. ${t.title} — ${proj?.name || 'بدون مشروع'} — أولوية: ${t.priority || 'متوسطة'}`);
    });
  }
  if (todayTasks.length) {
    lines.push(`\nمهام اليوم:`);
    todayTasks.slice(0, 8).forEach((t, i) => {
      const proj = sel.projectById(t.projectId);
      lines.push(`  ${i+1}. ${t.title} — ${proj?.name || 'بدون مشروع'} — ${t.estimatedMinutes || '?'} دقيقة`);
    });
  }
  if (upcoming.length) {
    lines.push(`\nأبرز المهام القادمة:`);
    upcoming.slice(0, 5).forEach((t, i) => {
      lines.push(`  ${i+1}. ${t.title} — تاريخ: ${new Date(t.dueDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`);
    });
  }

  // Projects
  lines.push(`\n=== المشاريع النشطة (${activeProjects.length}) ===`);
  activeProjects.slice(0, 8).forEach((p, i) => {
    const client = sel.clientById(p.clientId);
    const tasks = sel.tasksForProject(p.id);
    const done = tasks.filter((t) => t.status === 'done').length;
    const overdueC = tasks.filter((t) => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
    lines.push(`  ${i+1}. ${p.name}${client ? ' — ' + client.name : ''}`);
    lines.push(`     - الحالة: ${p.status}  | تقدم: ${done}/${tasks.length} مهام  | متأخرة: ${overdueC}`);
    if (p.dueDate) lines.push(`     - الموعد النهائي: ${new Date(p.dueDate).toLocaleDateString('ar-EG')}`);
    if (p.budget) lines.push(`     - الميزانية: ${p.budget} ${s.currency}`);
    if (p.brief) lines.push(`     - Brief: ${String(p.brief).slice(0, 200)}`);
  });

  // Clients
  if (s.clients.length) {
    lines.push(`\n=== العملاء (${s.clients.length}) ===`);
    s.clients.slice(0, 10).forEach((c, i) => {
      const projs = sel.projectsForClient(c.id);
      const rev = sel.invoicesForClient(c.id).filter((i) => i.status === 'paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      lines.push(`  ${i+1}. ${c.name}${c.company ? ' (' + c.company + ')' : ''} — ${projs.length} مشروع — إيرادات: ${rev} ${s.currency}`);
    });
  }

  // Money
  lines.push(`\n=== المال (الشهر الحالي) ===`);
  lines.push(`إيرادات: ${monthRev} ${s.currency}  |  مصاريف: ${monthExp} ${s.currency}  |  صافي: ${monthRev - monthExp} ${s.currency}`);

  // Pricing model
  lines.push(`\n=== نموذج التسعير ===`);
  lines.push(`السعر يُحدد على المهمة (لا الساعة).`);
  lines.push(`السعر الافتراضي للمهمة: ${s.defaultTaskPrice || 50000} ${s.currency}`);
  lines.push(`سعر المراجعة الواحدة: ${s.defaultRevisionPrice || 15000} ${s.currency}`);

  // Habits
  if (habitsTotal) {
    lines.push(`\n=== العادات اليوم ===`);
    lines.push(`أُنجزت: ${habitsDone}/${habitsTotal}`);
  }

  // Focus
  lines.push(`\n=== التركيز اليوم ===`);
  lines.push(`دقائق التركيز: ${focusMin}`);

  return lines.join('\n');
}

function buildEnglishContext({ s, todayTasks, overdue, upcoming, activeProjects, focusMin, habitsDone, habitsTotal, v, monthRev, monthExp, streak, today }) {
  const lines = ['=== Live User Data ==='];
  lines.push(`Date: ${today.toDateString()} | Time: ${today.toLocaleTimeString()}`);
  lines.push(`Mode: ${s.mode} | Streak: ${streak} days`);
  if (v) lines.push(`Vitals: focus ${v.focus||0}/5, mood ${v.mood||0}/5, energy ${v.energy||0}/5, stress ${v.stress||0}/5, sleep ${v.sleep||0}/5`);
  lines.push(`\nTasks: ${overdue.length} overdue, ${todayTasks.length} today, ${upcoming.length} upcoming`);
  if (overdue.length) {
    lines.push('\nOverdue:');
    overdue.slice(0, 8).forEach((t, i) => lines.push(`  ${i+1}. ${t.title} — priority: ${t.priority || 'medium'}`));
  }
  if (todayTasks.length) {
    lines.push('\nToday:');
    todayTasks.slice(0, 8).forEach((t, i) => lines.push(`  ${i+1}. ${t.title} — ${t.estimatedMinutes || '?'} min`));
  }
  lines.push(`\nActive projects (${activeProjects.length}):`);
  activeProjects.slice(0, 8).forEach((p, i) => {
    const client = sel.clientById(p.clientId);
    const tasks = sel.tasksForProject(p.id);
    const done = tasks.filter((t) => t.status === 'done').length;
    lines.push(`  ${i+1}. ${p.name}${client ? ' — ' + client.name : ''} (${done}/${tasks.length} tasks, status: ${p.status})`);
  });
  lines.push(`\nMonth: revenue ${monthRev} ${s.currency}, expenses ${monthExp} ${s.currency}`);
  lines.push(`Pricing model: per-task (NOT hourly). Default task: ${s.defaultTaskPrice || 50000} ${s.currency}, revision: ${s.defaultRevisionPrice || 15000} ${s.currency}`);
  if (habitsTotal) lines.push(`\nHabits today: ${habitsDone}/${habitsTotal}  |  Focus: ${focusMin} min`);
  return lines.join('\n');
}

// ============================================================
// Slash commands — pre-formatted prompts the AI understands
// ============================================================

export const COMMANDS = {
  '/report': {
    label: { ar: 'تقرير شامل', en: 'Full report' },
    icon: 'bar_chart',
    expand: (arg) => {
      const range = arg || 'يومي';
      return `أنشئ ${range} مفصّل عن إنجازاتي بناءً على بياناتي. اشمل:
1. ملخص تنفيذي في 3 جمل
2. ما أُنجز (مهام، مشاريع، عادات، تركيز)
3. ما تأخّر ولماذا
4. أنماط لاحظتها
5. توصيات عملية للغد/الأسبوع القادم`;
    }
  },
  '/brief': {
    label: { ar: 'كتابة بريف', en: 'Write a brief' },
    icon: 'edit',
    expand: (arg) => `ساعدني أكتب brief احترافي${arg ? ' لـ "' + arg + '"' : ''}. اطرح عليّ سؤالين-ثلاثة فقط لو احتجت معلومات ناقصة، ثم اكتب brief كامل بالأقسام: نظرة عامة، الأهداف، الجمهور المستهدف، الأسلوب، المخرجات، الجدول الزمني.`
  },
  '/analyze': {
    label: { ar: 'حلل مشروع', en: 'Analyze project' },
    icon: 'trending',
    expand: (arg) => `حلل لي ${arg ? 'مشروع "' + arg + '"' : 'أكثر مشروع متأخر عندي'}. اشرح:
- الحالة الفعلية مقارنة بالخطة
- أسباب التأخر المحتملة
- 3 خطوات عملية لإنقاذه
- هل يستحق الاستمرار أم إعادة التفاوض؟`
  },
  '/price': {
    label: { ar: 'سعّر مشروع', en: 'Price a project' },
    icon: 'dollar',
    expand: (arg) => `ساعدني أسعّر${arg ? ' "' + arg + '"' : ' مشروع جديد'}. استخدم نموذج التسعير على المهمة (لا الساعة). اسألني بضع أسئلة سريعة (نوع المشروع، عدد المخرجات، عدد المراجعات، المهلة)، ثم اقترح:
- السعر الأساسي
- سعر المراجعات الإضافية
- سعر الاستعجال إن وجد
- السعر النهائي + تبرير مختصر`
  },
  '/challenge': {
    label: { ar: 'اقترح تحدي', en: 'Suggest a challenge' },
    icon: 'flame',
    expand: () => `اقترح تحدي عملي ليوم/أسبوع بناءً على بياناتي. التحدي يجب أن يكون:
- محدد وقابل للقياس
- يستهدف ضعفاً أو فرصة في بياناتي
- ممكن إنجازه دون إرهاق
- مع مكافأة بسيطة عند الإنجاز`
  },
  '/help': {
    label: { ar: 'الأوامر', en: 'Commands' },
    icon: 'info',
    expand: () => `اعرض الأوامر المتاحة وما يفعله كل واحد.`
  }
};

export function expandCommand(text) {
  const trimmed = text.trim();
  for (const cmd of Object.keys(COMMANDS)) {
    if (trimmed === cmd || trimmed.startsWith(cmd + ' ')) {
      const arg = trimmed.slice(cmd.length).trim();
      return COMMANDS[cmd].expand(arg);
    }
  }
  return null;
}

export function commandList() {
  return Object.entries(COMMANDS).map(([key, c]) => ({ key, ...c }));
}
