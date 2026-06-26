import { FormEvent, useState } from "react";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { StrengthMeter } from "./StrengthMeter";
import { generatePassword } from "../../lib/passwordTools";

export interface EntryFormState {
  website: string;
  username: string;
  password: string;
  notes: string;
}

export function EntryForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: { website: string; username: string; password: string; notes: string } | null;
  onSubmit: (data: EntryFormState) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<EntryFormState>(
    initial ?? { website: "", username: "", password: "", notes: "" }
  );
  const [showPassword, setShowPassword] = useState(false);
  const [genLength, setGenLength] = useState(16);

  function handleGenerate() {
    const password = generatePassword({
      length: genLength,
      useUpper: true,
      useLower: true,
      useNumbers: true,
      useSymbols: true,
      excludeAmbiguous: true,
    });
    setForm((f) => ({ ...f, password }));
    setShowPassword(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Website / service"
        value={form.website}
        onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
        placeholder="e.g. github.com"
        required
      />
      <Input
        label="Username / email"
        value={form.username}
        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Password</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button type="button" variant="secondary" onClick={handleGenerate}>
            <Wand2 size={15} />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span>Length: {genLength}</span>
          <input
            type="range"
            min={8}
            max={32}
            value={genLength}
            onChange={(e) => setGenLength(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="mt-2">
          <StrengthMeter password={form.password} />
        </div>
      </div>

      <Textarea
        label="Notes (optional)"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        rows={2}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save entry"}
        </Button>
      </div>
    </form>
  );
}
