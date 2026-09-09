import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShoppingListView } from "./ShoppingListView";

const lines = [
  { ingredientId: 1, name: "Chicken thigh", value: 1200, unit: "g" as const, countUnit: null, display: "1.2 kg" },
  { ingredientId: 2, name: "Egg", value: 3, unit: "each" as const, countUnit: "egg", display: "3 eggs" },
];

describe("ShoppingListView", () => {
  it("names the orders it covers and lists each ingredient with its quantity", () => {
    render(<ShoppingListView orderDates={["3 Sept 2026", "7 Sept 2026"]} lines={lines} />);
    expect(screen.getByText(/3 Sept 2026.*7 Sept 2026/)).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["Chicken thigh 1.2 kg", "Egg 3 eggs"]);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("explains when nothing was selected", () => {
    render(<ShoppingListView orderDates={[]} lines={[]} />);
    expect(screen.getByText(/no orders selected/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orders/i })).toHaveAttribute("href", "/orders");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
