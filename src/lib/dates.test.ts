// @vitest-environment node
import { describe, it, expect } from "vitest";
import { formatOrderDate, formatShortDate } from "./dates";

describe("formatOrderDate", () => {
  it("formats as day, short month and year in British style", () => {
    expect(formatOrderDate(new Date(2026, 8, 3, 9, 0))).toBe("3 Sept 2026");
    expect(formatOrderDate(new Date(2026, 0, 21, 9, 0))).toBe("21 Jan 2026");
  });
});

describe("formatShortDate", () => {
  it("drops the year for table headings", () => {
    expect(formatShortDate(new Date(2026, 8, 3, 9, 0))).toBe("3 Sept");
  });
});
