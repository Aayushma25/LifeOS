import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Task, TaskPriority } from "../../types";

type FormState = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  labels: string;
};

const emptyForm: FormState = { title: "", description: "", priority: "MEDIUM", dueDate: "", labels: "" };

export function TaskForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Task | null;
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
        priority: initial.priority,
        dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : "",
        labels: initial.labels ?? "",
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
      <Input label="Title" value={form.title} onChange={update("title")} required />
      <Textarea label="Description" value={form.description} onChange={update("description")} rows={3} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Priority" value={form.priority} onChange={update("priority")}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </Select>
        <Input label="Due date" type="date" value={form.dueDate} onChange={update("dueDate")} />
      </div>
      <Input label="Labels" placeholder="comma, separated, labels" value={form.labels} onChange={update("labels")} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
