# Designer OS — Personal Command Center

نظام تشغيل شخصي للحياة — للمصممين الفريلانس وما بعد.
A calm, intelligent operating system for life — for freelance designers and beyond.

> **v1.2** — Redesigned as a Personal Command Center with Modes, AI Assistant, Habits, Reviews, and PARA-based Knowledge.

---

## ✨ What It Does

You open it and **know what to do in 2 seconds.**

- **One hero focus block** at the top of every session — the AI picks what matters most right now.
- **A persistent mode** that reshapes the UI around your state: Deep Work, Creative, Islamic, Recovery, Normal.
- **A second brain** organized by PARA (Inbox / Projects / Areas / Resources / Archive).
- **Habits with a 30-day heatmap.** Reviews that turn learning into growth.
- **An AI assistant** that explains your day, detects patterns, and suggests the next move — running entirely on your device.
- **Quick Capture** in <300ms via text, voice, image, or link. Hotkey: `⌘K` / `Ctrl+K`.

---

## 🎯 The 9 Destinations

```
Dashboard     Command Center — what to do RIGHT NOW
Tasks         Execution layer (Now / Quick / Deep smart filters)
Projects      Operational spaces with health indicators
Calendar      Time layer
Knowledge     PARA: Inbox · Projects · Areas · Resources · Archive
Habits        Heatmap + streaks
Reviews       Daily (5-step flow) + Weekly (theme-driven)
Assistant     AI insights, suggestions, daily summary
Settings      Identity + data
```

---

## 🌀 Modes System

Press `M` anywhere to cycle. Or click the mode pill in the top bar.

| Mode | Color | What it does |
|------|-------|--------------|
| **Normal** | Orange | Balanced, full sidebar |
| **Deep Work** | Orange-glow | Distractions hidden, sidebar collapses |
| **Creative** | Purple | Ideas + references prominent |
| **Islamic** | Teal | Prayer/Quran/Adhkar surfaces |
| **Recovery** | Soft green | UI dims, urgency hidden |

---

## 🧠 AI Layer (local-first, OpenAI-ready)

The "AI" is a heuristic engine that *feels* intelligent:

- **Priority scoring** — overdue × priority × due-date weighting
- **Burnout detection** — focus minutes drop ≥40% week-over-week → suggest Recovery
- **Pattern recognition** — finds your peak hour, best day, average session length
- **Daily summary** — bilingual narrative of your day from real data
- **Goal breakdown** — splits complex tasks into 3-6 actionable subtasks (logo / branding / social / generic templates)
- **Suggestions engine** — 8 sources surface as cards with `[Apply]` actions

The contract matches OpenAI's response shape — swapping in a real API later is a one-file change.

---

## 🛠️ Tech (this iteration)

- **Vanilla JS (ES Modules)** — zero build step
- **IndexedDB** — 20 stores, fully offline
- **Service Worker** — cache-first PWA
- **Glassmorphism dark theme** — orange accent + per-mode tints
- **i18n (Arabic + English)** — RTL/LTR auto-flip
- **Web Speech API** — voice capture (where supported)

> The strategy targets Next.js + Supabase + Clerk + OpenAI for v2. Every module here is portable to React with minimal effort. See [`STRATEGY.md`](./STRATEGY.md).

---

## 🚀 Run

### Option 1 — Just open it
Static site. Any HTTP server works:
```bash
python3 -m http.server 8080
# open http://localhost:8080
```

### Option 2 — GitHub Pages (auto-deploy)
A workflow at `.github/workflows/deploy.yml` deploys to Pages on every push to `main`. Enable it in **Settings → Pages → Source: GitHub Actions**.

### Option 3 — Install as PWA
Open in Chrome / Edge / Safari → Install banner appears → tap **Install**. Works offline. Opens like a native app.

---

## ⌨️ Shortcuts

| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl+K` | Quick Capture |
| `M` | Cycle mode |
| `⌘Enter` (in capture) | Save |
| `Esc` | Close modal |

---

## 📦 Project Layout

```
.
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── STRATEGY.md             ← design contract
├── css/styles.css
└── js/
    ├── app.js              entry, routing
    ├── store.js            reactive store + selectors
    ├── db.js               IndexedDB layer (20 stores)
    ├── i18n.js             AR/EN, RTL/LTR
    ├── modes.js            Modes engine (5 modes)
    ├── ai.js               Heuristic AI engine
    ├── capture.js          Multi-modal Quick Capture
    ├── layout.js           Shell (sidebar, topbar, bottom-nav)
    ├── ui.js, utils.js, icons.js, router.js, seed.js
    └── pages/
        ├── dashboard.js    Command Center (hero + pulse + vitals + AI + summary)
        ├── tasks.js        smart filters + AI breakdown
        ├── projects.js     Kanban/list/timeline + health
        ├── calendar.js
        ├── knowledge.js    PARA 5-column hub
        ├── habits.js       30-day heatmap + streaks
        ├── reviews.js      daily 5-step flow + weekly
        ├── assistant.js    AI insights + patterns + tools
        ├── settings.js
        └── (legacy: clients, invoices, focus, goals, reports, ideas, calculator)
```

---

## 🔄 Sync Between Devices

Local-first. Settings → Data → Export/Import JSON.

For automatic sync: the architecture is ready for Supabase. v2 plan in [`STRATEGY.md`](./STRATEGY.md).

---

## 📜 License

Personal project. Free to fork, modify, use.
