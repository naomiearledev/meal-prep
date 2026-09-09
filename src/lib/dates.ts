const withYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const withoutYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "3 Sept 2026" */
export function formatOrderDate(date: Date): string {
  return withYear.format(date);
}

/** "3 Sept", for tight table headings. */
export function formatShortDate(date: Date): string {
  return withoutYear.format(date);
}
