import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Download, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { TransactionForm } from "./TransactionForm";
import { api, getErrorMessage } from "../../lib/api";
import type { Transaction, ExpenseSummary, MonthlyExpensePoint, Budget } from "../../types";
import { format } from "date-fns";

export default function ExpensesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyExpensePoint[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [budgetForm, setBudgetForm] = useState({ category: "", monthlyLimit: "" });

  async function load() {
    setLoading(true);
    try {
      const [txRes, summaryRes, monthlyRes, budgetsRes] = await Promise.all([
        api.get<Transaction[]>("/expenses/transactions"),
        api.get<ExpenseSummary>("/expenses/summary"),
        api.get<MonthlyExpensePoint[]>("/expenses/monthly", { params: { months: 6 } }),
        api.get<Budget[]>("/expenses/budgets"),
      ]);
      setTransactions(txRes.data);
      setSummary(summaryRes.data);
      setMonthly(monthlyRes.data);
      setBudgets(budgetsRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  async function handleSubmit(data: { type: string; amount: string; category: string; description: string; date: string }) {
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/expenses/transactions/${editing.id}`, data);
      } else {
        await api.post("/expenses/transactions", data);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(t: Transaction) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/expenses/transactions/${t.id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleAddBudget() {
    if (!budgetForm.category.trim() || !budgetForm.monthlyLimit) return;
    try {
      await api.post("/expenses/budgets", budgetForm);
      setBudgetForm({ category: "", monthlyLimit: "" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteBudget(id: string) {
    try {
      await api.delete(`/expenses/budgets/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function exportCsv() {
    const token = localStorage.getItem("lifeos_token");
    const url = `${api.defaults.baseURL}/expenses/transactions/export/csv`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "transactions.csv";
        link.click();
      });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Expense Tracker</h1>
          <p className="text-sm text-muted">Income, expenses, budgets, and monthly trends</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={15} /> Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Add transaction
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-xl font-semibold text-text">${(summary?.income ?? 0).toFixed(2)}</p>
            <p className="text-xs text-muted">Income this month</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <TrendingDown size={18} />
          </div>
          <div>
            <p className="text-xl font-semibold text-text">${(summary?.expense ?? 0).toFixed(2)}</p>
            <p className="text-xs text-muted">Expenses this month</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-xl font-semibold text-text">${(summary?.net ?? 0).toFixed(2)}</p>
            <p className="text-xs text-muted">Net this month</p>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold text-text">Income vs. expenses, last 6 months</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={12} />
            <YAxis stroke="var(--color-muted)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="income" fill="#4C8C6B" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expense" fill="#C2554B" radius={[4, 4, 0, 0]} name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h3 className="text-base font-semibold text-text">Budgets</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Category"
            value={budgetForm.category}
            onChange={(e) => setBudgetForm((f) => ({ ...f, category: e.target.value }))}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Monthly limit"
            value={budgetForm.monthlyLimit}
            onChange={(e) => setBudgetForm((f) => ({ ...f, monthlyLimit: e.target.value }))}
            className="w-40"
          />
          <Button size="sm" onClick={handleAddBudget}>
            <Plus size={14} /> Set budget
          </Button>
        </div>
        {summary && summary.budgetComparison.length > 0 ? (
          <div className="flex flex-col gap-2">
            {summary.budgetComparison.map((b) => (
              <div key={b.category} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">{b.category}</span>
                    <span className="text-xs text-muted">
                      ${b.spent.toFixed(2)} / ${b.monthlyLimit.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className={`h-full rounded-full ${b.overBudget ? "bg-danger" : "bg-accent"}`}
                      style={{ width: `${Math.min(100, (b.spent / b.monthlyLimit) * 100)}%` }}
                    />
                  </div>
                </div>
                {b.overBudget && <Badge tone="danger">Over budget</Badge>}
                <button
                  onClick={() => handleDeleteBudget(budgets.find((bg) => bg.category === b.category)?.id || "")}
                  className="ml-3 text-muted hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No budgets set yet. Add one above to track spending by category.</p>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
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
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No transactions yet. Add your first one above.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{format(new Date(t.date), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={t.type === "INCOME" ? "success" : "danger"}>{t.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text">{t.category}</td>
                  <td className="px-4 py-3 text-muted">{t.description || "—"}</td>
                  <td className={`px-4 py-3 text-right font-medium ${t.type === "INCOME" ? "text-success" : "text-danger"}`}>
                    {t.type === "INCOME" ? "+" : "-"}${t.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(t)} className="mr-2 rounded-md p-1.5 text-muted hover:bg-card hover:text-accent">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(t)} className="rounded-md p-1.5 text-muted hover:bg-card hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit transaction" : "Add transaction"}>
        <TransactionForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
