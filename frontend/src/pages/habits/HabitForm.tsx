import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Habit, HabitFrequency } from "../../types";

type FormState = { name: string; frequency: HabitFrequency; color: string };
const emptyForm: FormState = { name: "", frequency: "DAILY", color: "#5B8FCB" };
const SWATCHES = ["#5B8FCB", "#4C8C6B", "#C8923B", "#C2554B", "#8B6BC9", "#3FA0A8"];

export function HabitForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Habit | null;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({ name: initial.name, frequency: initial.frequency, color: initial.color });
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
      <Input label="Habit name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      <Select
        label="Frequency"
        value={form.frequency}
        onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as HabitFrequency }))}
      >
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
      </Select>
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
          {submitting ? "Saving..." : initial ? "Save changes" : "Add habit"}
        </Button>
      </div>
    </form>
  );
}
