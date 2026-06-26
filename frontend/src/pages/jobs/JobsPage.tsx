import { useEffect, useState } from "react";
import { Plus, Search, Download, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { JobForm } from "./JobForm";
import { api, getErrorMessage } from "../../lib/api";
import type { JobApplication, JobStatus } from "../../types";
import { format } from "date-fns";

const STATUS_LABEL: Record<JobStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEWED: "Interviewed",
  OFFER_RECEIVED: "Offer received",
  REJECTED: "Rejected",
  ACCEPTED: "Accepted",
};

const STATUS_TONE: Record<JobStatus, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  WISHLIST: "neutral",
  APPLIED: "accent",
  ASSESSMENT: "warning",
  INTERVIEW_SCHEDULED: "warning",
  INTERVIEWED: "warning",
  OFFER_RECEIVED: "success",
  REJECTED: "danger",
  ACCEPTED: "success",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get<JobApplication[]>("/jobs", { params });
      setJobs(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(job: JobApplication) {
    setEditing(job);
    setModalOpen(true);
  }

  async function handleSubmit(data: Omit<JobApplication, "id" | "createdAt" | "updatedAt">) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/jobs/${editing.id}`, data);
      } else {
        await api.post("/jobs", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job application? This cannot be undone.")) return;
    try {
      await api.delete(`/jobs/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function exportCsv() {
    const token = localStorage.getItem("lifeos_token");
    const url = `${api.defaults.baseURL}/jobs/export/csv`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "job-applications.csv";
        link.click();
      });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Job Application Tracker</h1>
          <p className="text-sm text-muted">{jobs.length} application{jobs.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Add application
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search company, position, recruiter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-56">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No job applications yet. Add your first one to start tracking.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-text">{job.companyName}</td>
                  <td className="px-4 py-3 text-text">
                    {job.position}
                    {job.jobUrl && (
                      <a href={job.jobUrl} target="_blank" rel="noreferrer" className="ml-1 inline text-accent">
                        <ExternalLink size={12} className="inline" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[job.status]}>{STATUS_LABEL[job.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {job.deadline ? format(new Date(job.deadline), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{job.location || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(job)}
                      className="mr-2 rounded-md p-1.5 text-muted hover:bg-card hover:text-accent"
                      aria-label="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="rounded-md p-1.5 text-muted hover:bg-card hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit application" : "Add application"}>
        <JobForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
