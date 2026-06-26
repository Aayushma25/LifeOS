import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Contact, ContactCategory } from "../../types";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  category: ContactCategory;
  notes: string;
  followUpDate: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  position: "",
  category: "OTHER",
  notes: "",
  followUpDate: "",
};

export function ContactForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Contact | null;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        email: initial.email ?? "",
        phone: initial.phone ?? "",
        company: initial.company ?? "",
        position: initial.position ?? "",
        category: initial.category,
        notes: initial.notes ?? "",
        followUpDate: initial.followUpDate ? initial.followUpDate.slice(0, 10) : "",
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
      <Input label="Full name" value={form.name} onChange={update("name")} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" type="email" value={form.email} onChange={update("email")} />
        <Input label="Phone" value={form.phone} onChange={update("phone")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Company" value={form.company} onChange={update("company")} />
        <Input label="Position" value={form.position} onChange={update("position")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Category" value={form.category} onChange={update("category")}>
          <option value="RECRUITER">Recruiter</option>
          <option value="CLIENT">Client</option>
          <option value="NETWORKING">Networking</option>
          <option value="OTHER">Other</option>
        </Select>
        <Input label="Follow-up date" type="date" value={form.followUpDate} onChange={update("followUpDate")} />
      </div>
      <Textarea label="Notes" value={form.notes} onChange={update("notes")} rows={3} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add contact"}
        </Button>
      </div>
    </form>
  );
}
