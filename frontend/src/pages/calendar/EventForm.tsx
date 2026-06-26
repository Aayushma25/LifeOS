import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { CalendarEvent, EventType } from "../../types";

type FormState = {
  title: string;
  description: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  location: string;
  allDay: boolean;
};

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  type: "EVENT",
  startsAt: "",
  endsAt: "",
  location: "",
  allDay: false,
};

export function EventForm({
  initial,
  defaultDate,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: CalendarEvent | null;
  defaultDate?: Date | null;
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
        type: initial.type,
        startsAt: toLocalInput(initial.startsAt),
        endsAt: toLocalInput(initial.endsAt),
        location: initial.location ?? "",
        allDay: initial.allDay,
      });
    } else {
      setForm({ ...emptyForm, startsAt: defaultDate ? toLocalInput(defaultDate.toISOString()) : "" });
    }
  }, [initial, defaultDate]);

  function update<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Title" value={form.title} onChange={update("title")} required />
      <Textarea label="Description" value={form.description} onChange={update("description")} rows={2} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Type" value={form.type} onChange={update("type")}>
          <option value="EVENT">Event</option>
          <option value="DEADLINE">Deadline</option>
          <option value="EXAM">Exam</option>
          <option value="INTERVIEW">Interview</option>
          <option value="MEETING">Meeting</option>
        </Select>
        <Input label="Location" value={form.location} onChange={update("location")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Starts at" type="datetime-local" value={form.startsAt} onChange={update("startsAt")} required />
        <Input label="Ends at" type="datetime-local" value={form.endsAt} onChange={update("endsAt")} />
      </div>
      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={form.allDay} onChange={update("allDay")} className="rounded border-border" />
        All-day event
      </label>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add event"}
        </Button>
      </div>
    </form>
  );
}
