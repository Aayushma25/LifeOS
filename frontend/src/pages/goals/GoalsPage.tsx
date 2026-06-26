import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, Target } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { GoalForm } from "./GoalForm";
import { api, getErrorMessage } from "../../lib/api";
import type { Goal, GoalTerm } from "../../types";
import { format } from "date-fns";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [termFilter, setTermFilter] = useState<"" | GoalTerm>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (termFilter) params.term = termFilter;
      const res = await api.get<Goal[]>("/goals", { params });
      setGoals(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setModalOpen(true);
  }

  async function handleSubmit(data: { title: string; description: string; term: GoalTerm; targetDate: string }) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/goals/${editing.id}`, data);
      } else {
        await api.post("/goals", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(goal: Goal) {
    if (!confirm("Delete this goal and all its milestones?")) return;
    try {
      await api.delete(`/goals/${goal.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function markComplete(goal: Goal) {
    try {
      await api.put(`/goals/${goal.id}`, { title: goal.title, status: "COMPLETED", progressPercent: 100 });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addMilestone(goalId: string) {
    const title = milestoneDrafts[goalId]?.trim();
    if (!title) return;
    try {
      await api.post(`/goals/${goalId}/milestones`, { title });
      setMilestoneDrafts((d) => ({ ...d, [goalId]: "" }));
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleMilestone(goalId: string, milestoneId: string) {
    try {
      await api.patch(`/goals/${goalId}/milestones/${milestoneId}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteMilestone(goalId: string, milestoneId: string) {
    try {
      await api.delete(`/goals/${goalId}/milestones/${milestoneId}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Goal Tracker</h1>
          <p className="text-sm text-muted">{goals.length} goal{goals.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add goal
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={termFilter === "" ? "primary" : "secondary"} size="sm" onClick={() => setTermFilter("")}>
          All
        </Button>
        <Button variant={termFilter === "SHORT_TERM" ? "primary" : "secondary"} size="sm" onClick={() => setTermFilter("SHORT_TERM")}>
          Short-term
        </Button>
        <Button variant={termFilter === "LONG_TERM" ? "primary" : "secondary"} size="sm" onClick={() => setTermFilter("LONG_TERM")}>
          Long-term
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : goals.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No goals yet. Set your first one.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <Card key={goal.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Target size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{goal.title}</p>
                    <p className="text-xs text-muted">
                      {goal.term === "SHORT_TERM" ? "Short-term" : "Long-term"}
                      {goal.targetDate ? ` · due ${format(new Date(goal.targetDate), "MMM d, yyyy")}` : ""}
                    </p>
                  </div>
                </div>
                <Badge tone={goal.status === "COMPLETED" ? "success" : goal.status === "ABANDONED" ? "danger" : "accent"}>
                  {goal.status}
                </Badge>
              </div>

              {goal.description && <p className="text-sm text-muted">{goal.description}</p>}

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>Progress</span>
                  <span>{goal.progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${goal.progressPercent}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {goal.milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <button
                      onClick={() => toggleMilestone(goal.id, m.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          m.isCompleted ? "border-accent bg-accent text-accent-fg" : "border-border"
                        }`}
                      >
                        {m.isCompleted && <Check size={11} />}
                      </span>
                      <span className={m.isCompleted ? "text-muted line-through" : "text-text"}>{m.title}</span>
                    </button>
                    <button onClick={() => deleteMilestone(goal.id, m.id)} className="text-muted hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a milestone..."
                  value={milestoneDrafts[goal.id] ?? ""}
                  onChange={(e) => setMilestoneDrafts((d) => ({ ...d, [goal.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addMilestone(goal.id)}
                />
                <Button size="sm" variant="secondary" onClick={() => addMilestone(goal.id)}>
                  Add
                </Button>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                {goal.status === "ACTIVE" && (
                  <Button size="sm" variant="secondary" onClick={() => markComplete(goal)}>
                    <Check size={14} /> Mark complete
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => openEdit(goal)}>
                  <Pencil size={14} />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(goal)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit goal" : "Add goal"}>
        <GoalForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
