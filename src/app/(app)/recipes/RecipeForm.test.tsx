import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecipeForm } from "./RecipeForm";

const library = [
  { id: 1, name: "Olive oil", measureType: "weight" as const, gramsPerMl: 0.92, countUnit: null, gramsEach: null },
  { id: 2, name: "Egg", measureType: "count" as const, gramsPerMl: null, countUnit: "egg", gramsEach: 58 },
  { id: 3, name: "Chicken thigh", measureType: "weight" as const, gramsPerMl: null, countUnit: null, gramsEach: null },
];

const noop = async () => ({});

const unitOptions = (row: HTMLElement) =>
  within(row)
    .getAllByRole("option")
    .filter((option) => option.closest("select")?.getAttribute("aria-label") === "Unit")
    .map((option) => option.textContent);

describe("RecipeForm", () => {
  it("starts with a name, notes, one empty ingredient row and one step, and says amounts are per portion", () => {
    render(<RecipeForm action={noop} library={library} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getAllByRole("group", { name: /ingredient row/i })).toHaveLength(1);
    expect(screen.getAllByLabelText(/^Step \d+$/)).toHaveLength(1);
    expect(screen.getByText(/per portion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add recipe" })).toBeInTheDocument();
  });

  it("offers only the units the chosen ingredient can convert", async () => {
    const user = userEvent.setup();
    render(<RecipeForm action={noop} library={library} />);
    const row = screen.getByRole("group", { name: /ingredient row 1/i });

    await user.selectOptions(within(row).getByLabelText("Ingredient"), "Chicken thigh");
    expect(unitOptions(row)).toEqual(["g", "kg"]);

    await user.selectOptions(within(row).getByLabelText("Ingredient"), "Olive oil");
    expect(unitOptions(row)).toEqual(["g", "kg", "ml", "l", "tsp", "tbsp", "cup"]);

    await user.selectOptions(within(row).getByLabelText("Ingredient"), "Egg");
    expect(unitOptions(row)).toEqual(["egg", "g", "kg"]);
    expect(within(row).getByLabelText("Unit")).toHaveValue("egg");
  });

  it("adds and removes ingredient rows and steps", async () => {
    const user = userEvent.setup();
    render(<RecipeForm action={noop} library={library} />);

    await user.click(screen.getByRole("button", { name: "Add another ingredient" }));
    expect(screen.getAllByRole("group", { name: /ingredient row/i })).toHaveLength(2);
    await user.click(screen.getAllByRole("button", { name: "Remove ingredient" })[0]);
    expect(screen.getAllByRole("group", { name: /ingredient row/i })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Add another step" }));
    expect(screen.getAllByLabelText(/^Step \d+$/)).toHaveLength(2);
    await user.click(screen.getAllByRole("button", { name: "Remove step" })[1]);
    expect(screen.getAllByLabelText(/^Step \d+$/)).toHaveLength(1);
  });

  it("starts from the existing recipe when editing", () => {
    render(
      <RecipeForm
        action={noop}
        library={library}
        initial={{
          id: 7,
          name: "Biryani",
          notes: "Serve hot",
          photoUrl: "/api/photos/abc.jpg",
          createdAt: new Date(),
          ingredients: [
            { id: 1, recipeId: 7, ingredientId: 3, amount: 150, unit: "g", position: 0, ingredient: library[2] },
            { id: 2, recipeId: 7, ingredientId: 1, amount: 1, unit: "tbsp", position: 1, ingredient: library[0] },
          ],
          steps: [
            { id: 1, recipeId: 7, position: 0, text: "Brown the chicken." },
            { id: 2, recipeId: 7, position: 1, text: "Bake." },
          ],
        }}
      />,
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Biryani");
    const rows = screen.getAllByRole("group", { name: /ingredient row/i });
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByLabelText("Ingredient")).toHaveValue("1");
    expect(within(rows[1]).getByLabelText("Amount")).toHaveValue(1);
    expect(within(rows[1]).getByLabelText("Unit")).toHaveValue("tbsp");
    expect(screen.getByLabelText("Step 2")).toHaveValue("Bake.");
    expect(screen.getByRole("img", { name: /photo/i })).toHaveAttribute("src", "/api/photos/abc.jpg");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shows the errors the action returns, against the right row", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      errors: { name: "Give the recipe a name", "ingredient.0": "Choose an ingredient" },
    }));
    render(<RecipeForm action={action} library={library} />);
    await user.type(screen.getByLabelText("Name"), "Something");
    await user.click(screen.getByRole("button", { name: "Add recipe" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(await screen.findByText("Give the recipe a name")).toBeInTheDocument();
    const row = screen.getByRole("group", { name: /ingredient row 1/i });
    expect(within(row).getByText("Choose an ingredient")).toBeInTheDocument();
  });
});
