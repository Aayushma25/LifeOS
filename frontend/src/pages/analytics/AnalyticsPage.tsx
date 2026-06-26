import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "../../components/ui/Card";
import { api, getErrorMessage } from "../../lib/api";
import type { AnalyticsOverview } from "../../types";
import { Flame, Target } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW_SCHEDULED: "Interview",
  INTERVIEWED: "Interviewed",
  OFFER_RECEIVED: "Offer",
  REJECTED: "Rejected",
  ACCEPTED: "Accepted",
};

const PIE_COLORS = ["#5B8FCB", "#4C8C6B", "#C8923B", "#C2554B", "#8B6BC9", "#3FA0A8", "#D98E73", "#6F9C7A"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<AnalyticsOverview>("/analytics/overview")
      .then((res) => setData(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const jobsChartData = (data?.jobsByStatus ?? []).map((j) => ({ name: STATUS_LABEL[j.status] || j.status, value: j.count }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Analytics Dashboard</h1>
        <p className="text-sm text-muted">Productivity trends across every module, in one view</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {loading && <p className="text-sm text-muted">Loading...</p>}

      {data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-4 text-base font-semibold text-text">Job application pipeline</h3>
            {jobsChartData.length === 0 ? (
              <EmptyChart message="Add a job application to see this chart." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={jobsChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {jobsChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-base font-semibold text-text">Study hours, last 8 weeks</h3>
            {data.studyHoursByWeek.every((w) => w.hours === 0) ? (
              <EmptyChart message="Log a study session to see this chart." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.studyHoursByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="week" stroke="var(--color-muted)" fontSize={11} />
                  <YAxis stroke="var(--color-muted)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="hours" stroke="#5B8FCB" strokeWidth={2} dot={{ r: 3 }} name="Hours studied" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-base font-semibold text-text">Expense report, last 6 months</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.expenseReport}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={12} />
                <YAxis stroke="var(--color-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="income" fill="#4C8C6B" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#C2554B" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-base font-semibold text-text">Tasks completed, last 14 days</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.productivityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted)" fontSize={10} interval={1} />
                <YAxis stroke="var(--color-muted)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="completed" fill="#5B8FCB" radius={[4, 4, 0, 0]} name="Tasks completed" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-text">
              <Flame size={17} className="text-warning" /> Habit streaks
            </h3>
            {data.habitStreaks.length === 0 ? (
              <EmptyChart message="Add a habit to see streaks here." />
            ) : (
              <div className="flex flex-col gap-2">
                {data.habitStreaks.map((h) => (
                  <div key={h.name} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <span className="text-text">{h.name}</span>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1 text-warning">
                        <Flame size={13} /> {h.streak}
                      </span>
                      <span>{h.completionRate}% (30d)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-text">
              <Target size={17} className="text-accent" /> Goal progress
            </h3>
            {data.goalProgress.length === 0 ? (
              <EmptyChart message="Set a goal to see progress here." />
            ) : (
              <div className="flex flex-col gap-3">
                {data.goalProgress.map((g) => (
                  <div key={g.title}>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span className="text-text">{g.title}</span>
                      <span>{g.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${g.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-[200px] items-center justify-center text-sm text-muted">{message}</div>;
}
