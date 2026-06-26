import { NavLink } from "react-router-dom";
import { LayoutDashboard, Briefcase, StickyNote, ListChecks, CalendarDays, Sparkles, GraduationCap, ClipboardList, Brain, Target, KeyRound, Hash, ShieldAlert, Wallet, Flame, Users, BarChart3 } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Job Tracker", icon: Briefcase },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/study", label: "Study Planner", icon: GraduationCap },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/flashcards", label: "Flashcards", icon: Brain },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/vault", label: "Password Vault", icon: KeyRound },
  { to: "/hash-tools", label: "Hash Tools", icon: Hash },
  { to: "/security-logs", label: "Security Logs", icon: ShieldAlert },
  { to: "/expenses", label: "Expense Tracker", icon: Wallet },
  { to: "/habits", label: "Habit Tracker", icon: Flame },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 md:flex print:hidden">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
          <Sparkles size={18} />
        </div>
        <span className="text-lg font-semibold text-text">LifeOS</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-accent text-accent-fg" : "text-text hover:bg-card"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <p className="px-2 text-xs text-muted">Phase 1+2+3+4 · 15 modules live</p>
    </aside>
  );
}
