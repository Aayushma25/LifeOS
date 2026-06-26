import { useState } from "react";
import { Check, X as XIcon, RotateCcw } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import type { Flashcard } from "../../types";

export function QuizMode({ cards, onClose, onReviewed }: { cards: Flashcard[]; onClose: () => void; onReviewed: () => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });

  const card = cards[index];
  const done = index >= cards.length;

  async function answer(correct: boolean) {
    if (!card) return;
    setResults((r) => (correct ? { ...r, correct: r.correct + 1 } : { ...r, incorrect: r.incorrect + 1 }));
    try {
      await api.patch(`/flashcards/${card.id}/review`, { correct });
    } catch {
      // non-blocking: quiz can continue even if the stat update fails
    }
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setRevealed(false);
    setResults({ correct: 0, incorrect: 0 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg p-8">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted">No flashcards to review yet. Add some first.</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-xl font-semibold text-text">Review complete</h2>
            <p className="text-sm text-muted">
              {results.correct} correct · {results.incorrect} incorrect out of {cards.length}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={restart}>
                <RotateCcw size={14} /> Review again
              </Button>
              <Button
                onClick={() => {
                  onReviewed();
                  onClose();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                Card {index + 1} of {cards.length}
              </span>
              <button onClick={onClose} className="hover:text-text">
                Exit
              </button>
            </div>
            <button
              onClick={() => setRevealed((r) => !r)}
              className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-border bg-surface p-6 text-center"
            >
              <span className="text-xs uppercase tracking-wide text-muted">{revealed ? "Answer" : "Question"}</span>
              <p className="mt-3 text-lg font-medium text-text">{revealed ? card.back : card.front}</p>
              {!revealed && <p className="mt-4 text-xs text-muted">Tap to reveal the answer</p>}
            </button>
            {revealed && (
              <div className="flex justify-center gap-3">
                <Button variant="danger" onClick={() => answer(false)}>
                  <XIcon size={16} /> Got it wrong
                </Button>
                <Button onClick={() => answer(true)}>
                  <Check size={16} /> Got it right
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
