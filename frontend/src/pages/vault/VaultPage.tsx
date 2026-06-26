import { useEffect, useState } from "react";
import { Lock, Plus, Eye, EyeOff, Trash2, Pencil, ShieldCheck, KeyRound } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { EntryForm, EntryFormState } from "./EntryForm";
import { GeneratorTools } from "./GeneratorTools";
import { api, getErrorMessage } from "../../lib/api";
import type { VaultEntryMeta } from "../../types";
import { format } from "date-fns";

type Tab = "vault" | "tools";

export default function VaultPage() {
  const [tab, setTab] = useState<Tab>("vault");
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState(""); // kept in memory only, never persisted

  const [entries, setEntries] = useState<VaultEntryMeta[]>([]);
  const [revealed, setRevealed] = useState<Record<string, { password: string; notes: string | null }>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [setupForm, setSetupForm] = useState({ masterPassword: "", confirm: "" });
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState("");

  async function checkStatus() {
    try {
      const res = await api.get("/vault/status");
      setInitialized(res.data.initialized);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function loadEntries() {
    try {
      const res = await api.get<VaultEntryMeta[]>("/vault/entries");
      setEntries(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    if (unlocked) loadEntries();
  }, [unlocked]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (setupForm.masterPassword !== setupForm.confirm) {
      setError("Master passwords do not match.");
      return;
    }
    try {
      await api.post("/vault/setup", { masterPassword: setupForm.masterPassword });
      setInitialized(true);
      setMasterPassword(setupForm.masterPassword);
      setUnlocked(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlockError("");
    try {
      await api.post("/vault/unlock", { masterPassword: unlockInput });
      setMasterPassword(unlockInput);
      setUnlocked(true);
    } catch (err) {
      setUnlockError(getErrorMessage(err));
    }
  }

  function lockVault() {
    setUnlocked(false);
    setMasterPassword("");
    setRevealed({});
    setUnlockInput("");
  }

  function openCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  async function openEdit(id: string) {
    setError("");
    if (!revealed[id]) {
      setRevealingId(id);
      try {
        const res = await api.post(`/vault/entries/${id}/reveal`, { masterPassword });
        setRevealed((r) => ({ ...r, [id]: res.data }));
      } catch (err) {
        setError(getErrorMessage(err));
        setRevealingId(null);
        return;
      }
      setRevealingId(null);
    }
    setEditingId(id);
    setModalOpen(true);
  }

  async function handleEntrySubmit(data: EntryFormState) {
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...data, masterPassword };
      if (editingId) {
        await api.put(`/vault/entries/${editingId}`, payload);
      } else {
        await api.post("/vault/entries", payload);
      }
      setModalOpen(false);
      await loadEntries();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vault entry? This cannot be undone.")) return;
    try {
      await api.delete(`/vault/entries/${id}`);
      await loadEntries();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function toggleReveal(id: string) {
    if (revealed[id]) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }
    setRevealingId(id);
    setError("");
    try {
      const res = await api.post(`/vault/entries/${id}/reveal`, { masterPassword });
      setRevealed((r) => ({ ...r, [id]: res.data }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRevealingId(null);
    }
  }

  const editingEntry = editingId
    ? { website: entries.find((e) => e.id === editingId)?.website ?? "", username: entries.find((e) => e.id === editingId)?.username ?? "", password: revealed[editingId]?.password ?? "", notes: revealed[editingId]?.notes ?? "" }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Password Vault</h1>
          <p className="text-sm text-muted">AES-256 encrypted, unlocked only with your master password</p>
        </div>
        {unlocked && (
          <Button variant="secondary" onClick={lockVault}>
            <Lock size={15} /> Lock vault
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("vault")}
          className={`px-3 py-2 text-sm font-medium ${tab === "vault" ? "border-b-2 border-accent text-accent" : "text-muted hover:text-text"}`}
        >
          My vault
        </button>
        <button
          onClick={() => setTab("tools")}
          className={`px-3 py-2 text-sm font-medium ${tab === "tools" ? "border-b-2 border-accent text-accent" : "text-muted hover:text-text"}`}
        >
          Generator &amp; strength checker
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {tab === "tools" && <GeneratorTools />}

      {tab === "vault" && (
        <>
          {initialized === null && <p className="text-sm text-muted">Loading...</p>}

          {initialized === false && (
            <Card className="mx-auto w-full max-w-sm p-8">
              <div className="mb-4 flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <KeyRound size={20} />
                </div>
                <h2 className="text-lg font-semibold text-text">Set up your vault</h2>
                <p className="text-sm text-muted">
                  Choose a master password. It encrypts every entry with AES-256 and is never stored anywhere —
                  if you lose it, vault entries can't be recovered.
                </p>
              </div>
              <form onSubmit={handleSetup} className="flex flex-col gap-3">
                <Input
                  type="password"
                  label="Master password"
                  value={setupForm.masterPassword}
                  onChange={(e) => setSetupForm((f) => ({ ...f, masterPassword: e.target.value }))}
                  minLength={8}
                  required
                />
                <Input
                  type="password"
                  label="Confirm master password"
                  value={setupForm.confirm}
                  onChange={(e) => setSetupForm((f) => ({ ...f, confirm: e.target.value }))}
                  minLength={8}
                  required
                />
                <Button type="submit" className="mt-2">
                  Create vault
                </Button>
              </form>
            </Card>
          )}

          {initialized === true && !unlocked && (
            <Card className="mx-auto w-full max-w-sm p-8">
              <div className="mb-4 flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Lock size={20} />
                </div>
                <h2 className="text-lg font-semibold text-text">Vault locked</h2>
                <p className="text-sm text-muted">Enter your master password to unlock it.</p>
              </div>
              <form onSubmit={handleUnlock} className="flex flex-col gap-3">
                <Input
                  type="password"
                  label="Master password"
                  value={unlockInput}
                  onChange={(e) => setUnlockInput(e.target.value)}
                  required
                  autoFocus
                />
                {unlockError && <p className="text-sm text-danger">{unlockError}</p>}
                <Button type="submit" className="mt-2">
                  Unlock
                </Button>
              </form>
            </Card>
          )}

          {initialized === true && unlocked && (
            <>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm text-success">
                  <ShieldCheck size={16} /> Unlocked · {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                </p>
                <Button onClick={openCreate}>
                  <Plus size={16} /> Add entry
                </Button>
              </div>

              {entries.length === 0 ? (
                <Card className="p-10 text-center text-sm text-muted">No saved passwords yet. Add your first one.</Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {entries.map((entry) => (
                    <Card key={entry.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text">{entry.website}</p>
                        <p className="text-xs text-muted">{entry.username || "No username saved"}</p>
                        {revealed[entry.id] && (
                          <div className="mt-2 rounded-lg bg-surface p-2 text-xs">
                            <p className="font-mono text-text">{revealed[entry.id].password}</p>
                            {revealed[entry.id].notes && <p className="mt-1 text-muted">{revealed[entry.id].notes}</p>}
                          </div>
                        )}
                        <p className="mt-1 text-xs text-muted">Updated {format(new Date(entry.updatedAt), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleReveal(entry.id)}
                          disabled={revealingId === entry.id}
                          className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent"
                          title={revealed[entry.id] ? "Hide" : "Reveal"}
                        >
                          {revealed[entry.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          onClick={() => openEdit(entry.id)}
                          className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-accent"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit entry" : "Add entry"}>
        <EntryForm initial={editingEntry} onSubmit={handleEntrySubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>
    </div>
  );
}
