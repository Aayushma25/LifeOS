# LifeOS — Phase 1 + Phase 2 + Phase 3 + Phase 4

A self-hosted, localhost-only productivity platform. This build now includes:

**Phase 1 — Foundation**
- Job Application Tracker
- Notes
- Tasks (list + Kanban, with subtasks)
- Calendar

**Phase 2 — Study & Goals**
- Study Planner (subjects/courses, exams, study sessions, attendance, GPA calculator)
- Assignment Manager
- Flashcard System (with quiz mode)
- Goal Tracker (with milestones)

**Phase 3 — Security Tools**
- Password Vault (AES-256-GCM encryption, master password, generator, strength checker)
- Hash Tools (MD5/SHA-1/SHA-256/SHA-512 generation + comparison)
- Security Log Analyzer (failed-login & brute-force detection, suspicious IPs, CSV/PDF export)

**Phase 4 — Money, Habits, People & Insights**
- Expense Tracker (income/expenses, budgets, monthly charts, CSV export)
- Habit Tracker (streaks, 14-day grid, completion rate)
- Contact Manager / Personal CRM (recruiters, clients, networking, follow-up reminders)
- Analytics Dashboard (charts pulling from every module: jobs, study hours, expenses, tasks, habits, goals)

It's 100% free, open source, runs entirely on your machine, and needs no cloud services, paid APIs, or AI models.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Recharts (ready for later modules)
- **Backend:** Node.js, Express
- **Database:** SQLite via Prisma
- **Auth:** JWT + bcrypt, with rate limiting and input validation

## Project structure

```
lifeos/
├── backend/           Express API + Prisma schema
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── routes/
│       ├── middleware/
│       └── server.js
└── frontend/          React + Vite app
    └── src/
        ├── pages/
        ├── components/
        └── context/
```

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later (v20+ recommended)
- npm (comes with Node)

No internet connection is required after the initial `npm install`.

