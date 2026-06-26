import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { JobApplication, JobStatus } from "../../types";

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "WISHLIST", label: "Wishlist" },
  { value: "APPLIED", label: "Applied" },
  { value: "ASSESSMENT", label: "Assessment" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview scheduled" },
  { value: "INTERVIEWED", label: "Interviewed" },
  { value: "OFFER_RECEIVED", label: "Offer received" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACCEPTED", label: "Accepted" },
];

type FormState = Omit<JobApplication, "id" | "createdAt" | "updatedAt">;

const emptyForm: FormState = {
  companyName: "",
  position: "",
  department: "",
  location: "",
  salary: "",
  applicationDate: "",
  deadline: "",
  recruiterName: "",
  recruiterEmail: "",
  jobUrl: "",
  notes: "",
  status: "WISHLIST",
};

export function JobForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: JobApplication | null;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        ...emptyForm,
        ...initial,
        applicationDate: initial.applicationDate ? initial.applicationDate.slice(0, 10) : "",
        deadline: initial.deadline ? initial.deadline.slice(0, 10) : "",
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Company name" value={form.companyName} onChange={update("companyName")} required />
        <Input label="Position" value={form.position} onChange={update("position")} required />
        <Input label="Department" value={form.department ?? ""} onChange={update("department")} />
        <Input label="Location" value={form.location ?? ""} onChange={update("location")} />
        <Input label="Salary" value={form.salary ?? ""} onChange={update("salary")} placeholder="e.g. €55,000" />
        <Select label="Status" value={form.status} onChange={update("status")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Input
          label="Application date"
          type="date"
          value={form.applicationDate ?? ""}
          onChange={update("applicationDate")}
        />
        <Input label="Deadline" type="date" value={form.deadline ?? ""} onChange={update("deadline")} />
        <Input label="Recruiter name" value={form.recruiterName ?? ""} onChange={update("recruiterName")} />
        <Input
          label="Recruiter email"
          type="email"
          value={form.recruiterEmail ?? ""}
          onChange={update("recruiterEmail")}
        />
      </div>
      <Input label="Job URL" value={form.jobUrl ?? ""} onChange={update("jobUrl")} placeholder="https://" />
      <Textarea label="Notes" value={form.notes ?? ""} onChange={update("notes")} rows={3} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add application"}
        </Button>
      </div>
    </form>
  );
}
