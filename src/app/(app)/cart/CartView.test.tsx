import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CartView } from "./CartView";

const noop = async () => {};

const lines = [
  { id: 1, recipeId: 10, portions: 4, recipe: { id: 10, name: "Biryani", photoUrl: null } },
  { id: 2, recipeId: 11, portions: 2, recipe: { id: 11, name: "Chilli", photoUrl: "/api/photos/c.jpg" } },
];

describe("CartView", () => {
  it("explains an empty cart and offers no order button", () => {
    render(<CartView lines={[]} updateAction={noop} removeAction={noop} createOrderAction={noop} />);
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /recipes/i })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: /create order/i })).not.toBeInTheDocument();
  });

  it("shows each recipe with its portions, the total, and a create order button", () => {
    render(<CartView lines={lines} updateAction={noop} removeAction={noop} createOrderAction={noop} />);
    const biryani = screen.getByRole("listitem", { name: "Biryani" });
    expect(within(biryani).getByLabelText("Portions")).toHaveValue(4);
    expect(within(biryani).getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(within(biryani).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(within(biryani).getByRole("link", { name: "Biryani" })).toHaveAttribute("href", "/recipes/10");

    expect(screen.getByText(/6 portions/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create order" })).toBeInTheDocument();
  });

  it("shows an error message when given one", () => {
    render(<CartView lines={lines} updateAction={noop} removeAction={noop} createOrderAction={noop} error="Portions must be a whole number" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Portions must be a whole number");
  });
});
