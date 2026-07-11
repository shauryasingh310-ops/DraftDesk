# DraftDesk — IA & Interaction Model Plan

> Portfolio-grade redesign plan. This document defines the information
> architecture and interaction model. Component build starts after approval.

---

## 1. Information Architecture

### Layout shell (single persistent frame)
```
┌─────────────┬──────────────────────────────────────────────┐
│             │  Topbar (contextual)                          │
│  Sidebar    ├──────────────────────────────────────────────┤
│  (240px)    │                                              │
│             │  Content slot (per-screen)                   │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

**Sidebar (left, persistent, 240px, collapsible to 64px on `⌘\`)**
- Wordmark "DraftDesk" (top)
- Primary nav (icon + label):
  - **Dashboard** (`/`) — overview
  - **Inbox** (`/tickets`) — ticket triage
  - **Knowledge Base** (`/knowledge`) — CMS
- Bottom: agent avatar + name, sign-out

**Topbar (per-screen, 56px)**
- Left: page title / breadcrumb
- Center-right: **Search trigger** (`⌘K` hint chip) — opens command palette
- Right: **New Ticket** primary button (Inbox/KB only)
- On Ticket Detail: inline status `<Select>` + priority chip live in the topbar

**Command Palette (`⌘K`)** — global overlay
- Navigate: jump to any ticket (by title/customer), open KB article
- Actions: New Ticket, Go to Dashboard, Go to Knowledge Base, Toggle theme
- Fuzzy filter, arrow-key nav, `Enter` to execute, `Esc` to close

**Navigation depth: max 2 levels.** Sidebar → section → item. No nested trees.

---

## 2. Design Tokens (enforced globally)

### Spacing (4px grid)
`--space-1:4px --space-2:8px --space-3:12px --space-4:16px --space-6:24px --space-8:32px --space-12:48px --space-16:64px`
All margins/paddings/gaps snap to these. No arbitrary values.

### Type scale (px)
`12 / 14 / 16 / 20 / 24 / 32 / 48`
- Body: 16 / line-height 1.5
- Headings: line-height 1.2
- UI font: **Inter** (or Geist Sans); numbers/code: **Geist Mono / JetBrains Mono**
- Weights limited to: 400 (body), 500 (emphasis), 600 (labels), 700 (display)

### Color (restraint)
- 3 neutral grays: `--bg`, `--surface`, `--muted` (text)
- 1 accent: `--accent` (indigo/blue, used ONLY for primary action, focus, active nav)
- Status colors (carry *meaning* — allowed): open=neutral, in_progress=amber, resolved=green, urgent=red. Used only as small dots/pills.
- Border: 1px `--border` (low-contrast)
- Radius: inputs 6px, cards/modals 12px, default 8px

### Motion
- `150–250ms ease-out` on state changes (enter/exit, expand/collapse). Hard cap 300ms.
- `prefers-reduced-motion: reduce` → all transitions → 0ms.

### Focus
- `2px solid accent` outline, `2px` offset, visible on keyboard focus, never removed.

### Contrast
- Body text ≥ 4.5:1, large text/icons ≥ 3:1 (WCAG AA).

---

## 3. Screen-by-Screen

### A. Dashboard (`/`) — first screen after login
**Above the fold (what a returning agent needs):**
- Metrics row (4 stat cards, 12px radius): Open, Awaiting your review (unapproved drafts), Resolved today, KB articles indexed. Numbers in mono.
- **Continue working** — 3–5 most recent/updated tickets (one-tap resume).
- **AI health** — KB indexed count + last embed status (builds trust in the RAG).

States: loading (skeleton stat cards + list rows), empty (welcome + "create first ticket"), error (retry), success.

### B. Ticket Inbox (`/tickets`) — triage, not a spreadsheet
- Toolbar: search input (filters as you type), status filter, priority filter, sort (updated/created/priority).
- **Row-based list** (not cards): `[status dot] Title · Customer · Priority pill · Updated`. Compact, 8px rhythm.
- **Keyboard-first:** `j/k` move selection, `Enter` opens, `/` focuses search, `⌘K` palette.
- Hover/selected row uses `--surface` tint + accent left-border (2px) on selected.
- Optimistic status change via inline menu (no full reload).

States: loading (skeleton rows matching row shape), empty (first-run: "No tickets — create one"), error (inline retry), success.

### C. Ticket Detail (`/tickets/[id]`) — two-panel core
- **Left (≈58%): Conversation thread** — customer message(s) + final response, chronological, chat-style bubbles with role labels.
- **Right (≈42%, sticky): AI Draft Review panel** — the "aha" surface.
  - Draft rendered with **inline citation tokens** (superscript `[1]` style, accent-tinted, clickable).
  - Clicking a token opens a **source drawer** (slide-in from right, 200ms) showing the KB article excerpt + "Open article" link. Does not break reading flow.
  - Action set: **Approve** (optimistic, fills response, toast w/ undo), **Edit** (inline textarea), **Reject/Regenerate**.
- Topbar holds status `<Select>` + priority for fast triage without leaving the panel.

### D. AI Draft Review (the trust moment)
- Citations visually distinct but quiet: small superscript chip, accent text on hover.
- "Grounded in N sources" header badge → earns trust at a glance.
- Approve = optimistic; spinner replaced by instant state flip + toast (4s, undo if reversible).
- Loading: skeleton matching draft paragraph shapes. Error: inline "regenerate" CTA.

### E. Knowledge Base Manager (`/knowledge`) — lightweight CMS
- Two-column: **list** (left, 320px) + **editor** (right). List shows title, category chip, updated date.
- Editor: title input, category, tags, content textarea (mono for code blocks), Save.
- On save → triggers re-embed (existing `createKbEmbeddings`), toast "Indexed N chunks".
- **Empty first-run:** friendly guide "Add your first article to power AI drafts" + sample template button.

---

## 4. Interaction Details

- **⌘K palette:** global, fuzzy, keyboard-complete.
- **Optimistic UI:** status change + draft approve update immediately; rollback on error with error toast.
- **Skeletons:** shaped to final layout (rows, stat cards, draft paragraphs) — never generic spinners for reversible actions.
- **Toasts:** ~4s auto-dismiss, undo where reversible (approve/reject/status), bottom-right, 8px radius, 200ms slide-in.
- **Keyboard:** full flow mouse-free; visible tab order; `j/k` in lists; focus rings everywhere.
- **Citations:** clickable, jump to source drawer, non-distracting.

---

## 5. Build Order (post-approval)
1. Design tokens + `globals.css` `@theme` + font setup (Inter/Geist).
2. `UiShell` (sidebar + topbar) + `CommandPalette` + `Toast` provider.
3. Primitives refresh (Button, Card, Badge, Input, Select) to token system.
4. Dashboard screen.
5. Tickets inbox (list + filter/sort + keyboard + skeletons).
6. Ticket detail two-panel + AI draft review + citations + optimistic toasts.
7. Knowledge base manager + empty first-run.
8. Reduced-motion + focus-ring audit + contrast check.

---

*Every decision above optimizes for: resolve tickets accurately + fast. Approve structure to begin the component build.*
