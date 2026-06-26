import { useEffect, useState } from "react";
import { Plus, Search, Pin, Star, Archive, Trash2, Save } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { api, getErrorMessage } from "../../lib/api";
import type { Note } from "../../types";
import { format } from "date-fns";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Note | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { archived: showArchived ? "true" : "false" };
      if (search) params.search = search;
      const res = await api.get<Note[]>("/notes", { params });
      setNotes(res.data);
      if (selected) {
        const stillThere = res.data.find((n) => n.id === selected.id);
        if (!stillThere) setSelected(null);
      }
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
  }, [search, showArchived]);

  function selectNote(note: Note) {
    setSelected(note);
    setDraftTitle(note.title);
    setDraftContent(note.content);
  }

  function startNewNote() {
    setSelected(null);
    setDraftTitle("");
    setDraftContent("");
  }

  async function handleSave() {
    if (!draftTitle.trim()) {
      setError("Give your note a title before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (selected) {
        const res = await api.put(`/notes/${selected.id}`, { title: draftTitle, content: draftContent });
        setSelected(res.data);
      } else {
        const res = await api.post("/notes", { title: draftTitle, content: draftContent });
        setSelected(res.data);
      }
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleField(note: Note, field: "isPinned" | "isArchived" | "isFavorite") {
    try {
      await api.patch(`/notes/${note.id}/toggle`, { field });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(note: Note) {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    try {
      await api.delete(`/notes/${note.id}`);
      if (selected?.id === note.id) startNewNote();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Notes</h1>
          <p className="text-sm text-muted">{notes.length} note{notes.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={startNewNote}>
          <Plus size={16} /> New note
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant={showArchived ? "primary" : "secondary"} size="sm" onClick={() => setShowArchived((v) => !v)}>
          <Archive size={14} /> {showArchived ? "Showing archived" : "Show archived"}
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-1">
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : notes.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted">No notes found.</Card>
          ) : (
            notes.map((note) => (
              <Card
                key={note.id}
                onClick={() => selectNote(note)}
                className={`cursor-pointer p-4 transition-colors ${selected?.id === note.id ? "border-accent" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-text">{note.title}</p>
                  <div className="flex shrink-0 gap-1">
                    {note.isPinned && <Pin size={13} className="text-accent" />}
                    {note.isFavorite && <Star size={13} className="text-warning" />}
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{note.content || "No content yet."}</p>
                <p className="mt-2 text-xs text-muted">{format(new Date(note.updatedAt), "MMM d, yyyy")}</p>
              </Card>
            ))
          )}
        </div>

        <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
          <Input
            placeholder="Note title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="text-base font-medium"
          />
          <Textarea
            placeholder="Start writing..."
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={14}
            className="flex-1"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {selected && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => toggleField(selected, "isPinned")}>
                    <Pin size={14} /> {selected.isPinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => toggleField(selected, "isFavorite")}>
                    <Star size={14} /> {selected.isFavorite ? "Unfavorite" : "Favorite"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => toggleField(selected, "isArchived")}>
                    <Archive size={14} /> {selected.isArchived ? "Unarchive" : "Archive"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(selected)}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? "Saving..." : "Save note"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
