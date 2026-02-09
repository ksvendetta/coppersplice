/**
 * Normalize a circuit ID from various input formats to the standard "prefix,start-end" format.
 *
 * Accepted inputs:
 *   "pon 1 25"      → "pon,1-25"
 *   "lg 33 36"      → "lg,33-36"
 *   "BR 021 365 372" → "BR021,365-372"
 *   "pon,1-25"      → "pon,1-25"  (already normalized, pass through)
 *
 * Rules:
 *   - If already in "prefix,start-end" format, return as-is
 *   - Otherwise split by spaces: last two parts are range start and end,
 *     everything before is joined (no spaces) as the prefix
 */
export function normalizeCircuitId(input: string): string {
  const trimmed = input.trim();

  // If it already contains a comma, assume it's in the correct format
  if (trimmed.includes(',')) {
    return trimmed;
  }

  // Split by whitespace
  const parts = trimmed.split(/\s+/);

  // Need at least 3 parts: prefix, start, end
  if (parts.length < 3) {
    return trimmed; // Return as-is, validation will catch it
  }

  // Last two parts are the range start and end
  const rangeEnd = parts[parts.length - 1];
  const rangeStart = parts[parts.length - 2];

  // Everything else is the prefix (joined without spaces)
  const prefix = parts.slice(0, parts.length - 2).join('');

  return `${prefix},${rangeStart}-${rangeEnd}`;
}
