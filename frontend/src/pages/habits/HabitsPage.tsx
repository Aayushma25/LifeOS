import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Flame, Check } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { HabitForm } from "./HabitForm";
import { api, getErrorMessage } from "../../lib/api";
import type { Habit } from "../../types";

function lastNDays(n: number) {
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
  }
  return days;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const days = lastNDays(14);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Habit[]>("/habits");
      setHabits(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditing(habit);
    setModalOpen(true);
  }

  async function handleSubmit(data: { name: string; frequency: string; color: string }) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/habits/${editing.id}`, data);
      } else {
        await api.post("/habits", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(habit: Habit) {
    if (!confirm(`Delete "${habit.name}" and all its history?`)) return;
    try {
      await api.delete(`/habits/${habit.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleDay(habitId: string, date: Date) {
    try {
      await api.post(`/habits/${habitId}/toggle`, { date: date.toISOString() });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function isCompletedOn(habit: Habit, date: Date) {
    const key = date.toDateString();
    return habit.history.some((h) => new Date(h.date).toDateString() === key && h.completed);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Habit Tracker</h1>
          <p className="text-sm text-muted">{habits.length} habit{habits.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add habit
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : habits.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No habits yet. Add your first one to start tracking streaks.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {habits.map((habit) => (
            <Card key={habit.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                  <p className="text-sm font-semibold text-text">{habit.name}</p>
                  <Badge tone="neutral">{habit.frequency === "DAILY" ? "Daily" : "Weekly"}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm font-medium text-warning">
                    <Flame size={15} /> {habit.streak}
                  </span>
                  <span className="text-xs text-muted">{habit.completionRate}% (30d)</span>
                  <button onClick={() => openEdit(habit)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(habit)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {days.map((day) => {
                  const done = isCompletedOn(habit, day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => toggleDay(habit.id, day)}
                      title={day.toLocaleDateString()}
                      className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border text-xs transition-colors ${
                        done ? "border-transparent text-white" : "border-border text-muted hover:bg-surface"
                      } ${isToday && !done ? "ring-2 ring-accent" : ""}`}
                      style={done ? { backgroundColor: habit.color } : undefined}
                    >
                      {done ? <Check size={14} /> : day.getDate()}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit habit" : "Add habit"}>
        <HabitForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
