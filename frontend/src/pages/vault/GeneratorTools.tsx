import { useState } from "react";
import { Copy, Wand2, Check } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { StrengthMeter } from "./StrengthMeter";
import { generatePassword } from "../../lib/passwordTools";

export function GeneratorTools() {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);

  const [checkValue, setCheckValue] = useState("");

  function handleGenerate() {
    setGenerated(generatePassword({ length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous }));
    setCopied(false);
  }

  function copy() {
    if (!generated) return;
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-4 p-5">
        <h3 className="text-base font-semibold text-text">Password generator</h3>
        <div className="flex items-center gap-2">
          <Input readOnly value={generated} placeholder="Click generate..." className="flex-1 font-mono" />
          <Button variant="secondary" onClick={copy} disabled={!generated}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </Button>
        </div>

        <div className="text-xs text-muted">Length: {length}</div>
        <input type="range" min={8} max={48} value={length} onChange={(e) => setLength(Number(e.target.value))} />

        <div className="grid grid-cols-2 gap-2 text-sm text-text">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} /> Uppercase
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useLower} onChange={(e) => setUseLower(e.target.checked)} /> Lowercase
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} /> Numbers
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} /> Symbols
          </label>
          <label className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={excludeAmbiguous} onChange={(e) => setExcludeAmbiguous(e.target.checked)} />
            Exclude ambiguous characters (I, l, 1, O, 0)
          </label>
        </div>

        <Button onClick={handleGenerate}>
          <Wand2 size={15} /> Generate password
        </Button>
        {generated && <StrengthMeter password={generated} />}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h3 className="text-base font-semibold text-text">Password strength checker</h3>
        <Input
          type="text"
          placeholder="Type or paste a password to check"
          value={checkValue}
          onChange={(e) => setCheckValue(e.target.value)}
          className="font-mono"
        />
        <StrengthMeter password={checkValue} />
        <p className="text-xs text-muted">
          This check runs entirely in your browser — nothing you type here is sent anywhere.
        </p>
      </Card>
    </div>
  );
}
