import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Mail, Phone, Building2, CalendarClock } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ContactForm } from "./ContactForm";
import { api, getErrorMessage } from "../../lib/api";
import type { Contact, ContactCategory } from "../../types";
import { format, isPast } from "date-fns";

const CATEGORY_LABEL: Record<ContactCategory, string> = {
  RECRUITER: "Recruiter",
  CLIENT: "Client",
  NETWORKING: "Networking",
  OTHER: "Other",
};

const CATEGORY_TONE: Record<ContactCategory, "neutral" | "accent" | "success" | "warning"> = {
  RECRUITER: "accent",
  CLIENT: "success",
  NETWORKING: "warning",
  OTHER: "neutral",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const res = await api.get<Contact[]>("/contacts", { params });
      setContacts(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditing(contact);
    setModalOpen(true);
  }

  async function handleSubmit(data: any) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/contacts/${editing.id}`, data);
      } else {
        await api.post("/contacts", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(contact: Contact) {
    if (!confirm(`Delete ${contact.name}?`)) return;
    try {
      await api.delete(`/contacts/${contact.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Contacts &amp; Personal CRM</h1>
          <p className="text-sm text-muted">{contacts.length} contact{contacts.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add contact
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input placeholder="Search name, email, company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : contacts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No contacts yet. Add your first one.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => {
            const overdueFollowUp = contact.followUpDate && isPast(new Date(contact.followUpDate));
            return (
              <Card key={contact.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text">{contact.name}</p>
                  <Badge tone={CATEGORY_TONE[contact.category]}>{CATEGORY_LABEL[contact.category]}</Badge>
                </div>
                {(contact.company || contact.position) && (
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Building2 size={12} />
                    {[contact.position, contact.company].filter(Boolean).join(" at ")}
                  </p>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-accent hover:underline">
                    <Mail size={12} /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Phone size={12} /> {contact.phone}
                  </p>
                )}
                {contact.followUpDate && (
                  <p className={`flex items-center gap-1.5 text-xs ${overdueFollowUp ? "font-medium text-danger" : "text-muted"}`}>
                    <CalendarClock size={12} />
                    Follow up {format(new Date(contact.followUpDate), "MMM d, yyyy")}
                    {overdueFollowUp ? " · overdue" : ""}
                  </p>
                )}
                {contact.notes && <p className="mt-1 line-clamp-2 text-xs text-muted">{contact.notes}</p>}
                <div className="mt-2 flex justify-end gap-1 border-t border-border pt-2">
                  <button onClick={() => openEdit(contact)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(contact)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit contact" : "Add contact"}>
        <ContactForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
