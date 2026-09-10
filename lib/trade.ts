// Trade / market / language detection for Labor Force Link crew applications.
//
// Every landing page posts its own `source` string, e.g.
//   "sarasota-fl/screen-subcontractors"
//   "es/sarasota-fl/concrete-subcontractors"
// so trade, market and language are all derivable from one field.
// Falls back to source_url, then to the trades[] the crew ticked.

export type Trade = "SCREEN" | "CONCRETE" | "PATIO" | "TURF";
export type Language = "EN" | "ES";

export const TRADES: Trade[] = ["SCREEN", "CONCRETE", "PATIO", "TURF"];

const TRADE_PATTERNS: [RegExp, Trade][] = [
  [/screen/i, "SCREEN"],
  [/concrete/i, "CONCRETE"],
  [/patio|paver/i, "PATIO"],
  [/turf/i, "TURF"],
];

export function tradeFrom(...candidates: (string | null | undefined)[]): Trade | null {
  for (const c of candidates) {
    if (!c) continue;
    for (const [re, trade] of TRADE_PATTERNS) if (re.test(c)) return trade;
  }
  return null;
}

// "es/sarasota-fl/..." or a /es/ path segment → Spanish.
export function languageFrom(...candidates: (string | null | undefined)[]): Language {
  for (const c of candidates) {
    if (!c) continue;
    if (/(^|\/)es(\/|$)/i.test(c)) return "ES";
  }
  return "EN";
}

// "sarasota-fl" → "Sarasota, FL". Kept generic so new cities need no code change.
export function marketFrom(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const m = c.match(/([a-z]{3,}(?:-[a-z]+)*)-([a-z]{2})(?:\/|$)/i);
    if (m) {
      const city = m[1].split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
      return `${city}, ${m[2].toUpperCase()}`;
    }
  }
  return null;
}

export function tradeLabel(t: Trade | null | undefined): string {
  if (!t) return "";
  return { SCREEN: "Screen", CONCRETE: "Concrete", PATIO: "Patio", TURF: "Turf" }[t];
}

export function languageLabel(l: Language | null | undefined): string {
  if (l === "ES") return "ES";
  if (l === "EN") return "EN";
  return "";
}
