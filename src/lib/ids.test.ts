// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseIds } from "./ids";

describe("parseIds", () => {
  it("reads a single value, a repeated query value, and a comma list", () => {
    expect(parseIds("3")).toEqual([3]);
    expect(parseIds(["3", "7"])).toEqual([3, 7]);
    expect(parseIds("3,7")).toEqual([3, 7]);
    expect(parseIds(["3,7", "9"])).toEqual([3, 7, 9]);
  });

  it("drops junk, negatives and duplicates, and copes with nothing", () => {
    expect(parseIds("3,x,,-1,3,2.5")).toEqual([3]);
    expect(parseIds(undefined)).toEqual([]);
    expect(parseIds("")).toEqual([]);
  });
});
