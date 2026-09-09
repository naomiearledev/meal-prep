// @vitest-environment node
import { describe, it, expect } from "vitest";
import { fitWithin } from "./images";

describe("fitWithin", () => {
  it("leaves small images alone", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("scales a landscape image so its width is the limit", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales a portrait image so its height is the limit", () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("rounds to whole pixels", () => {
    expect(fitWithin(3001, 2000, 1600)).toEqual({ width: 1600, height: 1066 });
  });
});
