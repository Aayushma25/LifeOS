import { useRef, useState } from "react";
import { Hash, Upload, Copy, Check, GitCompare } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { api, getErrorMessage } from "../../lib/api";
import type { HashResult } from "../../types";

type Mode = "text" | "file";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function HashToolsPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<HashResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareResult, setCompareResult] = useState<boolean | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await api.post<HashResult>("/hash-tools/generate", { mode: "file", input: base64, fileName: file.name });
      setResult(res.data);
      setFileName(file.name);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleHashText() {
    if (!text.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.post<HashResult>("/hash-tools/generate", { mode: "text", input: text });
      setResult(res.data);
      setFileName(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
  }

  async function handleCompare() {
    setCompareResult(null);
    if (!compareA.trim() || !compareB.trim()) return;
    try {
      const res = await api.post("/hash-tools/compare", { hashA: compareA, hashB: compareB });
      setCompareResult(res.data.match);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Hash Tools</h1>
        <p className="text-sm text-muted">Generate and verify MD5, SHA-1, SHA-256, and SHA-512 hashes</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setMode("text")}
            className={`px-3 py-2 text-sm font-medium ${mode === "text" ? "border-b-2 border-accent text-accent" : "text-muted hover:text-text"}`}
          >
            Hash text
          </button>
          <button
            onClick={() => setMode("file")}
            className={`px-3 py-2 text-sm font-medium ${mode === "file" ? "border-b-2 border-accent text-accent" : "text-muted hover:text-text"}`}
          >
            Hash a file
          </button>
        </div>

        {mode === "text" ? (
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Paste or type text to hash..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
            />
            <Button onClick={handleHashText} disabled={loading || !text.trim()} className="self-start">
              <Hash size={15} /> {loading ? "Hashing..." : "Generate hashes"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-accent"
            >
              <Upload size={24} className="text-muted" />
              <span className="text-sm text-text">{fileName || "Click to choose a file"}</span>
              <span className="text-xs text-muted">Hashing happens locally on your backend — nothing leaves your machine</span>
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            {loading && <p className="text-sm text-muted">Hashing...</p>}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {result.fileName && (
              <p className="text-xs text-muted">
                {result.fileName} · {result.byteLength.toLocaleString()} bytes
              </p>
            )}
            {Object.entries(result.hashes).map(([algo, value]) => (
              <div key={algo} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase text-muted">{algo}</p>
                  <p className="truncate font-mono text-sm text-text">{value}</p>
                </div>
                <button onClick={() => copy(algo, value)} className="shrink-0 rounded-md p-1.5 text-muted hover:bg-card hover:text-accent">
                  {copiedKey === algo ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-text">
          <GitCompare size={18} /> Hash comparison tool
        </h3>
        <p className="text-sm text-muted">Paste two hashes to verify file integrity or detect changes.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="First hash"
            value={compareA}
            onChange={(e) => setCompareA(e.target.value)}
            className="font-mono"
          />
          <Input
            placeholder="Second hash"
            value={compareB}
            onChange={(e) => setCompareB(e.target.value)}
            className="font-mono"
          />
        </div>
        <Button onClick={handleCompare} disabled={!compareA.trim() || !compareB.trim()} className="self-start">
          Compare
        </Button>
        {compareResult !== null && (
          <Badge tone={compareResult ? "success" : "danger"}>
            {compareResult ? "Match — file integrity verified" : "No match — files differ or one hash is wrong"}
          </Badge>
        )}
      </Card>
    </div>
  );
}
