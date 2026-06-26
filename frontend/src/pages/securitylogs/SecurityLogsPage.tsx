import { useEffect, useRef, useState } from "react";
import { Upload, ShieldAlert, Download, Printer, Trash2, AlertTriangle, FileText } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { api, getErrorMessage } from "../../lib/api";
import type { LogAnalysisDetail, LogAnalysisSummary } from "../../types";
import { format } from "date-fns";

const LOG_TYPE_LABEL: Record<string, string> = {
  LINUX_AUTH: "Linux authentication log",
  WEB_ACCESS: "Apache / Nginx access log",
  GENERIC: "Generic text log",
};

export default function SecurityLogsPage() {
  const [pastedContent, setPastedContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<LogAnalysisDetail | null>(null);
  const [history, setHistory] = useState<LogAnalysisSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadHistory() {
    try {
      const res = await api.get<LogAnalysisSummary[]>("/security-logs");
      setHistory(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPastedContent(String(reader.result || ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  }

  async function handleAnalyze() {
    if (!pastedContent.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await api.post<LogAnalysisDetail>("/security-logs/analyze", {
        content: pastedContent,
        fileName: fileName || "pasted-log.txt",
      });
      setCurrent(res.data);
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }

  async function openHistoryItem(id: string) {
    setError("");
    try {
      const res = await api.get<LogAnalysisDetail>(`/security-logs/${id}`);
      setCurrent(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteHistoryItem(id: string) {
    if (!confirm("Delete this analysis?")) return;
    try {
      await api.delete(`/security-logs/${id}`);
      if (current?.id === id) setCurrent(null);
      await loadHistory();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function exportCsv(id: string) {
    const token = localStorage.getItem("lifeos_token");
    const url = `${api.defaults.baseURL}/security-logs/${id}/export/csv`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `log-analysis-${id.slice(0, 8)}.csv`;
        link.click();
      });
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Security Log Analyzer</h1>
        <p className="text-sm text-muted">Upload or paste a log to detect failed logins, brute-force attempts, and suspicious IPs</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="flex flex-col gap-3 p-5 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} /> Upload log file
          </Button>
          <input ref={fileInputRef} type="file" accept=".log,.txt" className="hidden" onChange={handleFileSelect} />
          {fileName && <span className="text-xs text-muted">{fileName}</span>}
        </div>
        <Textarea
          placeholder="...or paste log content here (Linux auth log, Apache/Nginx access log, or any text log)"
          value={pastedContent}
          onChange={(e) => {
            setPastedContent(e.target.value);
            setFileName(null);
          }}
          rows={8}
          className="font-mono text-xs"
        />
        <Button onClick={handleAnalyze} disabled={analyzing || !pastedContent.trim()} className="self-start">
          <ShieldAlert size={15} /> {analyzing ? "Analyzing..." : "Analyze log"}
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {current ? (
          <Card className="flex flex-col gap-5 p-5" id="log-report">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                  <FileText size={16} /> {current.fileName}
                </h2>
                <p className="text-xs text-muted">
                  {LOG_TYPE_LABEL[current.logType]} · analyzed {format(new Date(current.createdAt), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button size="sm" variant="secondary" onClick={() => exportCsv(current.id)}>
                  <Download size={14} /> CSV
                </Button>
                <Button size="sm" variant="secondary" onClick={printReport}>
                  <Printer size={14} /> Print / Save PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total lines" value={current.totalLines} />
              <Stat label="Events parsed" value={current.totalEvents} />
              <Stat label="Failed events" value={current.failedEvents} tone="danger" />
              <Stat label="Unique IPs" value={current.uniqueIps} />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-text">IP breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted">
                      <th className="px-2 py-2">IP address</th>
                      <th className="px-2 py-2">Total</th>
                      <th className="px-2 py-2">Failed</th>
                      <th className="px-2 py-2">Successful</th>
                      <th className="px-2 py-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.ipBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-muted">
                          No IP addresses detected in this log.
                        </td>
                      </tr>
                    ) : (
                      current.ipBreakdown.map((ip) => (
                        <tr key={ip.ip} className="border-b border-border last:border-0">
                          <td className="px-2 py-2 font-mono text-text">{ip.ip}</td>
                          <td className="px-2 py-2 text-muted">{ip.total}</td>
                          <td className="px-2 py-2 text-muted">{ip.failed}</td>
                          <td className="px-2 py-2 text-muted">{ip.successful}</td>
                          <td className="px-2 py-2">
                            <Badge tone={ip.flag === "BRUTE_FORCE" ? "danger" : ip.flag === "SUSPICIOUS" ? "warning" : "neutral"}>
                              {ip.flag === "BRUTE_FORCE" ? "Brute force" : ip.flag === "SUSPICIOUS" ? "Suspicious" : "Normal"}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {current.sampleEvents.length > 0 && (
              <div className="print:hidden">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
                  <AlertTriangle size={15} className="text-warning" /> Sample flagged events
                </h3>
                <div className="max-h-48 overflow-y-auto rounded-lg bg-surface p-3">
                  {current.sampleEvents.map((line, i) => (
                    <p key={i} className="font-mono text-xs text-muted">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-10 text-center text-sm text-muted">Analyze a log above to see results here.</Card>
        )}

        <Card className="flex flex-col gap-3 p-4 print:hidden">
          <h3 className="text-sm font-semibold text-text">Past analyses</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted">No analyses yet.</p>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs hover:bg-surface"
              >
                <button onClick={() => openHistoryItem(h.id)} className="flex-1 text-left">
                  <p className="truncate font-medium text-text">{h.fileName}</p>
                  <p className="text-muted">
                    {h.failedEvents} failed · {h.uniqueIps} IPs · {format(new Date(h.createdAt), "MMM d")}
                  </p>
                </button>
                <button onClick={() => deleteHistoryItem(h.id)} className="text-muted hover:text-danger">
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <p className={`text-xl font-semibold ${tone === "danger" ? "text-danger" : "text-text"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
