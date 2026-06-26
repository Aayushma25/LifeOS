import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { SubjectForm } from "./SubjectForm";
import { SubjectDetail } from "./SubjectDetail";
import { api, getErrorMessage } from "../../lib/api";
import type { Subject } from "../../types";

export default function StudyPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gpa, setGpa] = useState<{ gpa: number | null; totalCredits: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Subject | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [subjectsRes, gpaRes] = await Promise.all([api.get<Subject[]>("/subjects"), api.get("/subjects/gpa")]);
      setSubjects(subjectsRes.data);
      setGpa(gpaRes.data);
      if (selected) {
        const stillThere = subjectsRes.data.find((s) => s.id === selected.id);
        setSelected(stillThere || null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setModalOpen(true);
  }

  async function handleSubmit(data: { name: string; code: string; instructor: string; credits: string; semester: string; color: string; grade: string }) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/subjects/${editing.id}`, data);
      } else {
        await api.post("/subjects", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(subject: Subject) {
    if (!confirm(`Delete "${subject.name}"? This also removes its exams, sessions, and attendance records.`)) return;
    try {
      await api.delete(`/subjects/${subject.id}`);
      if (selected?.id === subject.id) setSelected(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Study Planner</h1>
          <p className="text-sm text-muted">Subjects, exams, study sessions, attendance, and your GPA</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add subject
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <GraduationCap size={22} />
        </div>
        <div>
          <p className="text-2xl font-semibold text-text">{gpa?.gpa ?? "—"}</p>
          <p className="text-xs text-muted">
            GPA across {gpa?.totalCredits ?? 0} graded credits · standard 4.0 scale
          </p>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : subjects.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No subjects yet. Add your first course to get started.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              onClick={() => setSelected(subject)}
              className={`cursor-pointer p-4 transition-shadow hover:shadow-md ${selected?.id === subject.id ? "border-accent" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                  <p className="text-sm font-semibold text-text">{subject.name}</p>
                </div>
                {subject.grade && <Badge tone="accent">{subject.grade}</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted">
                {subject.code ? `${subject.code} · ` : ""}
                {subject.instructor || "No instructor"}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{subject.semester || "No semester set"}</span>
                <span>{subject.credits} credits</span>
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(subject);
                  }}
                  className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(subject);
                  }}
                  className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <SubjectDetail subject={selected} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit subject" : "Add subject"}>
        <SubjectForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
