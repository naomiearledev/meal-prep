import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { OrdersList } from "./OrdersList";

const noop = async () => {};

const orders = [
  {
    id: 2,
    createdAt: new Date(2026, 8, 7, 9, 0),
    fulfilledAt: null,
    totalPortions: 5,
    items: [
      { recipeId: 10, recipeName: "Biryani", portions: 5 },
    ],
  },
  {
    id: 1,
    createdAt: new Date(2026, 8, 3, 9, 0),
    fulfilledAt: new Date(2026, 8, 4, 18, 0),
    totalPortions: 5,
    items: [
      { recipeId: 10, recipeName: "Biryani", portions: 3 },
      { recipeId: 11, recipeName: "Chilli", portions: 2 },
    ],
  },
];

describe("OrdersList", () => {
  it("says when there is nothing outstanding", () => {
    render(<OrdersList orders={[]} toggleFulfilledAction={noop} />);
    expect(screen.getByText(/no outstanding orders/i)).toBeInTheDocument();
  });

  it("shows each order's date, items and fulfilled state with the right toggle", () => {
    render(<OrdersList orders={orders} toggleFulfilledAction={noop} />);
    const open = screen.getByRole("listitem", { name: /7 Sept 2026/ });
    expect(within(open).getByText("Biryani × 5")).toBeInTheDocument();
    expect(within(open).getByRole("button", { name: "Mark fulfilled" })).toBeInTheDocument();
    expect(within(open).queryByText(/fulfilled/i, { selector: "span" })).not.toBeInTheDocument();

    const done = screen.getByRole("listitem", { name: /3 Sept 2026/ });
    expect(within(done).getByText("Biryani × 3")).toBeInTheDocument();
    expect(within(done).getByText("Chilli × 2")).toBeInTheDocument();
    expect(within(done).getByText("Fulfilled 4 Sept 2026")).toBeInTheDocument();
    expect(within(done).getByRole("button", { name: "Mark outstanding" })).toBeInTheDocument();
  });
});
