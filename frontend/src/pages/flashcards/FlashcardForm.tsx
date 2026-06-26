import { FormEvent, useEffect, useState } from "react";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Flashcard, Subject } from "../../types";

type FormState = { front: string; back: string; subjectId: string };
const emptyForm: FormState = { front: "", back: "", subjectId: "" };

export function FlashcardForm({
  initial,
  subjects,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Flashcard | null;
  subjects: Subject[];
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({ front: initial.front, back: initial.back, subjectId: initial.subjectId ?? "" });
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
      <Textarea
        label="Front (question)"
        value={form.front}
        onChange={(e) => setForm((f) => ({ ...f, front: e.target.value }))}
        rows={2}
        required
      />
      <Textarea
        label="Back (answer)"
        value={form.back}
        onChange={(e) => setForm((f) => ({ ...f, back: e.target.value }))}
        rows={2}
        required
      />
      <Select
        label="Subject (optional)"
        value={form.subjectId}
        onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
      >
        <option value="">No subject</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add flashcard"}
        </Button>
      </div>
    </form>
  );
}
