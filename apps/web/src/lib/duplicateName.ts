/**
 * Der Name einer Kopie.
 *
 * Beide Muster kommen aus dem Sprachkatalog und tragen deshalb die Klammer, das
 * Wort und die Stellung der Zahl, die in dieser Sprache ueblich sind. Sie
 * werden hier nicht nur gefuellt, sondern auch **rueckwaerts gelesen**: Wer die
 * Kopie einer Kopie anlegt, bekommt "Halter (Kopie 2)" und nicht
 * "Halter (Kopie) (Kopie)".
 */
export type DuplicateNamePatterns = {
  /** Die erste Kopie. Enthaelt `{name}`. */
  copy: string;
  /** Jede weitere. Enthaelt `{name}` und `{number}`. */
  numbered: string;
};

function fill(pattern: string, values: Record<string, string | number>) {
  return pattern.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

function escapeLiteral(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Aus einem Muster wird ein Sucher: Was im Muster steht, muss wortwoertlich
 * dastehen, `{name}` faengt den Rest ein, `{number}` eine Zahl. So bleibt das
 * Rueckwaertslesen an die Sprache gebunden, in der der Name entstanden ist.
 */
function patternMatcher(pattern: string) {
  const source = pattern
    .split(/(\{\w+\})/)
    .map((part) => {
      if (part === "{name}") return "(.+)";
      if (part === "{number}") return "\\d+";
      return escapeLiteral(part);
    })
    .join("");
  return new RegExp(`^${source}$`);
}

/** Der Name ohne den Zusatz, den eine Kopie traegt. */
export function duplicateBaseName(name: string, patterns: DuplicateNamePatterns) {
  const trimmed = name.trim();
  for (const pattern of [patterns.numbered, patterns.copy]) {
    const match = patternMatcher(pattern).exec(trimmed);
    const base = match?.[1]?.trim();
    if (base) return base;
  }
  return trimmed;
}

/**
 * Ein freier Name fuer die Kopie von `source`.
 *
 * `taken` sind die Namen, die schon vergeben sind - gross und klein gilt dabei
 * als derselbe Name, weil beide Speicher das auch so sehen. `limit` ist die
 * Laenge, die der Name haben darf; wird es eng, weicht der Name und nicht der
 * Zusatz, sonst stuenden am Ende zwei Kopien unter demselben Namen da.
 */
export function duplicateName(
  source: string,
  taken: Iterable<string>,
  patterns: DuplicateNamePatterns,
  limit = 80,
): string {
  const used = new Set([...taken].map((name) => name.trim().toLowerCase()));
  const base = duplicateBaseName(source, patterns);

  const candidate = (number: number) => {
    const shape = (text: string) => (number <= 1
      ? fill(patterns.copy, { name: text })
      : fill(patterns.numbered, { name: text, number }));
    const full = shape(base);
    if (full.length <= limit) return full;
    const room = Math.max(1, base.length - (full.length - limit));
    return shape(base.slice(0, room).trim());
  };

  // Jede Runde gibt einen anderen Namen, also ist spaetestens nach so vielen
  // Runden, wie es belegte Namen gibt, einer davon frei.
  for (let number = 1; number <= used.size + 1; number += 1) {
    const name = candidate(number);
    if (!used.has(name.toLowerCase())) return name;
  }
  return candidate(used.size + 2);
}
