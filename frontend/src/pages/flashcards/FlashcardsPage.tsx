import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Play } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { FlashcardForm } from "./FlashcardForm";
import { QuizMode } from "./QuizMode";
import { api, getErrorMessage } from "../../lib/api";
import type { Flashcard, Subject } from "../../types";

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (subjectFilter) params.subjectId = subjectFilter;
      const [cardsRes, subjectsRes] = await Promise.all([
        api.get<Flashcard[]>("/flashcards", { params }),
        api.get<Subject[]>("/subjects"),
      ]);
      setCards(cardsRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(card: Flashcard) {
    setEditing(card);
    setModalOpen(true);
  }

  async function handleSubmit(data: { front: string; back: string; subjectId: string }) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/flashcards/${editing.id}`, data);
      } else {
        await api.post("/flashcards", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(card: Flashcard) {
    if (!confirm("Delete this flashcard?")) return;
    try {
      await api.delete(`/flashcards/${card.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Flashcards</h1>
          <p className="text-sm text-muted">{cards.length} card{cards.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setQuizOpen(true)}>
            <Play size={16} /> Start quiz
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Add flashcard
          </Button>
        </div>
      </div>

      <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="w-56">
        <option value="">All subjects</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : cards.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No flashcards yet. Add your first one to start a deck.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const attempts = card.correctCount + card.incorrectCount;
            const accuracy = attempts > 0 ? Math.round((card.correctCount / attempts) * 100) : null;
            return (
              <Card key={card.id} className="flex flex-col gap-2 p-4">
                <p className="text-sm font-medium text-text">{card.front}</p>
                <p className="text-xs text-muted">{card.back}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {card.subject && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: card.subject.color }} />
                        {card.subject.name}
                      </span>
                    )}
                    {accuracy !== null && <Badge tone={accuracy >= 70 ? "success" : "warning"}>{accuracy}% accuracy</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(card)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(card)} className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit flashcard" : "Add flashcard"}>
        <FlashcardForm
          initial={editing}
          subjects={subjects}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          submitting={submitting}
        />
      </Modal>

      {quizOpen && <QuizMode cards={cards} onClose={() => setQuizOpen(false)} onReviewed={load} />}
    </div>
  );
}
