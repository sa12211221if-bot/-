# Designer OS

نظام شخصي متكامل لإدارة العمل الإبداعي للمصممين الفريلانس.

A complete personal management system for freelance designers — clients, projects, tasks, focus, invoices, goals, and reports — running entirely in the browser with offline support.

---

## ✨ المميزات

- **🏠 Dashboard ذكية** — مهام اليوم، مشاريع نشطة، إيرادات الشهر، متتبع الطاقة، اقتراحات ذكية
- **👥 إدارة العملاء (CRM)** — معلومات العميل، تاريخ المشاريع، إجمالي الإيرادات
- **📋 المشاريع** — لوحة Kanban (سحب وإفلات) + قائمة + Timeline
- **✅ مخطط يومي للمهام** — تصفية اليوم/غداً/الأسبوع/المتأخرة، Inbox للالتقاط السريع
- **📅 تقويم شامل** — كل المهام والمواعيد والفواتير في مكان واحد
- **💰 الفواتير والاشتراكات** — تتبع المدفوعات + اشتراكات متكررة (Adobe, Figma, ...)
- **🎯 وضع التركيز** — Pomodoro كامل مع ربط بالمشروع وتسجيل الوقت
- **🚩 الأهداف** — يومي/أسبوعي/شهري/سنوي + سلسلة إنجاز (30-day heatmap)
- **📊 التقارير** — رسوم بيانية للإيرادات والإنتاجية ووقت التركيز
- **💡 بنك الأفكار** — تصنيفات + تثبيت
- **🧮 حاسبة التسعير** — حساب احترافي مع التعقيد والاستعجال والمراجعات
- **⚙️ الإعدادات** — لغة (عربي/إنجليزي)، لون مميز، تصدير/استيراد بيانات JSON

## 🛠️ التقنيات

- **Vanilla JS (ES Modules)** — بدون build step، يعمل مباشرة
- **IndexedDB** — قاعدة بيانات محلية كاملة (بدون فقدان بيانات)
- **Service Worker** — يعمل أوفلاين تماماً
- **PWA** — قابل للتثبيت على اللابتوب والجوال
- **Glassmorphism Design** — Dark mode مع لون برتقالي مميز
- **i18n كامل** — عربي/إنجليزي + RTL/LTR ديناميكي

## 🚀 التشغيل المحلي

أي من الطرق التالية:

### الطريقة 1: Python (الأبسط)
```bash
python3 -m http.server 8080
# افتح http://localhost:8080
```

### الطريقة 2: Node.js
```bash
npx serve .
```

### الطريقة 3: نشر مباشر
ارفع الملفات على أي استضافة ثابتة:
- **GitHub Pages** — push to `main` and enable Pages
- **Netlify Drop** — اسحب المجلد إلى netlify.com/drop
- **Vercel** — `vercel --prod`
- **Cloudflare Pages**

## 📱 التثبيت كتطبيق PWA

1. افتح الموقع في Chrome/Edge/Safari
2. اضغط على زر "Install" في شريط العنوان
3. التطبيق سيظهر كأي تطبيق آخر على جهازك

## 📦 هيكل المشروع

```
.
├── index.html              # نقطة البداية
├── manifest.webmanifest    # PWA manifest
├── service-worker.js       # Offline support
├── css/styles.css          # Glassmorphism design system
├── js/
│   ├── app.js              # Entry point + router setup
│   ├── db.js               # IndexedDB layer
│   ├── store.js            # Reactive state store
│   ├── i18n.js             # Bilingual translations
│   ├── icons.js            # 60+ inline SVG icons
│   ├── ui.js               # Modal, toast, form helpers
│   ├── utils.js            # DOM, date, format helpers
│   ├── router.js           # Hash router
│   ├── layout.js           # Shell (sidebar + topbar + FAB)
│   ├── seed.js             # Sample data generator
│   └── pages/              # All 12 pages
│       ├── dashboard.js
│       ├── clients.js
│       ├── projects.js
│       ├── tasks.js
│       ├── calendar.js
│       ├── invoices.js
│       ├── focus.js
│       ├── goals.js
│       ├── reports.js
│       ├── ideas.js
│       ├── calculator.js
│       └── settings.js
└── assets/                 # Icons (PNG + SVG)
```

## 🔄 المزامنة بين الأجهزة

التطبيق محلي بالكامل (لا يحتاج سيرفر). للمزامنة بين أجهزتك:

1. **التصدير/الاستيراد اليدوي**: من الإعدادات > البيانات > تصدير → ينزّل ملف JSON
2. **استورد** الملف على الجهاز الآخر

> 🔮 **مستقبلاً:** يمكن إضافة Supabase / Firebase للمزامنة التلقائية. الكود مهيأ لذلك.

## 🌐 التكاملات المخططة

- ✅ Notion API — لمزامنة المهام والمشاريع
- ✅ Telegram Bot — تنبيهات وإضافة مهام عن بُعد
- ✅ Google Calendar — مزامنة المواعيد
- ✅ نظام Webhooks للسوشيال ميديا

## 📜 الترخيص

مشروع شخصي. حر التعديل والاستخدام.
