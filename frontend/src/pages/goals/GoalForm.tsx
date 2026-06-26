import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Goal, GoalTerm } from "../../types";

type FormState = { title: string; description: string; term: GoalTerm; targetDate: string };
const emptyForm: FormState = { title: "", description: "", term: "SHORT_TERM", targetDate: "" };

export function GoalForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Goal | null;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title,
        description: initial.description ?? "",
        term: initial.term,
        targetDate: initial.targetDate ? initial.targetDate.slice(0, 10) : "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Goal title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        rows={3}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Term" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value as GoalTerm }))}>
          <option value="SHORT_TERM">Short-term</option>
          <option value="LONG_TERM">Long-term</option>
        </Select>
        <Input
          label="Target date"
          type="date"
          value={form.targetDate}
          onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
        />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add goal"}
        </Button>
      </div>
    </form>
  );
}