## 1. Backend setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed        # optional: creates a demo account with sample data
npm run dev
```

> **Upgrading from an earlier phase?** Just run `npx prisma migrate dev --name phase4` again from `backend/` after pulling these files — it will add the new Expenses / Habits / Contacts tables without touching your existing data.

The API runs at **http://localhost:4000**.

The seed script creates a demo login:
- **Username:** `demo`
- **Password:** `Password123!`

> The first account you register through the UI is automatically made an **admin**. Subsequent registrations are regular users.

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app runs at **http://localhost:5173**.

Open that URL, register an account (or log in with the seeded `demo` account), and you're in.

## What's included in Phase 1

### Foundation
- Registration / login with JWT, bcrypt password hashing, and rate-limited auth endpoints
- Protected routes, persistent session (token stored in `localStorage`)
- Sidebar + topbar layout, responsive down to mobile, with a slide-out nav
- Light/dark mode toggle (warm cream + soft blue theme in light mode)
- Dashboard with live stats pulled from the API: job pipeline summary, task summary, upcoming tasks/events, recent notes

### Job Application Tracker
- Full CRUD, all fields from the spec (company, position, department, location, salary, dates, recruiter info, job URL, notes)
- Status pipeline (Wishlist → Applied → Assessment → Interview Scheduled → Interviewed → Offer Received / Rejected / Accepted)
- Search, status filter, CSV export
- Per-status analytics surfaced on the dashboard and via `/api/jobs/stats`

### Notes
- Rich text area with autosave-style manual save, title + content
- Pin, favorite, archive, search
- Two-pane layout: list on the left, editor on the right

### Tasks
- List view and Kanban view (3 columns: Pending / In Progress / Completed)
- Subtasks (expand a task to add/manage subtasks inline)
- Priority (Low/Medium/High), due dates, labels
- Quick status change from a dropdown or Kanban move buttons

### Calendar
- Month grid with day selection, double-click a day to add an event there
- Event types: Event, Deadline, Exam, Interview, Meeting (each color-coded)
- Day detail panel listing events for the selected day, with edit/delete

### Study Planner
- Subjects/courses with code, instructor, credits, semester, color, and final letter grade
- **GPA calculator**: credit-weighted, standard 4.0 scale, recomputed live from any subject with a grade set
- Per-subject detail panel with three tabs:
  - **Exams** — quiz/midterm/final/practical tracking with dates
  - **Study sessions** — log session length and notes (the revision-planner log)
  - **Attendance** — one-tap present/absent/excused, with a running attendance percentage

### Assignment Manager
- Full CRUD, linked to a subject from the Study Planner (or left unlinked)
- Priority, deadline, submission date, status (Not started → In progress → Submitted → Graded)
- Quick status dropdown per row, overdue items flagged in red
- Filter by status and by subject

### Flashcard System
- Create cards with a front/back and an optional subject
- **Quiz mode**: full-screen, tap-to-reveal review flow that records right/wrong per card and shows a results summary at the end
- Per-card accuracy badge based on review history

### Goal Tracker
- Short-term / long-term goals with a target date and free-text description
- Milestones per goal — checking one off automatically recalculates the goal's progress bar
- Manual "mark complete" action; status badge (Active / Completed / Abandoned)

### Password Vault
- **Zero-knowledge-style encryption**: your master password is never stored. Setup generates a random salt and an encrypted "check value"; unlocking re-derives the AES-256 key with PBKDF2 (100,000 iterations) and verifies it against that check value.
- Every entry's password (and notes) is encrypted individually with AES-256-GCM — random IV per entry, authenticated so tampering is detected.
- The master password lives only in your browser's memory for the current session (never `localStorage`, never sent anywhere except the one request that needs it). Lock the vault or refresh the page and it's gone.
- Built-in password generator (length, character sets, ambiguous-character exclusion) and a strength checker — both run **entirely client-side**, nothing is sent to the server.
- "Change master password" re-encrypts every entry in a single transaction.

### Hash Tools
- Generate MD5, SHA-1, SHA-256, and SHA-512 for pasted text or an uploaded file (hashed in Node, not in-browser, so it works for any file type)
- Hash comparison tool for verifying file integrity / detecting changes between two hashes

### Security Log Analyzer
- Paste log content or upload a `.log`/`.txt` file
- Auto-detects Linux auth logs (`sshd`, failed/accepted password lines) and Apache/Nginx access logs (combined log format); falls back to a generic IP + failure-keyword scan for anything else
- Flags IPs as **Brute force** (5+ failures) or **Suspicious** (2+ failures), with full per-IP breakdown
- Keeps a history of past analyses; export any analysis as CSV, or use **Print → Save as PDF** for a clean report (works in any browser, no extra dependency needed)

### Expense Tracker
- Income and expense transactions with category, description, and date
- Per-category monthly budgets with a progress bar and an "over budget" flag
- Income-vs-expense bar chart for the last 6 months (Recharts)
- CSV export of all transactions

### Habit Tracker
- Daily or weekly habits, each with a color
- A 14-day tap-to-toggle grid per habit (click any day to mark it done/undone — not just today, so you can backfill)
- Automatic streak calculation (consecutive days, generous about "today" not being logged yet) and a 30-day completion rate

### Contact Manager / Personal CRM
- Contacts categorized as Recruiter / Client / Networking / Other, with company, position, email, phone, and notes
- Follow-up dates with overdue highlighting
- Search and category filtering

### Analytics Dashboard
- One aggregated `/api/analytics/overview` call powers six charts: job pipeline (donut), study hours (line, 8 weeks), expense report (bar, 6 months), tasks completed (bar, 14 days), habit streaks, and goal progress — all via Recharts, already wired into the dashboard's design tokens for light/dark mode

## Security notes

- Passwords hashed with bcrypt (12 rounds); vault entries encrypted with AES-256-GCM, key derived via PBKDF2-SHA256 (100,000 iterations)
- JWT-based sessions with a configurable expiry
- `helmet` for HTTP headers, `cors` locked to your frontend origin, rate limiting on all `/api` routes (tighter limits on auth)
- All input validated server-side with `express-validator`
- Prisma's parameterized queries prevent SQL injection
- Every resource is scoped to `req.user.id` — there's no way for one account to read another's data via the API
- The vault's master password is never persisted in the database or in browser storage — losing it means the encrypted entries can't be recovered, by design

## What's next (not in this build)

The remaining modules from the original brief (resume manager, cover letter manager, internship tracker, skill tracker, daily journal, subscription tracker, savings goal tracker, document vault, file organizer, IOC tracker, CTF manager, bookmark manager, reading tracker, report generator, backup & restore, admin panel) follow the same pattern established here: a Prisma model, an Express router scoped to `req.user.id`, and a React page using the same `Card` / `Button` / `Modal` primitives. Let me know which batch you'd like built next and I'll continue in the same style.

## Troubleshooting

- **"Cannot find module '@prisma/client'"** — run `npx prisma generate` inside `backend/` after `npm install`.
- **CORS errors** — make sure `CORS_ORIGIN` in `backend/.env` matches the URL the frontend is actually running on.
- **Port already in use** — change `PORT` in `backend/.env` or the `server.port` in `frontend/vite.config.ts`, and update `VITE_API_URL` in `frontend/.env` to match.
