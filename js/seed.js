// Designer OS — Sample data seeder
import { db, uid } from './db.js';
import { addDays } from './utils.js';

export async function seedSampleData() {
  const now = Date.now();
  const today = new Date();

  // Clients
  const client1 = { id: uid(), name: 'شركة النخبة للعقارات', company: 'النخبة للعقارات', email: 'info@elite-realestate.com', phone: '+9647701234567', type: 'recurring', notes: 'عميل ثابت — يطلب 2-3 تصاميم سوشيال أسبوعياً', createdAt: now - 86400000 * 90 };
  const client2 = { id: uid(), name: 'مطعم الذواقة', company: 'مطعم الذواقة', email: 'manager@dhawaqa.com', phone: '+9647809876543', type: 'recurring', notes: 'حملات شهرية + هوية بصرية كاملة', createdAt: now - 86400000 * 60 };
  const client3 = { id: uid(), name: 'أحمد العامري', company: 'صالون أحمد', type: 'occasional', notes: 'يطلب بشكل عشوائي — تصاميم متفرقة', createdAt: now - 86400000 * 30 };
  const client4 = { id: uid(), name: 'Sara Designs', company: 'Personal brand', email: 'sara@example.com', type: 'onetime', createdAt: now - 86400000 * 7 };

  await db.putMany('clients', [client1, client2, client3, client4]);

  // Projects
  const projects = [
    { id: uid(), name: 'حملة العيد - النخبة', clientId: client1.id, type: 'Social Campaign', status: 'in_progress', priority: 'high', brief: 'سلسلة 6 بوستات لحملة العيد تشمل تخفيضات وعروض جديدة', budget: 450000, estimatedHours: 14, startDate: new Date(today).toISOString(), dueDate: addDays(today, 4).toISOString() },
    { id: uid(), name: 'هوية بصرية - الذواقة', clientId: client2.id, type: 'Branding', status: 'review', priority: 'high', brief: 'شعار + ألوان + خطوط + قوالب', budget: 1500000, estimatedHours: 50, startDate: addDays(today, -20).toISOString(), dueDate: addDays(today, 7).toISOString() },
    { id: uid(), name: 'بوست افتتاح صالون', clientId: client3.id, type: 'Social Post', status: 'active', priority: 'medium', budget: 75000, estimatedHours: 3, dueDate: addDays(today, 2).toISOString() },
    { id: uid(), name: 'تصميم منيو رمضان', clientId: client2.id, type: 'Print', status: 'idea', priority: 'low', budget: 250000, estimatedHours: 8, dueDate: addDays(today, 30).toISOString() },
    { id: uid(), name: 'Logo - Sara', clientId: client4.id, type: 'Logo', status: 'done', priority: 'medium', budget: 350000, estimatedHours: 8, dueDate: addDays(today, -3).toISOString(), startDate: addDays(today, -10).toISOString() }
  ];
  await db.putMany('projects', projects);

  // Tasks (linked + standalone)
  const tasks = [
    { id: uid(), title: 'تجهيز 3 تصاميم لحملة العيد', projectId: projects[0].id, status: 'doing', priority: 'high', dueDate: new Date().toISOString(), estimatedMinutes: 180 },
    { id: uid(), title: 'مراجعة ألوان الهوية مع العميل', projectId: projects[1].id, status: 'todo', priority: 'high', dueDate: new Date().toISOString(), estimatedMinutes: 30 },
    { id: uid(), title: 'إرسال بريد متابعة للعملاء', projectId: null, status: 'todo', priority: 'medium', dueDate: new Date().toISOString(), estimatedMinutes: 20 },
    { id: uid(), title: 'تصدير ملفات PDF نهائية', projectId: projects[1].id, status: 'todo', priority: 'medium', dueDate: addDays(today, 1).toISOString(), estimatedMinutes: 45 },
    { id: uid(), title: 'تجهيز mockup للمنيو', projectId: projects[3].id, status: 'todo', priority: 'low', dueDate: addDays(today, 5).toISOString(), estimatedMinutes: 90 },
    { id: uid(), title: 'إنهاء بوست افتتاح الصالون', projectId: projects[2].id, status: 'doing', priority: 'medium', dueDate: addDays(today, 2).toISOString(), estimatedMinutes: 120 },
    { id: uid(), title: 'بحث مرجعيات تصميم — Pinterest', projectId: null, status: 'done', priority: 'low', completedAt: now - 3600000, estimatedMinutes: 30 },
    { id: uid(), title: 'تصدير ملفات Logo Sara', projectId: projects[4].id, status: 'done', priority: 'medium', completedAt: now - 86400000 * 3 }
  ];
  await db.putMany('tasks', tasks);

  // Invoices
  const invoices = [
    { id: uid(), invoiceNumber: 'INV-001', clientId: client4.id, amount: 350000, currency: 'IQD', status: 'paid', issueDate: addDays(today, -5).toISOString(), paidDate: addDays(today, -3).toISOString(), description: 'Logo design - Sara' },
    { id: uid(), invoiceNumber: 'INV-002', clientId: client1.id, amount: 450000, currency: 'IQD', status: 'sent', issueDate: addDays(today, -2).toISOString(), dueDate: addDays(today, 5).toISOString(), description: 'حملة العيد - دفعة أولى' },
    { id: uid(), invoiceNumber: 'INV-003', clientId: client2.id, amount: 750000, currency: 'IQD', status: 'paid', issueDate: addDays(today, -15).toISOString(), paidDate: addDays(today, -10).toISOString(), description: 'دفعة أولى - هوية بصرية' },
    { id: uid(), invoiceNumber: 'INV-004', clientId: client3.id, amount: 75000, currency: 'IQD', status: 'sent', issueDate: addDays(today, -8).toISOString(), dueDate: addDays(today, -1).toISOString(), description: 'بوست صالون أحمد' }
  ];
  await db.putMany('invoices', invoices);

  // Subscriptions
  const subs = [
    { id: uid(), name: 'Adobe Creative Cloud', cycle: 'monthly', amount: 75000, currency: 'IQD', nextBillingDate: addDays(today, 12).toISOString() },
    { id: uid(), name: 'Figma Professional', cycle: 'monthly', amount: 18000, currency: 'IQD', nextBillingDate: addDays(today, 5).toISOString() },
    { id: uid(), name: 'استضافة الموقع الشخصي', cycle: 'yearly', amount: 120000, currency: 'IQD', nextBillingDate: addDays(today, 90).toISOString() },
    { id: uid(), name: 'Canva Pro', cycle: 'monthly', amount: 15000, currency: 'IQD', nextBillingDate: addDays(today, 2).toISOString() }
  ];
  await db.putMany('subscriptions', subs);

  // Goals
  const goals = [
    { id: uid(), title: 'إنهاء 3 مشاريع هذا الأسبوع', period: 'weekly', target: 3, current: 1, unit: 'مشروع', status: 'active' },
    { id: uid(), title: 'تركيز عميق 4 ساعات يومياً', period: 'daily', target: 4, current: 2, unit: 'ساعة', status: 'active' },
    { id: uid(), title: 'إيرادات الشهر', period: 'monthly', target: 3000000, current: 1100000, unit: 'IQD', status: 'active' },
    { id: uid(), title: 'تعلّم برنامج جديد', period: 'monthly', target: 1, current: 0, unit: 'برنامج', status: 'active' }
  ];
  await db.putMany('goals', goals);

  // Ideas
  const ideas = [
    { id: uid(), title: 'فكرة هوية لمحل قهوة بستايل ميمفس', category: 'branding', description: 'ألوان جريئة + أنماط هندسية + خطوط بولد', pinned: true },
    { id: uid(), title: 'سلسلة بوستات تعليمية عن التصميم', category: 'social', description: '10 بوستات تشرح أساسيات التصميم للمبتدئين' },
    { id: uid(), title: 'قالب CV بستايل Glassmorphism', category: 'print' },
    { id: uid(), title: 'موقع portfolio شخصي بـ dark mode', category: 'web' }
  ];
  await db.putMany('ideas', ideas);

  // Focus sessions
  const sessions = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, -i);
    if (Math.random() > 0.2) {
      sessions.push({
        id: uid(), date: d.getTime() + 36000000,
        startedAt: d.getTime() + 36000000, endedAt: d.getTime() + 36000000 + 1500000,
        projectId: projects[i % projects.length].id, mode: 'focus',
        plannedMinutes: 25, duration: 25, completed: true
      });
      if (Math.random() > 0.5) {
        sessions.push({
          id: uid(), date: d.getTime() + 50000000,
          projectId: projects[(i+1) % projects.length].id, mode: 'focus',
          plannedMinutes: 25, duration: 25, completed: true
        });
      }
    }
  }
  await db.putMany('focusSessions', sessions);

  // Time logs
  const logs = sessions.filter((s) => s.projectId).map((s) => ({
    id: uid(), projectId: s.projectId, date: s.date, duration: s.duration, source: 'pomodoro'
  }));
  await db.putMany('timeLogs', logs);

  // Inbox items
  const inbox = [
    { id: uid(), content: 'متابعة مع عميل النخبة بخصوص الفاتورة', type: 'note' },
    { id: uid(), content: 'تجديد اشتراك Adobe قبل نهاية الشهر', type: 'note' }
  ];
  await db.putMany('inbox', inbox);

  // Expenses
  const expenses = [
    { id: uid(), title: 'Adobe Cloud', amount: 75000, currency: 'IQD', date: addDays(today, -10).toISOString(), category: 'software' },
    { id: uid(), title: 'Stock photos pack', amount: 35000, currency: 'IQD', date: addDays(today, -20).toISOString(), category: 'assets' }
  ];
  await db.putMany('expenses', expenses);
}
