import { FormEvent, useEffect, useState } from "react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import type { Transaction, TransactionType } from "../../types";

type FormState = { type: TransactionType; amount: string; category: string; description: string; date: string };
const emptyForm: FormState = { type: "EXPENSE", amount: "", category: "", description: "", date: new Date().toISOString().slice(0, 10) };

const COMMON_CATEGORIES = ["Food", "Rent", "Transport", "Subscriptions", "Entertainment", "Health", "Education", "Income", "Other"];

export function TransactionForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Transaction | null;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        type: initial.type,
        amount: String(initial.amount),
        category: initial.category,
        description: initial.description ?? "",
        date: initial.date.slice(0, 10),
      });
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
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TransactionType }))}
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </Select>
        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
        />
      </div>
      <Input
        label="Category"
        list="category-suggestions"
        value={form.category}
        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        required
      />
      <datalist id="category-suggestions">
        {COMMON_CATEGORIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
      <Input
        label="Description (optional)"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initial ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
