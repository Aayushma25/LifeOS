import { checkStrength } from "../../lib/passwordTools";

const COLORS = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];

export function StrengthMeter({ password }: { password: string }) {
  const { score, label, feedback } = checkStrength(password);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= score - 1 ? COLORS[score] : "bg-surface"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
      </div>
      {feedback.length > 0 && password && (
        <ul className="list-inside list-disc text-xs text-muted">
          {feedback.slice(0, 2).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
