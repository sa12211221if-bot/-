// Designer OS — i18n with AR/EN + RTL/LTR
import { getState, setSetting, subscribe } from './store.js';

const dict = {
  ar: {
    appName: 'عبد سيف',
    tagline: 'نظامك الشخصي لإدارة العمل الإبداعي',
    // Nav
    nav_dashboard: 'الرئيسية',
    nav_clients: 'العملاء',
    nav_projects: 'المشاريع',
    nav_tasks: 'المهام',
    nav_calendar: 'التقويم',
    nav_invoices: 'الفواتير',
    nav_focus: 'وضع التركيز',
    nav_goals: 'الأهداف',
    nav_reports: 'التقارير',
    nav_ideas: 'بنك الأفكار',
    nav_calculator: 'حاسبة التسعير',
    nav_settings: 'الإعدادات',
    nav_inbox: 'صندوق الالتقاط',

    // Common
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    search: 'بحث',
    filter: 'تصفية',
    all: 'الكل',
    none: 'لا يوجد',
    yes: 'نعم',
    no: 'لا',
    today: 'اليوم',
    yesterday: 'الأمس',
    tomorrow: 'غداً',
    this_week: 'هذا الأسبوع',
    this_month: 'هذا الشهر',
    name: 'الاسم',
    email: 'البريد',
    phone: 'الهاتف',
    notes: 'ملاحظات',
    status: 'الحالة',
    priority: 'الأولوية',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
    title: 'العنوان',
    description: 'الوصف',
    date: 'التاريخ',
    due_date: 'تاريخ التسليم',
    start_date: 'تاريخ البدء',
    end_date: 'تاريخ الانتهاء',
    amount: 'المبلغ',
    currency: 'العملة',
    actions: 'إجراءات',
    quick_capture: 'التقاط سريع',
    quick_capture_hint: 'اكتب فكرة، مهمة، أو ملاحظة...',
    saved: 'تم الحفظ',
    deleted: 'تم الحذف',
    confirm_delete: 'هل أنت متأكد من الحذف؟',
    nothing_here: 'لا توجد عناصر بعد',
    create_first: 'أنشئ أول عنصر',
    optional: 'اختياري',
    required: 'مطلوب',
    color: 'اللون',
    tag: 'وسم',
    tags: 'الوسوم',
    type: 'النوع',
    minutes: 'دقيقة',
    hours: 'ساعة',
    seconds: 'ثانية',

    // Dashboard
    welcome: 'مرحباً',
    good_morning: 'صباح الخير',
    good_afternoon: 'مساء الخير',
    good_evening: 'مساء الخير',
    today_focus: 'تركيز اليوم',
    today_tasks: 'مهام اليوم',
    overdue: 'متأخرة',
    upcoming: 'قادمة',
    active_projects: 'مشاريع نشطة',
    month_revenue: 'إيرادات الشهر',
    month_expenses: 'مصاريف الشهر',
    net_profit: 'الصافي',
    focus_today: 'دقائق التركيز اليوم',
    streak: 'سلسلة الإنجاز',
    days: 'يوم',
    smart_suggestions: 'اقتراحات ذكية',
    no_tasks_today: 'لا توجد مهام لليوم — استمتع!',
    energy_level: 'مستوى الطاقة',
    log_energy: 'سجّل طاقتك',
    energy_low: 'منخفضة',
    energy_med: 'متوسطة',
    energy_high: 'عالية',

    // Clients
    clients: 'العملاء',
    client: 'العميل',
    new_client: 'عميل جديد',
    client_name: 'اسم العميل',
    company: 'الشركة',
    address: 'العنوان',
    contact: 'وسيلة التواصل',
    client_since: 'عميل منذ',
    total_projects: 'إجمالي المشاريع',
    total_revenue: 'إجمالي الإيرادات',
    select_client: 'اختر العميل',
    no_client: 'بدون عميل',
    client_type: 'نوع العميل',
    type_recurring: 'مستمر',
    type_occasional: 'متقطع',
    type_onetime: 'لمرة واحدة',
    rating: 'التقييم',

    // Projects
    projects: 'المشاريع',
    project: 'المشروع',
    new_project: 'مشروع جديد',
    project_name: 'اسم المشروع',
    project_type: 'نوع المشروع',
    project_status_idea: 'فكرة',
    project_status_active: 'نشط',
    project_status_in_progress: 'قيد التنفيذ',
    project_status_review: 'قيد المراجعة',
    project_status_done: 'مكتمل',
    project_status_archived: 'مؤرشف',
    project_status_cancelled: 'ملغى',
    project_brief: 'الـ Brief',
    project_progress: 'التقدّم',
    view_kanban: 'لوحة',
    view_list: 'قائمة',
    view_calendar: 'تقويم',
    deadline: 'الموعد النهائي',
    budget: 'الميزانية',
    estimated_hours: 'الساعات المقدرة',
    spent_hours: 'الساعات المستهلكة',

    // Tasks
    tasks: 'المهام',
    task: 'المهمة',
    new_task: 'مهمة جديدة',
    task_title: 'عنوان المهمة',
    task_status_todo: 'للقيام به',
    task_status_doing: 'قيد العمل',
    task_status_done: 'تم',
    task_status_blocked: 'متوقفة',
    estimated_minutes: 'الوقت المقدّر (دقيقة)',
    daily_planner: 'مخطط اليوم',
    inbox: 'صندوق الالتقاط',
    backlog: 'الأرشيف',
    schedule_today: 'جدولة اليوم',
    schedule_tomorrow: 'جدولة غداً',
    mark_done: 'تم الإنجاز',
    add_subtask: 'أضف مهمة فرعية',

    // Calendar
    calendar: 'التقويم',
    day: 'اليوم',
    week: 'الأسبوع',
    month: 'الشهر',
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
    jan: 'يناير', feb: 'فبراير', mar: 'مارس', apr: 'أبريل', may: 'مايو', jun: 'يونيو',
    jul: 'يوليو', aug: 'أغسطس', sep: 'سبتمبر', oct: 'أكتوبر', nov: 'نوفمبر', dec: 'ديسمبر',

    // Invoices
    invoices: 'الفواتير',
    invoice: 'فاتورة',
    new_invoice: 'فاتورة جديدة',
    invoice_number: 'رقم الفاتورة',
    issue_date: 'تاريخ الإصدار',
    paid_date: 'تاريخ الدفع',
    invoice_status_draft: 'مسودة',
    invoice_status_sent: 'مُرسلة',
    invoice_status_paid: 'مدفوعة',
    invoice_status_overdue: 'متأخرة',
    invoice_status_cancelled: 'ملغاة',
    mark_paid: 'وسم كمدفوعة',
    subscriptions: 'الاشتراكات',
    new_subscription: 'اشتراك جديد',
    next_billing: 'الفاتورة القادمة',
    billing_cycle: 'دورة الفوترة',
    monthly: 'شهري',
    yearly: 'سنوي',
    weekly_freq: 'أسبوعي',

    // Focus
    focus_mode: 'وضع التركيز',
    pomodoro: 'بومودورو',
    start: 'ابدأ',
    pause: 'إيقاف مؤقت',
    resume: 'استئناف',
    stop: 'إنهاء',
    reset: 'إعادة',
    break: 'استراحة',
    long_break: 'استراحة طويلة',
    focus_duration: 'مدة التركيز',
    short_break: 'استراحة قصيرة',
    sessions_today: 'جلسات اليوم',
    total_focus_time: 'إجمالي وقت التركيز',
    select_project_focus: 'اختر مشروعاً للتركيز عليه',

    // Goals
    goals: 'الأهداف',
    new_goal: 'هدف جديد',
    goal_daily: 'يومي',
    goal_weekly: 'أسبوعي',
    goal_monthly: 'شهري',
    goal_yearly: 'سنوي',
    progress: 'التقدّم',
    target: 'الهدف',
    current: 'الحالي',

    // Reports
    reports: 'التقارير',
    revenue: 'الإيرادات',
    expenses: 'المصاريف',
    productivity: 'الإنتاجية',
    completed_projects: 'المشاريع المنجزة',
    completed_tasks: 'المهام المنجزة',
    avg_project_duration: 'متوسط مدة المشروع',
    revenue_by_client: 'الإيرادات حسب العميل',
    revenue_by_month: 'الإيرادات الشهرية',
    productivity_by_day: 'الإنتاجية حسب اليوم',
    last_7_days: 'آخر 7 أيام',
    last_30_days: 'آخر 30 يوم',
    last_year: 'آخر سنة',

    // Ideas
    idea_bank: 'بنك الأفكار',
    new_idea: 'فكرة جديدة',
    idea_title: 'عنوان الفكرة',
    idea_category: 'التصنيف',
    cat_logo: 'شعار',
    cat_branding: 'هوية',
    cat_social: 'سوشيال ميديا',
    cat_print: 'مطبوعات',
    cat_web: 'ويب',
    cat_other: 'أخرى',

    // Calculator
    rate_calculator: 'حاسبة التسعير',
    calculator_intro: 'احسب تسعيرة مشروعك بدقة',
    base_rate: 'التسعيرة الأساسية',
    complexity: 'مستوى التعقيد',
    rush_factor: 'معامل الاستعجال',
    revisions: 'عدد المراجعات',
    final_price: 'السعر النهائي',
    save_as_quote: 'احفظ كعرض سعر',

    // Settings
    settings: 'الإعدادات',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    appearance: 'المظهر',
    accent_color: 'اللون المميز',
    productivity_settings: 'إعدادات الإنتاجية',
    hourly_rate: 'السعر بالساعة',
    week_start: 'بداية الأسبوع',
    data: 'البيانات',
    export_data: 'تصدير البيانات',
    import_data: 'استيراد البيانات',
    clear_data: 'مسح كل البيانات',
    sample_data: 'بيانات تجريبية',
    load_sample: 'تحميل بيانات تجريبية',
    about: 'عن التطبيق',
    version: 'الإصدار',

    // Misc
    minutes_short: 'د',
    hours_short: 'س',
    sar: 'ريال',
    iqd: 'دينار',
    usd: 'دولار',
    eur: 'يورو',
    inbox_empty: 'صندوق الالتقاط فارغ — اضغط زر + لإضافة فكرة سريعة',
    notification_overdue: 'لديك مهام متأخرة',
    notification_due_today: 'لديك مهام مستحقة اليوم',
    install_app: 'تثبيت التطبيق',
    install_pwa_hint: 'يمكنك تثبيت التطبيق على جهازك للوصول السريع',
  },
  en: {
    appName: 'Abd Saif',
    tagline: 'Your personal management system for creative work',
    nav_dashboard: 'Dashboard',
    nav_clients: 'Clients',
    nav_projects: 'Projects',
    nav_tasks: 'Tasks',
    nav_calendar: 'Calendar',
    nav_invoices: 'Invoices',
    nav_focus: 'Focus',
    nav_goals: 'Goals',
    nav_reports: 'Reports',
    nav_ideas: 'Ideas',
    nav_calculator: 'Calculator',
    nav_settings: 'Settings',
    nav_inbox: 'Inbox',

    add: 'Add', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', confirm: 'Confirm',
    search: 'Search', filter: 'Filter', all: 'All', none: 'None', yes: 'Yes', no: 'No',
    today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow',
    this_week: 'This Week', this_month: 'This Month',
    name: 'Name', email: 'Email', phone: 'Phone', notes: 'Notes',
    status: 'Status', priority: 'Priority', high: 'High', medium: 'Medium', low: 'Low',
    title: 'Title', description: 'Description', date: 'Date',
    due_date: 'Due Date', start_date: 'Start Date', end_date: 'End Date',
    amount: 'Amount', currency: 'Currency', actions: 'Actions',
    quick_capture: 'Quick Capture',
    quick_capture_hint: 'Type an idea, task or note...',
    saved: 'Saved', deleted: 'Deleted',
    confirm_delete: 'Are you sure you want to delete?',
    nothing_here: 'No items yet',
    create_first: 'Create your first',
    optional: 'optional', required: 'required',
    color: 'Color', tag: 'Tag', tags: 'Tags', type: 'Type',
    minutes: 'minutes', hours: 'hours', seconds: 'seconds',

    welcome: 'Welcome',
    good_morning: 'Good morning',
    good_afternoon: 'Good afternoon',
    good_evening: 'Good evening',
    today_focus: "Today's focus",
    today_tasks: "Today's tasks",
    overdue: 'Overdue', upcoming: 'Upcoming',
    active_projects: 'Active projects',
    month_revenue: 'Month revenue',
    month_expenses: 'Month expenses',
    net_profit: 'Net profit',
    focus_today: 'Focus minutes today',
    streak: 'Streak', days: 'days',
    smart_suggestions: 'Smart suggestions',
    no_tasks_today: 'No tasks for today — enjoy!',
    energy_level: 'Energy level', log_energy: 'Log energy',
    energy_low: 'Low', energy_med: 'Medium', energy_high: 'High',

    clients: 'Clients', client: 'Client', new_client: 'New client',
    client_name: 'Client name', company: 'Company', address: 'Address',
    contact: 'Contact', client_since: 'Client since',
    total_projects: 'Total projects', total_revenue: 'Total revenue',
    select_client: 'Select client', no_client: 'No client',
    client_type: 'Client type',
    type_recurring: 'Recurring', type_occasional: 'Occasional', type_onetime: 'One-time',
    rating: 'Rating',

    projects: 'Projects', project: 'Project', new_project: 'New project',
    project_name: 'Project name', project_type: 'Project type',
    project_status_idea: 'Idea',
    project_status_active: 'Active',
    project_status_in_progress: 'In Progress',
    project_status_review: 'In Review',
    project_status_done: 'Done',
    project_status_archived: 'Archived',
    project_status_cancelled: 'Cancelled',
    project_brief: 'Brief',
    project_progress: 'Progress',
    view_kanban: 'Kanban', view_list: 'List', view_calendar: 'Calendar',
    deadline: 'Deadline', budget: 'Budget',
    estimated_hours: 'Estimated hours', spent_hours: 'Spent hours',

    tasks: 'Tasks', task: 'Task', new_task: 'New task',
    task_title: 'Task title',
    task_status_todo: 'To do', task_status_doing: 'Doing', task_status_done: 'Done', task_status_blocked: 'Blocked',
    estimated_minutes: 'Estimated minutes',
    daily_planner: 'Daily Planner', inbox: 'Inbox', backlog: 'Backlog',
    schedule_today: 'Schedule today', schedule_tomorrow: 'Schedule tomorrow',
    mark_done: 'Mark done', add_subtask: 'Add subtask',

    calendar: 'Calendar', day: 'Day', week: 'Week', month: 'Month',
    sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
    jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',

    invoices: 'Invoices', invoice: 'Invoice', new_invoice: 'New invoice',
    invoice_number: 'Invoice #', issue_date: 'Issue date', paid_date: 'Paid date',
    invoice_status_draft: 'Draft', invoice_status_sent: 'Sent', invoice_status_paid: 'Paid',
    invoice_status_overdue: 'Overdue', invoice_status_cancelled: 'Cancelled',
    mark_paid: 'Mark as paid',
    subscriptions: 'Subscriptions', new_subscription: 'New subscription',
    next_billing: 'Next billing', billing_cycle: 'Billing cycle',
    monthly: 'Monthly', yearly: 'Yearly', weekly_freq: 'Weekly',

    focus_mode: 'Focus Mode', pomodoro: 'Pomodoro',
    start: 'Start', pause: 'Pause', resume: 'Resume', stop: 'Stop', reset: 'Reset',
    break: 'Break', long_break: 'Long break',
    focus_duration: 'Focus duration', short_break: 'Short break',
    sessions_today: 'Sessions today', total_focus_time: 'Total focus time',
    select_project_focus: 'Pick a project to focus on',

    goals: 'Goals', new_goal: 'New goal',
    goal_daily: 'Daily', goal_weekly: 'Weekly', goal_monthly: 'Monthly', goal_yearly: 'Yearly',
    progress: 'Progress', target: 'Target', current: 'Current',

    reports: 'Reports', revenue: 'Revenue', expenses: 'Expenses', productivity: 'Productivity',
    completed_projects: 'Completed projects', completed_tasks: 'Completed tasks',
    avg_project_duration: 'Avg project duration',
    revenue_by_client: 'Revenue by client', revenue_by_month: 'Revenue by month',
    productivity_by_day: 'Productivity by day',
    last_7_days: 'Last 7 days', last_30_days: 'Last 30 days', last_year: 'Last year',

    idea_bank: 'Idea Bank', new_idea: 'New idea', idea_title: 'Idea title',
    idea_category: 'Category',
    cat_logo: 'Logo', cat_branding: 'Branding', cat_social: 'Social', cat_print: 'Print', cat_web: 'Web', cat_other: 'Other',

    rate_calculator: 'Rate Calculator',
    calculator_intro: 'Price your project precisely',
    base_rate: 'Base rate', complexity: 'Complexity',
    rush_factor: 'Rush factor', revisions: 'Revisions',
    final_price: 'Final price', save_as_quote: 'Save as quote',

    settings: 'Settings', language: 'Language', arabic: 'العربية', english: 'English',
    appearance: 'Appearance', accent_color: 'Accent color',
    productivity_settings: 'Productivity settings',
    hourly_rate: 'Hourly rate', week_start: 'Week starts on',
    data: 'Data', export_data: 'Export data', import_data: 'Import data',
    clear_data: 'Clear all data', sample_data: 'Sample data', load_sample: 'Load sample data',
    about: 'About', version: 'Version',

    minutes_short: 'm', hours_short: 'h',
    sar: 'SAR', iqd: 'IQD', usd: 'USD', eur: 'EUR',
    inbox_empty: 'Inbox is empty — tap + to capture an idea quickly',
    notification_overdue: 'You have overdue tasks',
    notification_due_today: 'You have tasks due today',
    install_app: 'Install app',
    install_pwa_hint: 'Install this app on your device for quick access'
  }
};

