// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  toBaseUnit,
  allowedUnits,
  formatQuantity,
  roundForShopping,
  ConversionError,
  type IngredientMeasure,
} from "./units";

const oliveOil: IngredientMeasure = {
  measureType: "weight",
  gramsPerMl: 0.92,
  gramsEach: null,
  countUnit: null,
};
const salt: IngredientMeasure = { measureType: "weight", gramsPerMl: 1.2, gramsEach: null, countUnit: null };
const flour: IngredientMeasure = { measureType: "weight", gramsPerMl: 0.53, gramsEach: null, countUnit: null };
const chicken: IngredientMeasure = { measureType: "weight", gramsPerMl: null, gramsEach: null, countUnit: null };
const milk: IngredientMeasure = { measureType: "volume", gramsPerMl: 1.03, gramsEach: null, countUnit: null };
const stock: IngredientMeasure = { measureType: "volume", gramsPerMl: null, gramsEach: null, countUnit: null };
const egg: IngredientMeasure = { measureType: "count", gramsPerMl: null, gramsEach: 58, countUnit: "egg" };
const tin: IngredientMeasure = { measureType: "count", gramsPerMl: null, gramsEach: null, countUnit: "tin" };
const garlic: IngredientMeasure = { measureType: "count", gramsPerMl: 0.6, gramsEach: 5, countUnit: "clove" };

describe("toBaseUnit for a weight ingredient", () => {
  it("passes grams through", () => {
    expect(toBaseUnit(150, "g", chicken)).toEqual({ value: 150, unit: "g" });
  });

  it("converts kilograms to grams", () => {
    expect(toBaseUnit(1.2, "kg", chicken)).toEqual({ value: 1200, unit: "g" });
  });

  it("converts a tablespoon of olive oil using its density", () => {
    expect(toBaseUnit(1, "tbsp", oliveOil)).toEqual({ value: 13.8, unit: "g" });
  });

  it("converts a teaspoon of salt using its density", () => {
    expect(toBaseUnit(1, "tsp", salt)).toEqual({ value: 6, unit: "g" });
  });

  it("converts a cup of flour using its density", () => {
    expect(toBaseUnit(1, "cup", flour)).toEqual({ value: 132.5, unit: "g" });
  });

  it("converts millilitres and litres using density", () => {
    expect(toBaseUnit(100, "ml", oliveOil)).toEqual({ value: 92, unit: "g" });
    expect(toBaseUnit(1, "l", oliveOil)).toEqual({ value: 920, unit: "g" });
  });

  it("refuses a volume unit when the ingredient has no density", () => {
    expect(() => toBaseUnit(1, "tbsp", chicken)).toThrow(ConversionError);
    expect(() => toBaseUnit(1, "tbsp", chicken)).toThrow(/density/i);
  });

  it("refuses a count unit for a weight ingredient", () => {
    expect(() => toBaseUnit(2, "each", chicken)).toThrow(ConversionError);
  });
});

describe("toBaseUnit for a volume ingredient", () => {
  it("passes millilitres through and converts litres and spoons", () => {
    expect(toBaseUnit(200, "ml", stock)).toEqual({ value: 200, unit: "ml" });
    expect(toBaseUnit(1.5, "l", stock)).toEqual({ value: 1500, unit: "ml" });
    expect(toBaseUnit(2, "tbsp", stock)).toEqual({ value: 30, unit: "ml" });
    expect(toBaseUnit(1, "tsp", stock)).toEqual({ value: 5, unit: "ml" });
    expect(toBaseUnit(1, "cup", stock)).toEqual({ value: 250, unit: "ml" });
  });

  it("converts grams to millilitres using density", () => {
    expect(toBaseUnit(103, "g", milk)).toEqual({ value: 100, unit: "ml" });
    expect(toBaseUnit(1.03, "kg", milk)).toEqual({ value: 1000, unit: "ml" });
  });

  it("refuses a weight unit when the ingredient has no density", () => {
    expect(() => toBaseUnit(100, "g", stock)).toThrow(ConversionError);
  });
});

describe("toBaseUnit for a count ingredient", () => {
  it("passes counts through, whatever the count unit is called", () => {
    expect(toBaseUnit(2, "each", egg)).toEqual({ value: 2, unit: "each" });
    expect(toBaseUnit(2, "egg", egg)).toEqual({ value: 2, unit: "each" });
    expect(toBaseUnit(1, "tin", tin)).toEqual({ value: 1, unit: "each" });
  });

  it("converts grams to a count when gramsEach is known", () => {
    expect(toBaseUnit(116, "g", egg)).toEqual({ value: 2, unit: "each" });
  });

  it("refuses grams when gramsEach is not known", () => {
    expect(() => toBaseUnit(400, "g", tin)).toThrow(ConversionError);
  });

  it("converts a spoon to a count when both density and gramsEach are known", () => {
    // 1 tsp = 5 ml × 0.6 g/ml = 3 g; 3 g ÷ 5 g per clove = 0.6 cloves
    expect(toBaseUnit(1, "tsp", garlic)).toEqual({ value: 0.6, unit: "each" });
  });

  it("refuses a spoon when density is missing", () => {
    expect(() => toBaseUnit(1, "tsp", egg)).toThrow(ConversionError);
  });
});

