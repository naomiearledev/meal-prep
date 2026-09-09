import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PrepSheetView } from "./PrepSheetView";
import type { AllocationRow } from "@/lib/prep";

const chicken = { id: 1, name: "Chicken thigh", measureType: "weight" as const, gramsPerMl: null, countUnit: null, gramsEach: null };
const oliveOil = { id: 2, name: "Olive oil", measureType: "weight" as const, gramsPerMl: 0.92, countUnit: null, gramsEach: null };
const egg = { id: 3, name: "Egg", measureType: "count" as const, gramsPerMl: null, countUnit: "egg", gramsEach: 58 };

const biryani = {
  id: 10,
  name: "Biryani",
  notes: null,
  photoUrl: null,
  createdAt: new Date(),
  ingredients: [
    { id: 1, recipeId: 10, ingredientId: 1, amount: 150, unit: "g", position: 0, ingredient: chicken },
    { id: 2, recipeId: 10, ingredientId: 2, amount: 1, unit: "tbsp", position: 1, ingredient: oliveOil },
  ],
  steps: [
    { id: 1, recipeId: 10, position: 0, text: "Brown the chicken." },
    { id: 2, recipeId: 10, position: 1, text: "Bake." },
  ],
};
const chilli = {
  id: 11,
  name: "Chilli",
  notes: null,
  photoUrl: null,
  createdAt: new Date(),
  ingredients: [{ id: 3, recipeId: 11, ingredientId: 3, amount: 0.5, unit: "egg", position: 0, ingredient: egg }],
  steps: [],
};

const allocation: AllocationRow[] = [
  { orderId: 1, date: new Date(2026, 8, 3), portions: { 10: 3, 11: 2 } },
  { orderId: 2, date: new Date(2026, 8, 7), portions: { 10: 5 } },
];

describe("PrepSheetView", () => {
  it("shows each recipe with its total portions, scaled ingredients and steps", () => {
    render(<PrepSheetView recipes={[{ recipe: biryani, portions: 8 }, { recipe: chilli, portions: 2 }]} allocation={allocation} />);

    const biryaniSection = screen.getByRole("region", { name: "Biryani — 8 portions" });
    const lines = within(biryaniSection).getAllByRole("listitem").map((li) => li.textContent);
    expect(lines[0]).toMatch(/^1\.2 kg Chicken thigh/);
    expect(lines[0]).toMatch(/150 g per portion/);
    expect(lines[1]).toMatch(/^110\.4 g Olive oil/);
    expect(lines).toContain("Brown the chicken.");
    expect(lines).toContain("Bake.");

    const chilliSection = screen.getByRole("region", { name: "Chilli — 2 portions" });
    expect(within(chilliSection).getAllByRole("listitem")[0].textContent).toMatch(/^1 egg Egg/);
  });

  it("ends with an allocation table of orders by recipe, dashes where a recipe is not in an order", () => {
    render(<PrepSheetView recipes={[{ recipe: biryani, portions: 8 }, { recipe: chilli, portions: 2 }]} allocation={allocation} />);
    const table = screen.getByRole("table", { name: /allocation/i });
    const headers = within(table).getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual(["Order", "Biryani", "Chilli"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["3 Sept", "3", "2"],
      ["7 Sept", "5", "—"],
    ]);
  });

  it("explains when nothing was selected", () => {
    render(<PrepSheetView recipes={[]} allocation={[]} />);
    expect(screen.getByText(/no orders selected/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toHaveAttribute("href", "/orders");
  });
});
