import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecipeGrid } from "./RecipeGrid";

describe("RecipeGrid", () => {
  it("points at adding a recipe when there are none", () => {
    render(<RecipeGrid recipes={[]} />);
    expect(screen.getByText(/no recipes yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add/i })).toHaveAttribute("href", "/recipes/new");
  });

  it("links each card to its recipe and shows the photo when there is one", () => {
    render(
      <RecipeGrid
        recipes={[
          { id: 1, name: "Biryani", photoUrl: "/api/photos/a.jpg" },
          { id: 2, name: "Chilli", photoUrl: null },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /Biryani/ })).toHaveAttribute("href", "/recipes/1");
    expect(screen.getByRole("link", { name: /Chilli/ })).toHaveAttribute("href", "/recipes/2");
    expect(screen.getByRole("img", { name: "Biryani" })).toHaveAttribute("src", "/api/photos/a.jpg");
    expect(screen.queryByRole("img", { name: "Chilli" })).not.toBeInTheDocument();
  });
});
