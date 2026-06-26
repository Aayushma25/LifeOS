import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { AssignmentForm } from "./AssignmentForm";
import { api, getErrorMessage } from "../../lib/api";
import type { Assignment, AssignmentStatus, Subject } from "../../types";
import { format, isPast } from "date-fns";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  GRADED: "Graded",
};

const STATUS_TONE: Record<AssignmentStatus, "neutral" | "accent" | "success" | "warning"> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "warning",
  SUBMITTED: "accent",
  GRADED: "success",
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (subjectFilter) params.subjectId = subjectFilter;
      const [assignmentsRes, subjectsRes] = await Promise.all([
        api.get<Assignment[]>("/assignments", { params }),
        api.get<Subject[]>("/subjects"),
      ]);
      setAssignments(assignmentsRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, subjectFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(a: Assignment) {
    setEditing(a);
    setModalOpen(true);
  }

  async function handleSubmit(data: any) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/assignments/${editing.id}`, data);
      } else {
        await api.post("/assignments", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function quickStatus(a: Assignment, status: AssignmentStatus) {
    try {
      await api.patch(`/assignments/${a.id}/status`, { status });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(a: Assignment) {
    if (!confirm("Delete this assignment?")) return;
    try {
      await api.delete(`/assignments/${a.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Assignment Manager</h1>
          <p className="text-sm text-muted">{assignments.length} assignment{assignments.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add assignment
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-56">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : assignments.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No assignments yet. Add your first one.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => {
            const overdue = a.deadline && isPast(new Date(a.deadline)) && a.status !== "GRADED" && a.status !== "SUBMITTED";
            return (
              <Card key={a.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text">{a.title}</p>
                    {a.subject && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.subject.color }} />
                        {a.subject.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    {a.deadline && (
                      <span className={overdue ? "font-medium text-danger" : ""}>
                        Due {format(new Date(a.deadline), "MMM d, yyyy")}
                        {overdue ? " · overdue" : ""}
                      </span>
                    )}
                    <Badge tone={a.priority === "HIGH" ? "danger" : a.priority === "MEDIUM" ? "warning" : "neutral"}>
                      {a.priority}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={a.status}
                    onChange={(e) => quickStatus(a, e.target.value as AssignmentStatus)}
                    className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-text"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  <button onClick={() => openEdit(a)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(a)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-danger">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit assignment" : "Add assignment"}>
        <AssignmentForm
          initial={editing}
          subjects={subjects}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}