export function t(key, fallback) {
  const lang = getState().lang || 'ar';
  return (dict[lang] && dict[lang][key]) || (dict.en[key]) || fallback || key;
}

export function getLang() { return getState().lang || 'ar'; }
export function isRTL() { return getLang() === 'ar'; }

export function setLang(lang) {
  setSetting('lang', lang);
  applyLang();
}

export function applyLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

// Apply on init and on store changes
subscribe(() => applyLang());

// Number / currency formatting
export function fmtNumber(n, opts = {}) {
  const lang = getLang();
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', opts).format(n || 0);
}

export function fmtCurrency(amount, currency) {
  const cur = currency || getState().currency || 'IQD';
  const lang = getLang();
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0
    }).format(amount || 0);
  } catch (e) {
    return `${fmtNumber(amount)} ${cur}`;
  }
}

export function fmtDate(date, opts = {}) {
  if (!date) return '—';
  const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
  const lang = getLang();
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts
  }).format(d);
}

export function fmtDateTime(date) {
  return fmtDate(date, { hour: '2-digit', minute: '2-digit' });
}

export function fmtRelative(date) {
  if (!date) return '';
  const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const day = 86400000;
  const days = Math.round(diff / day);
  const lang = getLang();
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { numeric: 'auto' });
  if (Math.abs(days) >= 1) return rtf.format(days, 'day');
  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) >= 1) return rtf.format(hours, 'hour');
  const mins = Math.round(diff / 60000);
  return rtf.format(mins, 'minute');
}
