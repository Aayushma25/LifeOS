import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, LayoutGrid, List as ListIcon } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { TaskForm } from "./TaskForm";
import { api, getErrorMessage } from "../../lib/api";
import type { Task, TaskStatus, TaskPriority } from "../../types";
import { format } from "date-fns";

const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
];

const PRIORITY_TONE: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Task[]>("/tasks");
      setTasks(res.data);
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

  function openEdit(task: Task) {
    setEditing(task);
    setModalOpen(true);
  }

  async function handleSubmit(data: { title: string; description: string; priority: TaskPriority; dueDate: string; labels: string }) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/tasks/${editing.id}`, data);
      } else {
        await api.post("/tasks", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm("Delete this task and all its subtasks?")) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    try {
      await api.patch(`/tasks/${task.id}/status`, { status });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addSubtask(parentId: string) {
    const title = subtaskDrafts[parentId]?.trim();
    if (!title) return;
    try {
      await api.post("/tasks", { title, parentId });
      setSubtaskDrafts((d) => ({ ...d, [parentId]: "" }));
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Tasks</h1>
          <p className="text-sm text-muted">{tasks.length} task{tasks.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "list" ? "primary" : "secondary"} size="sm" onClick={() => setView("list")}>
            <ListIcon size={14} /> List
          </Button>
          <Button variant={view === "kanban" ? "primary" : "secondary"} size="sm" onClick={() => setView("kanban")}>
            <LayoutGrid size={14} /> Kanban
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Add task
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : view === "list" ? (
        <div className="flex flex-col gap-3">
          {tasks.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted">No tasks yet. Add your first one.</Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-2">
                    <button onClick={() => toggleExpand(task.id)} className="mt-0.5 text-muted">
                      {expanded[task.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">{task.title}</p>
                      {task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                        {task.dueDate && (
                          <span className="text-xs text-muted">Due {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
                        )}
                        {task.labels &&
                          task.labels.split(",").filter(Boolean).map((l) => (
                            <Badge key={l} tone="neutral">
                              {l.trim()}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(e) => changeStatus(task, e.target.value as TaskStatus)}
                      className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-text"
                    >
                      {STATUS_COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => openEdit(task)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(task)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {expanded[task.id] && (
                  <div className="mt-3 border-t border-border pt-3 pl-7">
                    {(task.subtasks ?? []).map((st) => (
                      <div key={st.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span className={st.status === "COMPLETED" ? "text-muted line-through" : "text-text"}>
                          {st.title}
                        </span>
                        <select
                          value={st.status}
                          onChange={(e) => changeStatus(st, e.target.value as TaskStatus)}
                          className="rounded-lg border border-border bg-card px-2 py-0.5 text-xs text-text"
                        >
                          {STATUS_COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Add a subtask..."
                        value={subtaskDrafts[task.id] ?? ""}
                        onChange={(e) => setSubtaskDrafts((d) => ({ ...d, [task.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addSubtask(task.id)}
                      />
                      <Button size="sm" variant="secondary" onClick={() => addSubtask(task.id)}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STATUS_COLUMNS.map((col) => (
            <div key={col.key} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted">
                {col.label} · {tasks.filter((t) => t.status === col.key).length}
              </h3>
              <div className="flex flex-col gap-3">
                {tasks
                  .filter((t) => t.status === col.key)
                  .map((task) => (
                    <Card key={task.id} className="p-3">
                      <p className="text-sm font-medium text-text">{task.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                        <div className="flex gap-1">
                          {STATUS_COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                            <button
                              key={c.key}
                              onClick={() => changeStatus(task, c.key)}
                              className="rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-surface hover:text-accent"
                              title={`Move to ${c.label}`}
                            >
                              →{c.label.slice(0, 4)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit task" : "Add task"}>
        <TaskForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
