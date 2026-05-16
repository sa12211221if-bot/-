# Designer OS → Personal Command Center

## Vision

Transform Designer OS from a productivity dashboard into a **calm, intelligent, action-oriented operating system for life** — a daily-dependence tool that fuses Notion's depth, Linear's clarity, Arc's elegance, Motion's intelligence, and Apple's restraint.

This document is the design contract.

---

## 1. Core Philosophy

| Principle | Meaning in this product |
|-----------|--------------------------|
| **Calm over cluttered** | One dominant element per screen. Whitespace is a feature. |
| **Action over storage** | Every screen answers "what do I do next?" not "where is my stuff?" |
| **Intelligence is invisible** | AI surfaces decisions, never asks the user to choose between 12 stats. |
| **Modes over menus** | The system reshapes itself around the user's current state. |
| **Speed is sacred** | Quick Capture in <300ms. Page transitions in <120ms. Zero blocking spinners. |
| **Emotional comfort** | Dark, deep, warm. Orange accent like a fireplace, not a billboard. |

---

## 2. Information Architecture

### Old (12 flat items)
Dashboard · Tasks · Projects · Clients · Calendar · Focus · Invoices · Goals · Reports · Ideas · Calculator · Settings

### New (9 grouped items)

```
PRIMARY (always visible)
├── Dashboard      Command Center — what to do RIGHT NOW
├── Tasks          Execution layer
├── Projects       Operational spaces
├── Calendar       Time layer
├── Knowledge      PARA: Inbox · Projects · Areas · Resources · Archive
├── Habits         Behavioral layer (heatmap + streaks)
├── Reviews        Reflection layer (daily + weekly)
├── Assistant      AI second brain
└── Settings       Identity + preferences
```

**Why fewer items?**
- Clients, Invoices, Calculator → moved into **Areas** (PARA) inside Knowledge
- Ideas → moved into **Resources** (PARA)
- Goals → merged into **Reviews** + **Habits**
- Focus → no longer a page; it's a **Mode** (always one click away)
- Reports → embedded into **Reviews** (insights in context, not in isolation)

The user goes from 12 destinations to 9 with deeper meaning.

---

## 3. Visual Hierarchy (5 Layers)

Every screen respects this exact cascade:

1. **Current focus** — One thing. Hero size. Cinematic.
2. **Active tasks** — 3 max. Card format with energy/time tags.
3. **Critical info** — Mode banner, overdue badge, next event.
4. **Secondary** — Today's schedule, habit progress.
5. **Passive stats** — Compressed strip at bottom or in Reviews only.

The eye travels: hero → next action → context → glance → ignore.

---

## 4. Dashboard = Command Center

### Layout (top to bottom on desktop, single column on mobile)

```
┌─────────────────────────────────────────────────────────┐
│ TOP BAR                                                 │
│ 12:47  ·  Saturday, May 16  ·  Asr 3:32   🔍   🔔   🌙 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│            ╔══════════════════════════════╗             │
│            ║   FOCUS NOW                  ║             │
│            ║                              ║             │
│            ║   Eid Campaign — Designs     ║             │
│            ║   Deep work · 90 min         ║             │
│            ║                              ║             │
│            ║   [▶ Start Focus]            ║             │
│            ╚══════════════════════════════╝             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ TODAY · 3 TASKS                    UPCOMING · 14:30     │
│ ─ Send brief revisions             Client call          │
│ ─ Approve color palette                                 │
│ ─ Export PDF                       MODE: Deep Work      │
├─────────────────────────────────────────────────────────┤
│ ENERGY     FOCUS    MOOD     SLEEP    HABITS · 3/5      │
│   ●●●○      ●●●●     ●●○○     ●●●○      ████░          │
├─────────────────────────────────────────────────────────┤
│ ASSISTANT                                               │
│ "You have unfinished deep work from Tue. Energy is      │
│  high — start with the Eid Campaign now (~90 min)."     │
│                                              [Apply →]  │
└─────────────────────────────────────────────────────────┘
```

**No KPI stat cards.** No revenue, no project counts, no "completed tasks" widget. Those live in Reviews.

---

## 5. Modes System

A persistent mode pill in the top bar that **slightly reshapes the entire UI**:

| Mode | Tint | Sidebar | Effect |
|------|------|---------|--------|
| **Deep Work** | Orange (default) | Collapsed to icons | Distractions hidden, timer visible, only active project surfaces |
| **Creative** | Purple | Sidebar shows Resources/Knowledge first | Ideas, moodboards, references prominent |
| **Islamic** | Teal | Adds prayer widget at top | Prayer times, Quran, Adhkar, spiritual goals |
| **Recovery** | Soft green | UI dims, low contrast | Hydration nudge, walking timer, no urgent tasks shown |

Implementation: a single `data-mode="..."` attribute on `<html>`. CSS variables shift. No page reload.

---

## 6. Task System Redesign

### Old task fields
title, description, status, priority, dueDate, projectId

### New task fields
- **title**
- **priority** (high/med/low)
- **energy** (high/med/low) — *new*
- **estimateMin** (5-180) — *new*
- **context** (computer/phone/anywhere/errands) — *new*
- **tags** (array) — *new*
- **projectId** / **areaId**
- **dueDate**
- **status**

### Task card UI
```
○ Send brief revisions
  ⚡ medium · ⏱ 25m · 🏷 client-work
```

