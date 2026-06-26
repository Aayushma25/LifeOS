import { useEffect, useState } from "react";
import { Plus, Trash2, Check, X as XIcon, MinusCircle } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { api, getErrorMessage } from "../../lib/api";
import type { Subject, Exam, StudySession, AttendanceRecord, ExamType } from "../../types";
import { format } from "date-fns";

type Tab = "exams" | "sessions" | "attendance";

export function SubjectDetail({ subject }: { subject: Subject }) {
  const [tab, setTab] = useState<Tab>("exams");
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [attendance, setAttendance] = useState<{ records: AttendanceRecord[]; total: number; present: number; percentage: number | null }>({
    records: [],
    total: 0,
    present: 0,
    percentage: null,
  });
  const [error, setError] = useState("");

  const [examForm, setExamForm] = useState({ title: "", type: "QUIZ" as ExamType, date: "" });
  const [sessionForm, setSessionForm] = useState({ durationMinutes: "25", notes: "" });

  async function loadAll() {
    try {
      const [examsRes, sessionsRes, attendanceRes] = await Promise.all([
        api.get<Exam[]>("/exams", { params: { subjectId: subject.id } }),
        api.get("/study-sessions", { params: { subjectId: subject.id } }),
        api.get("/attendance", { params: { subjectId: subject.id } }),
      ]);
      setExams(examsRes.data);
      setSessions(sessionsRes.data.sessions);
      setAttendance(attendanceRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id]);

  async function addExam() {
    if (!examForm.title.trim() || !examForm.date) return;
    try {
      await api.post("/exams", { ...examForm, subjectId: subject.id });
      setExamForm({ title: "", type: "QUIZ", date: "" });
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteExam(id: string) {
    try {
      await api.delete(`/exams/${id}`);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addSession() {
    try {
      await api.post("/study-sessions", { ...sessionForm, subjectId: subject.id, durationMinutes: Number(sessionForm.durationMinutes) });
      setSessionForm({ durationMinutes: "25", notes: "" });
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteSession(id: string) {
    try {
      await api.delete(`/study-sessions/${id}`);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function markAttendance(status: "PRESENT" | "ABSENT" | "EXCUSED") {
    try {
      await api.post("/attendance", { subjectId: subject.id, status });
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteAttendance(id: string) {
    try {
      await api.delete(`/attendance/${id}`);
      await loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const totalStudyMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text">{subject.name}</h3>
          <p className="text-xs text-muted">
            {subject.code ? `${subject.code} · ` : ""}
            {subject.instructor || "No instructor set"}
          </p>
        </div>
        <Badge tone="accent">{subject.credits} credits</Badge>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["exams", "sessions", "attendance"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-accent text-accent" : "text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {tab === "exams" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Exam title"
              value={examForm.title}
              onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))}
              className="flex-1"
            />
            <Select
              value={examForm.type}
              onChange={(e) => setExamForm((f) => ({ ...f, type: e.target.value as ExamType }))}
              className="w-36"
            >
              <option value="QUIZ">Quiz</option>
              <option value="MIDTERM">Midterm</option>
              <option value="FINAL">Final</option>
              <option value="PRACTICAL">Practical</option>
              <option value="OTHER">Other</option>
            </Select>
            <Input
              type="date"
              value={examForm.date}
              onChange={(e) => setExamForm((f) => ({ ...f, date: e.target.value }))}
              className="w-40"
            />
            <Button size="sm" onClick={addExam}>
              <Plus size={14} />
            </Button>
          </div>
          {exams.length === 0 ? (
            <p className="text-sm text-muted">No exams scheduled for this subject yet.</p>
          ) : (
            exams.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-text">{e.title}</span>
                  <span className="ml-2 text-xs text-muted">
                    {e.type} · {format(new Date(e.date), "MMM d, yyyy")}
                  </span>
                </div>
                <button onClick={() => deleteExam(e.id)} className="text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "sessions" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">{totalStudyMinutes} minutes logged across {sessions.length} sessions</p>
          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              min="1"
              value={sessionForm.durationMinutes}
              onChange={(e) => setSessionForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              className="w-28"
            />
            <Input
              placeholder="What did you study?"
              value={sessionForm.notes}
              onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
              className="flex-1"
            />
            <Button size="sm" onClick={addSession}>
              <Plus size={14} /> Log session
            </Button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted">No study sessions logged yet.</p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-text">{s.durationMinutes} min</span>
                  <span className="ml-2 text-xs text-muted">
                    {format(new Date(s.date), "MMM d, h:mm a")}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </span>
                </div>
                <button onClick={() => deleteSession(s.id)} className="text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "attendance" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text">
              {attendance.percentage !== null ? `${attendance.percentage}% attendance` : "No records yet"}{" "}
              <span className="text-xs text-muted">
                ({attendance.present}/{attendance.total} present)
              </span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => markAttendance("PRESENT")}>
                <Check size={14} /> Present
              </Button>
              <Button size="sm" variant="secondary" onClick={() => markAttendance("ABSENT")}>
                <XIcon size={14} /> Absent
              </Button>
              <Button size="sm" variant="secondary" onClick={() => markAttendance("EXCUSED")}>
                <MinusCircle size={14} /> Excused
              </Button>
            </div>
          </div>
          {attendance.records.length === 0 ? (
            <p className="text-sm text-muted">No attendance marked yet. Use the buttons above for today.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {attendance.records.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="text-text">{format(new Date(r.date), "MMM d, yyyy")}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.status === "PRESENT" ? "success" : r.status === "ABSENT" ? "danger" : "warning"}>
                      {r.status}
                    </Badge>
                    <button onClick={() => deleteAttendance(r.id)} className="text-muted hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
