/**
 * Reads ids from a query string value: `?ids=3`, `?ids=3&ids=7` or `?ids=3,7`.
 * Anything that isn't a positive whole number is dropped, as are duplicates.
 */
export function parseIds(value: string | string[] | undefined): number[] {
  const parts = (Array.isArray(value) ? value : [value ?? ""]).flatMap((part) => part.split(","));
  const ids = parts
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .map(Number)
    .filter((id) => id > 0);
  return [...new Set(ids)];
}
