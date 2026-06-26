import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import type { Subject } from "../../types";

type FormState = {
  name: string;
  code: string;
  instructor: string;
  credits: string;
  semester: string;
  color: string;
  grade: string;
};

const emptyForm: FormState = { name: "", code: "", instructor: "", credits: "3", semester: "", color: "#5B8FCB", grade: "" };

const GRADE_OPTIONS = ["", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
const SWATCHES = ["#5B8FCB", "#4C8C6B", "#C8923B", "#C2554B", "#8B6BC9", "#3FA0A8"];

export function SubjectForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Subject | null;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        code: initial.code ?? "",
        instructor: initial.instructor ?? "",
        credits: String(initial.credits ?? 3),
        semester: initial.semester ?? "",
        color: initial.color ?? "#5B8FCB",
        grade: initial.grade ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial]);

  function update<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Subject / course name" value={form.name} onChange={update("name")} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Course code" value={form.code} onChange={update("code")} placeholder="e.g. CYB-301" />
        <Input label="Instructor" value={form.instructor} onChange={update("instructor")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Credits" type="number" step="0.5" min="0" value={form.credits} onChange={update("credits")} />
        <Input label="Semester" value={form.semester} onChange={update("semester")} placeholder="e.g. Spring 2026" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Final grade (for GPA)</label>
        <select
          value={form.grade}
          onChange={update("grade")}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
        >
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g === "" ? "Not graded yet" : g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Color</label>
        <div className="flex gap-2">
          {SWATCHES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-text" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              aria-label={`Choose color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add subject"}
        </Button>
      </div>
    </form>
  );
}