### AI Breakdown action
For tasks marked complex, a "Break down" action invokes the heuristic AI to suggest 3-5 subtasks.

### Smart filters
- **Right now** (matches energy + context + time available)
- **Today**
- **Quick wins** (<15 min)
- **Deep work** (>60 min, high energy)

This makes tasks **executable**, not just listed.

---

## 7. Projects: Operational Spaces

Each project page becomes an "operations room":

- **Health indicator** (green/yellow/red): based on (a) progress vs deadline, (b) overdue tasks, (c) days since last activity
- **Linked tasks** (live)
- **Notes** (single editable area)
- **Assets** (links + uploaded files via FileReader → IndexedDB)
- **AI summary** (regenerated on demand: 3-line state of the project)

---

## 8. PARA — Knowledge Layer

Implemented as a single **Knowledge** page with 5 columns:

```
┌────────┬──────────┬───────┬───────────┬─────────┐
│ Inbox  │ Projects │ Areas │ Resources │ Archive │
└────────┴──────────┴───────┴───────────┴─────────┘
```

- **Inbox**: everything captured via Quick Capture lands here for triage
- **Projects**: active outcome-based work (links to Projects module)
- **Areas**: ongoing responsibilities (Health, Finance, Clients, Family...)
- **Resources**: reference material (Ideas, references, articles)
- **Archive**: completed/dormant

Drag between columns to recategorize. PARA is implemented as a **single store** with a `category` field.

---

## 9. Reviews

### Daily Review (3-minute flow)
1. Three wins today
2. One failure / friction point
3. Energy reflection (1-5 + text)
4. Unfinished tasks → reschedule or drop
5. Tomorrow's top 1 priority

### Weekly Review (10-minute flow)
1. Progress on weekly goals
2. Habit consistency (auto from data)
3. Focus score (auto: % of planned focus time achieved)
4. Productivity pattern (auto: best/worst day)
5. Emotional trend (energy/mood line chart)
6. Next week's theme

Reviews are **stored** so trends emerge.

---

## 10. AI Layer (Heuristic, no API needed yet)

The "AI" is a **rules engine + scoring** that *feels* intelligent. Later it can plug into OpenAI seamlessly because the contract is the same.

### Capabilities
- **Priority scoring**: weight = priority × (1 + overdue) × energy_match × time_fit
- **Burnout detector**: if focus minutes drop >40% week-over-week + low energy logs → suggest Recovery Mode
- **Daily summary**: template-filled paragraph from today's data
- **Goal breakdown**: heuristic split using common patterns (Logo → research, sketch, vector, present)
- **Pattern detection**: best hour-of-day for focus from session history
- **Recovery recommendation**: triggered when energy < 2 for 2 consecutive days

### UI contract
Every AI suggestion is a card with:
```
┌───────────────────────────────────┐
│ 💡 Suggestion title               │
│    One-sentence reasoning.        │
│              [Dismiss] [Apply →]  │
└───────────────────────────────────┘
```

Apply executes a concrete action (start focus, reschedule, change mode).

---

## 11. Quick Capture

Persistent FAB → opens a **bottom sheet** (mobile) or **centered modal** (desktop) in <100ms.

Inputs:
- **Text** (default, autofocused)
- **Voice** (Web Speech API → text)
- **Image** (file picker → IndexedDB blob)
- **Link** (auto-detect URL → store as resource)

All captures land in **Knowledge → Inbox** for triage.

Hotkey: `Cmd/Ctrl + K`.

---

## 12. Visual Direction

### Color
- Background: `#0a0a0d` (near black)
- Surfaces: `rgba(255,255,255,0.04)` glass
- Accent: `#FF6B35` (current orange, kept)
- Mode tints applied via CSS variables

### Typography
- Display: Inter / SF Pro at 600-700 weight, tight tracking
- Body: 14px / 1.5
- Mono for numbers (timers, progress)

### Motion
- Page transitions: 220ms cubic-bezier(.22,1,.36,1)
- Hover: 160ms
- Mode switch: 280ms cross-fade
- No bounces, no flashy effects

### Glass
Subtle. 18px blur, 4-7% white overlay, 1px border at 8% opacity. Never stacked more than 2 deep.

---

## 13. Responsive

- **Desktop ≥1100px**: sidebar + main, hero is 2-column
- **Tablet 720-1099px**: sidebar collapses to icons, hero stacks
- **Mobile <720px**: bottom nav (5 items: Dashboard, Tasks, Capture+, Knowledge, Assistant), top bar collapses to clock + mode, hero is full-width

---

## 14. Tech Stack (current pragmatic choice)

The strategy targets Next.js + Supabase + Clerk + OpenAI for v2. **For v1.1 (this iteration)** we keep the existing zero-build vanilla JS architecture because:
1. The user wants daily dependence — fastest to iterate
2. PWA + IndexedDB already covers offline and install
3. Heuristic AI works locally; OpenAI plugs in later via a single `aiClient` interface
4. Migration path: each module is a single file, portable to React with minimal effort

---

## 15. Success Criteria

The redesign is successful when the user:
- Opens the app and **knows what to do in 2 seconds**
- Captures an idea **without breaking flow**
- Returns daily **without being asked**
- Switches between modes when their state changes
- Completes a daily review **on their own** within a week
- Says "this is my brain's home"