describe("toBaseUnit input checks", () => {
  it("refuses an unknown unit", () => {
    expect(() => toBaseUnit(1, "handful", chicken)).toThrow(ConversionError);
  });

  it("refuses a negative or non-finite amount", () => {
    expect(() => toBaseUnit(-1, "g", chicken)).toThrow(ConversionError);
    expect(() => toBaseUnit(Number.NaN, "g", chicken)).toThrow(ConversionError);
  });

  it("does not accumulate floating point noise", () => {
    expect(toBaseUnit(0.1, "kg", chicken).value).toBe(100);
    expect(toBaseUnit(3, "tbsp", oliveOil).value).toBe(41.4);
  });
});

describe("roundForShopping", () => {
  it("rounds weight to the nearest 5 g", () => {
    expect(roundForShopping(13.8, "g")).toBe(15);
    expect(roundForShopping(12.4, "g")).toBe(10);
    expect(roundForShopping(12.5, "g")).toBe(15);
    expect(roundForShopping(1200, "g")).toBe(1200);
  });

  it("rounds volume to the nearest 5 ml", () => {
    expect(roundForShopping(97.1, "ml")).toBe(95);
    expect(roundForShopping(98, "ml")).toBe(100);
  });

  it("never rounds a positive amount down to nothing", () => {
    expect(roundForShopping(0.6, "g")).toBe(5);
    expect(roundForShopping(2, "ml")).toBe(5);
    expect(roundForShopping(0, "g")).toBe(0);
  });

  it("rounds counts up to whole numbers", () => {
    expect(roundForShopping(2.1, "each")).toBe(3);
    expect(roundForShopping(0.6, "each")).toBe(1);
    expect(roundForShopping(4, "each")).toBe(4);
  });
});

describe("formatQuantity", () => {
  it("shows grams under a kilogram", () => {
    expect(formatQuantity(250, "g")).toBe("250 g");
    expect(formatQuantity(13.8, "g")).toBe("13.8 g");
    expect(formatQuantity(999, "g")).toBe("999 g");
  });

  it("rolls grams into kilograms at 1000", () => {
    expect(formatQuantity(1000, "g")).toBe("1 kg");
    expect(formatQuantity(1200, "g")).toBe("1.2 kg");
    expect(formatQuantity(1255, "g")).toBe("1.26 kg");
  });

  it("shows millilitres and rolls into litres at 1000", () => {
    expect(formatQuantity(250, "ml")).toBe("250 ml");
    expect(formatQuantity(1000, "ml")).toBe("1 L");
    expect(formatQuantity(1500, "ml")).toBe("1.5 L");
  });

  it("shows counts with the ingredient's own unit, pluralised", () => {
    expect(formatQuantity(1, "each", "egg")).toBe("1 egg");
    expect(formatQuantity(3, "each", "egg")).toBe("3 eggs");
    expect(formatQuantity(2, "each", "tin")).toBe("2 tins");
    expect(formatQuantity(2, "each")).toBe("2");
  });

  it("trims meaningless decimals", () => {
    expect(formatQuantity(100.0000001, "g")).toBe("100 g");
    expect(formatQuantity(41.400000000000006, "g")).toBe("41.4 g");
  });
});

describe("allowedUnits", () => {
  it("offers only weight units for a weight ingredient with no density", () => {
    expect(allowedUnits(chicken)).toEqual(["g", "kg"]);
  });

  it("adds volume units when a weight ingredient has a density", () => {
    expect(allowedUnits(oliveOil)).toEqual(["g", "kg", "ml", "l", "tsp", "tbsp", "cup"]);
  });

  it("offers volume units for a volume ingredient, plus weight when it has a density", () => {
    expect(allowedUnits(stock)).toEqual(["ml", "l", "tsp", "tbsp", "cup"]);
    expect(allowedUnits(milk)).toEqual(["ml", "l", "tsp", "tbsp", "cup", "g", "kg"]);
  });

  it("offers the count unit first for a count ingredient, then whatever converts", () => {
    expect(allowedUnits(tin)).toEqual(["tin"]);
    expect(allowedUnits(egg)).toEqual(["egg", "g", "kg"]);
    expect(allowedUnits(garlic)).toEqual(["clove", "g", "kg", "ml", "l", "tsp", "tbsp", "cup"]);
  });
});
