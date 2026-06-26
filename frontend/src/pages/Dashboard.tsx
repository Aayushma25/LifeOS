import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ListChecks, CalendarDays, StickyNote, ClipboardList, Target, Wallet, Flame } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { api } from "../lib/api";
import type { DashboardData } from "../types";
import { format } from "date-fns";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
        <p className="text-sm text-muted">{format(now, "EEEE, MMMM d, yyyy · h:mm a")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Briefcase}
          label="Job applications"
          value={data?.jobSummary.total ?? "–"}
          sub={`${data?.jobSummary.interviews ?? 0} interviews · ${data?.jobSummary.offers ?? 0} offers`}
          to="/jobs"
        />
        <StatCard
          icon={ListChecks}
          label="Tasks"
          value={data?.taskSummary.total ?? "–"}
          sub={`${data?.taskSummary.inProgress ?? 0} in progress · ${data?.taskSummary.completed ?? 0} done`}
          to="/tasks"
        />
        <StatCard
          icon={ClipboardList}
          label="Assignments due soon"
          value={data?.upcomingAssignments.length ?? "–"}
          sub="Next 7 days"
          to="/assignments"
        />
        <StatCard
          icon={Target}
          label="Active goals"
          value={data?.activeGoals.length ?? "–"}
          sub="In progress"
          to="/goals"
        />
        <StatCard
          icon={CalendarDays}
          label="Upcoming events"
          value={data?.upcomingEvents.length ?? "–"}
          sub="Next 7 days"
          to="/calendar"
        />
        <StatCard
          icon={StickyNote}
          label="Recent notes"
          value={data?.recentNotes.length ?? "–"}
          sub="Updated recently"
          to="/notes"
        />
        <StatCard
          icon={Wallet}
          label="Net this month"
          value={data ? `$${data.expenseSummary.net.toFixed(0)}` : "–"}
          sub={data ? `$${data.expenseSummary.income.toFixed(0)} in · $${data.expenseSummary.expense.toFixed(0)} out` : ""}
          to="/expenses"
        />
        <StatCard
          icon={Flame}
          label="Habits tracked"
          value={data?.habitCount ?? "–"}
          sub="Tap in to log today"
          to="/habits"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-text">Upcoming tasks</h2>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : data && data.upcomingTasks.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {data.upcomingTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-text">{t.title}</span>
                  <span className="text-xs text-muted">
                    {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "No date"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No upcoming tasks in the next 7 days." to="/tasks" cta="Add a task" />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-text">Upcoming events</h2>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : data && data.upcomingEvents.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {data.upcomingEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-text">{e.title}</span>
                  <Badge tone="accent">{format(new Date(e.startsAt), "MMM d, h:mm a")}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Nothing on your calendar this week." to="/calendar" cta="Add an event" />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-text">Assignments &amp; exams this week</h2>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : data && (data.upcomingAssignments.length > 0 || data.upcomingExams.length > 0) ? (
            <ul className="flex flex-col gap-3">
              {data.upcomingAssignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-text">{a.title}</span>
                  <span className="text-xs text-muted">{a.deadline ? format(new Date(a.deadline), "MMM d") : ""}</span>
                </li>
              ))}
              {data.upcomingExams.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-text">{e.title}</span>
                  <Badge tone="warning">{format(new Date(e.date), "MMM d")}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Nothing due in the study planner this week." to="/study" cta="Open study planner" />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-text">Follow-ups due</h2>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : data && data.upcomingFollowUps.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {data.upcomingFollowUps.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-text">{c.name}</span>
                  <span className="text-xs text-muted">
                    {c.followUpDate ? format(new Date(c.followUpDate), "MMM d") : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No follow-ups due this week." to="/contacts" cta="Open contacts" />
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-text">Recent notes</h2>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : data && data.recentNotes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data.recentNotes.map((n) => (
                <Link key={n.id} to="/notes" className="rounded-lg border border-border p-3 hover:bg-surface">
                  <p className="truncate text-sm font-medium text-text">{n.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{n.content || "No content yet."}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="No notes yet." to="/notes" cta="Write your first note" />
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  to,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number | string;
  sub: string;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="flex flex-col gap-2 p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{label}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Icon size={16} />
          </div>
        </div>
        <span className="text-2xl font-semibold text-text">{value}</span>
        <span className="text-xs text-muted">{sub}</span>
      </Card>
    </Link>
  );
}

function EmptyState({ message, to, cta }: { message: string; to: string; cta: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-sm text-muted">{message}</p>
      <Link to={to} className="text-sm font-medium text-accent">
        {cta} →
      </Link>
    </div>
  );
}
