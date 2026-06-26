import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Assignment, AssignmentStatus, Subject } from "../../types";

type FormState = {
  title: string;
  subjectId: string;
  deadline: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: AssignmentStatus;
  submissionDate: string;
  notes: string;
};

const emptyForm: FormState = {
  title: "",
  subjectId: "",
  deadline: "",
  priority: "MEDIUM",
  status: "NOT_STARTED",
  submissionDate: "",
  notes: "",
};

export function AssignmentForm({
  initial,
  subjects,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Assignment | null;
  subjects: Subject[];
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title,
        subjectId: initial.subjectId ?? "",
        deadline: initial.deadline ? initial.deadline.slice(0, 10) : "",
        priority: initial.priority,
        status: initial.status,
        submissionDate: initial.submissionDate ? initial.submissionDate.slice(0, 10) : "",
        notes: initial.notes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial]);

  function update<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Assignment title" value={form.title} onChange={update("title")} required />
      <Select label="Course / subject" value={form.subjectId} onChange={update("subjectId")}>
        <option value="">No subject</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Priority" value={form.priority} onChange={update("priority")}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </Select>
        <Select label="Status" value={form.status} onChange={update("status")}>
          <option value="NOT_STARTED">Not started</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="GRADED">Graded</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Deadline" type="date" value={form.deadline} onChange={update("deadline")} />
        <Input label="Submission date" type="date" value={form.submissionDate} onChange={update("submissionDate")} />
      </div>
      <Textarea label="Notes" value={form.notes} onChange={update("notes")} rows={3} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add assignment"}
        </Button>
      </div>
    </form>
  );
}
