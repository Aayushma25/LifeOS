import { NavLink } from "react-router-dom";
import { LayoutDashboard, Briefcase, StickyNote, ListChecks, CalendarDays, X, GraduationCap, ClipboardList, Brain, Target, KeyRound, Hash, ShieldAlert, Wallet, Flame, Users, BarChart3 } from "lucide-react";

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

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex w-64 flex-col bg-surface px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-lg font-semibold text-text">LifeOS</span>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-card" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-accent text-accent-fg" : "text-text hover:bg-card"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
