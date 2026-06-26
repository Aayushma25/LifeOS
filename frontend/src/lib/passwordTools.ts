// Client-side only: secure random generation via the Web Crypto API, plus a
// lightweight entropy-based strength heuristic. Nothing here ever leaves the browser.

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const AMBIGUOUS = "Il1O0";

export interface GeneratorOptions {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
}

export function generatePassword(opts: GeneratorOptions): string {
  let charset = "";
  if (opts.useLower) charset += LOWER;
  if (opts.useUpper) charset += UPPER;
  if (opts.useNumbers) charset += NUMBERS;
  if (opts.useSymbols) charset += SYMBOLS;

  if (opts.excludeAmbiguous) {
    charset = charset
      .split("")
      .filter((c) => !AMBIGUOUS.includes(c))
      .join("");
  }

  if (!charset) charset = LOWER + NUMBERS;

  const values = new Uint32Array(opts.length);
  window.crypto.getRandomValues(values);

  let result = "";
  for (let i = 0; i < opts.length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

export interface StrengthResult {
  score: number; // 0-4
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
  feedback: string[];
}

export function checkStrength(password: string): StrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { score: 0, label: "Very weak", feedback: ["Enter a password to check its strength."] };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (varietyCount >= 3) score++;
  if (password.length >= 16 && varietyCount === 4) score++;

  if (password.length < 8) feedback.push("Use at least 8 characters — 12+ is much stronger.");
  if (!hasUpper) feedback.push("Add an uppercase letter.");
  if (!hasLower) feedback.push("Add a lowercase letter.");
  if (!hasNumber) feedback.push("Add a number.");
  if (!hasSymbol) feedback.push("Add a symbol.");
  if (/^(.)\1+$/.test(password)) feedback.push("Avoid repeating the same character.");
  if (/^(123|abc|qwerty|password|letmein)/i.test(password)) feedback.push("Avoid common patterns and dictionary words.");

  score = Math.max(0, Math.min(4, score));
  const labels: StrengthResult["label"][] = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  return { score, label: labels[score], feedback };
}
