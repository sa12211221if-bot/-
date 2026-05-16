// Designer OS — i18n with AR/EN + RTL/LTR
import { getState, setSetting, subscribe } from './store.js';

const dict = {
  ar: {
    appName: 'Designer OS',
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

    // Command Center
    command_center: 'مركز القيادة',
    focus_now: 'ركّز الآن',
    next_action: 'الإجراء التالي',
    nothing_planned: 'لا يوجد شيء مُجدول — اختر مهمة لتبدأ',
    pick_focus: 'اختر تركيزك',
    start_focus: 'ابدأ التركيز',
    continue_focus: 'استكمل التركيز',
    deep_work_session: 'جلسة عمل عميق',
    quick_session: 'جلسة سريعة',
    estimated: 'مُقدّر',

    // Modes
    modes: 'الأوضاع',
    mode: 'الوضع',
    mode_deep: 'العمل العميق',
    mode_creative: 'الإبداع',
    mode_islamic: 'الوضع الإسلامي',
    mode_recovery: 'التعافي',
    mode_normal: 'الوضع العادي',
    mode_deep_desc: 'تركيز كامل، مشتتات مخفية',
    mode_creative_desc: 'إلهام، مراجع، أفكار',
    mode_islamic_desc: 'صلاة، قرآن، أذكار',
    mode_recovery_desc: 'راحة، ماء، مشي خفيف',
    switch_mode: 'تبديل الوضع',

    // Mental state / vitals
    mental_state: 'الحالة الذهنية',
    log_state: 'سجّل حالتك',
    vital_focus: 'التركيز',
    vital_mood: 'المزاج',
    vital_energy: 'الطاقة',
    vital_stress: 'التوتر',
    vital_sleep: 'النوم',
    vital_caffeine: 'الكافيين',
    state_logged: 'تم تسجيل الحالة',

    // AI Assistant
    nav_assistant: 'المساعد',
    assistant: 'المساعد الذكي',
    ai_suggestions: 'اقتراحات ذكية',
    ai_summary_title: 'ملخص يومك',
    ai_apply: 'تطبيق',
    ai_dismiss: 'تجاهل',
    ai_breakdown: 'قسّم لي',
    ai_breakdown_hint: 'سأقترح خطوات فرعية لإنجاز هذه المهمة',
    ai_thinking: 'يفكّر...',
    ai_no_suggestions: 'لا توجد اقتراحات الآن — أنت في وضع جيد',
    ai_burnout_warning: 'مؤشرات إرهاق — جرّب وضع التعافي',
    ai_pattern: 'نمط مكتشف',
    ai_priority_shift: 'تغيير في الأولويات',
    ai_recovery_recommendation: 'وقت التعافي',
    ai_deep_work_recommendation: 'وقت العمل العميق',

    // Capture (multi-modal)
    capture: 'التقاط',
    capture_text: 'نص',
    capture_voice: 'صوت',
    capture_image: 'صورة',
    capture_link: 'رابط',
    capture_hint: 'اكتب، أو الصق رابطاً، أو سجّل صوتك...',
    voice_listening: 'يستمع... تحدّث',
    voice_unavailable: 'الصوت غير مدعوم في هذا المتصفح',

    // PARA / Knowledge
    nav_knowledge: 'المعرفة',
    knowledge: 'المعرفة',
    knowledge_subtitle: 'صندوق ثاني لعقلك — كل شيء قابل للوصول',
    para_inbox: 'الواردة',
    para_projects: 'المشاريع',
    para_areas: 'المجالات',
    para_resources: 'الموارد',
    para_archive: 'الأرشيف',
    add_to_inbox: 'إضافة للوارد',
    triage: 'فرز',
    move_to: 'نقل إلى',

    // Habits
    nav_habits: 'العادات',
    habits: 'العادات',
    habits_subtitle: 'بناء الهوية ببناء الأفعال الصغيرة',
    new_habit: 'عادة جديدة',
    habit_name: 'اسم العادة',
    habit_frequency: 'التكرار',
    freq_daily: 'يومي',
    freq_weekly: 'أسبوعي',
    freq_custom: 'مخصص',
    habit_streak: 'سلسلة',
    habit_today: 'اليوم',
    habit_done: 'تم اليوم',
    habit_skip: 'تخطي',
    habit_category: 'الفئة',
    cat_health: 'صحة',
    cat_mind: 'عقل',
    cat_work: 'عمل',
    cat_spirit: 'روحاني',
    cat_relationship: 'علاقات',

    // Reviews
    nav_reviews: 'المراجعات',
    reviews: 'المراجعات',
    reviews_subtitle: 'التأمل اليومي والأسبوعي = نمو',
    daily_review: 'المراجعة اليومية',
    weekly_review: 'المراجعة الأسبوعية',
    start_review: 'ابدأ المراجعة',
    todays_wins: 'إنجازات اليوم',
    todays_friction: 'العقبات',
    energy_reflection: 'تأمل الطاقة',
    unfinished_tasks: 'مهام لم تُنجز',
    tomorrow_priority: 'أولوية الغد',
    week_theme: 'موضوع الأسبوع',
    week_progress: 'تقدّم الأسبوع',
    focus_score: 'نقاط التركيز',
    productivity_pattern: 'نمط الإنتاجية',
    emotional_trend: 'الاتجاه العاطفي',
    review_complete: 'اكتملت المراجعة 🎯',

    // Tasks (new fields)
    energy_required: 'الطاقة المطلوبة',
    estimate_time: 'الوقت المقدّر',
    context_label: 'السياق',
    ctx_computer: 'كمبيوتر',
    ctx_phone: 'جوال',
    ctx_anywhere: 'أي مكان',
    ctx_errands: 'مشاوير',
    smart_filter_now: 'الآن',
    smart_filter_quick: 'مكاسب سريعة',
    smart_filter_deep: 'عمل عميق',

    // Project health
    project_health: 'صحة المشروع',
    health_good: 'جيد',
    health_warning: 'تحذير',
    health_critical: 'حرج',
    last_activity: 'آخر نشاط',
    days_since: 'منذ',

    // Misc
    just_now: 'الآن',
    insights: 'رؤى',
    pulse: 'النبض',
    do_now: 'افعل الآن',
    do_later: 'لاحقاً',
    do_today: 'اليوم',
    or: 'أو',
    minutes_left: 'دقيقة متبقية',
  },
  en: {
    appName: 'Designer OS',
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
    install_pwa_hint: 'Install this app on your device for quick access',

    // Command Center
    command_center: 'Command Center',
    focus_now: 'Focus now',
    next_action: 'Next action',
    nothing_planned: 'Nothing planned — pick a task to start',
    pick_focus: 'Pick your focus',
    start_focus: 'Start focus',
    continue_focus: 'Continue focus',
    deep_work_session: 'Deep work session',
    quick_session: 'Quick session',
    estimated: 'Estimated',

    // Modes
    modes: 'Modes',
    mode: 'Mode',
    mode_deep: 'Deep Work',
    mode_creative: 'Creative',
    mode_islamic: 'Islamic',
    mode_recovery: 'Recovery',
    mode_normal: 'Normal',
    mode_deep_desc: 'Full focus, distractions hidden',
    mode_creative_desc: 'Inspiration, references, ideas',
    mode_islamic_desc: 'Prayer, Quran, Adhkar',
    mode_recovery_desc: 'Rest, hydration, gentle pace',
    switch_mode: 'Switch mode',

    // Mental state
    mental_state: 'Mental state',
    log_state: 'Log state',
    vital_focus: 'Focus',
    vital_mood: 'Mood',
    vital_energy: 'Energy',
    vital_stress: 'Stress',
    vital_sleep: 'Sleep',
    vital_caffeine: 'Caffeine',
    state_logged: 'State logged',

    // AI
    nav_assistant: 'Assistant',
    assistant: 'AI Assistant',
    ai_suggestions: 'Smart suggestions',
    ai_summary_title: 'Your day, summarized',
    ai_apply: 'Apply',
    ai_dismiss: 'Dismiss',
    ai_breakdown: 'Break it down',
    ai_breakdown_hint: 'I will suggest sub-steps for this task',
    ai_thinking: 'Thinking...',
    ai_no_suggestions: 'No suggestions right now — you are in good shape',
    ai_burnout_warning: 'Burnout signals — try Recovery mode',
    ai_pattern: 'Pattern detected',
    ai_priority_shift: 'Priority shift',
    ai_recovery_recommendation: 'Recovery time',
    ai_deep_work_recommendation: 'Deep work window',

    // Capture
    capture: 'Capture',
    capture_text: 'Text',
    capture_voice: 'Voice',
    capture_image: 'Image',
    capture_link: 'Link',
    capture_hint: 'Type, paste a link, or record voice...',
    voice_listening: 'Listening... speak now',
    voice_unavailable: 'Voice not supported in this browser',

    // PARA
    nav_knowledge: 'Knowledge',
    knowledge: 'Knowledge',
    knowledge_subtitle: 'Your second brain — everything reachable',
    para_inbox: 'Inbox',
    para_projects: 'Projects',
    para_areas: 'Areas',
    para_resources: 'Resources',
    para_archive: 'Archive',
    add_to_inbox: 'Add to inbox',
    triage: 'Triage',
    move_to: 'Move to',

    // Habits
    nav_habits: 'Habits',
    habits: 'Habits',
    habits_subtitle: 'Build identity through small actions',
    new_habit: 'New habit',
    habit_name: 'Habit name',
    habit_frequency: 'Frequency',
    freq_daily: 'Daily',
    freq_weekly: 'Weekly',
    freq_custom: 'Custom',
    habit_streak: 'Streak',
    habit_today: 'Today',
    habit_done: 'Done today',
    habit_skip: 'Skip',
    habit_category: 'Category',
    cat_health: 'Health',
    cat_mind: 'Mind',
    cat_work: 'Work',
    cat_spirit: 'Spirit',
    cat_relationship: 'Relationships',

    // Reviews
    nav_reviews: 'Reviews',
    reviews: 'Reviews',
    reviews_subtitle: 'Daily and weekly reflection = growth',
    daily_review: 'Daily review',
    weekly_review: 'Weekly review',
    start_review: 'Start review',
    todays_wins: "Today's wins",
    todays_friction: 'Friction points',
    energy_reflection: 'Energy reflection',
    unfinished_tasks: 'Unfinished tasks',
    tomorrow_priority: "Tomorrow's priority",
    week_theme: 'Week theme',
    week_progress: 'Week progress',
    focus_score: 'Focus score',
    productivity_pattern: 'Productivity pattern',
    emotional_trend: 'Emotional trend',
    review_complete: 'Review complete 🎯',

    // Tasks (new)
    energy_required: 'Energy needed',
    estimate_time: 'Estimated time',
    context_label: 'Context',
    ctx_computer: 'Computer',
    ctx_phone: 'Phone',
    ctx_anywhere: 'Anywhere',
    ctx_errands: 'Errands',
    smart_filter_now: 'Now',
    smart_filter_quick: 'Quick wins',
    smart_filter_deep: 'Deep work',

    // Health
    project_health: 'Project health',
    health_good: 'Good',
    health_warning: 'Warning',
    health_critical: 'Critical',
    last_activity: 'Last activity',
    days_since: 'ago',

    // Misc
    just_now: 'Just now',
    insights: 'Insights',
    pulse: 'Pulse',
    do_now: 'Do now',
    do_later: 'Later',
    do_today: 'Today',
    or: 'or',
    minutes_left: 'min left',
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
