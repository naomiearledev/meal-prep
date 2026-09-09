import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngredientForm } from "./IngredientForm";

const library = [
  { id: 1, name: "Olive oil", measureType: "weight" as const, gramsPerMl: 0.92, countUnit: null, gramsEach: null },
  { id: 2, name: "Egg", measureType: "count" as const, gramsPerMl: null, countUnit: "egg", gramsEach: 58 },
];

const noop = async () => ({});

describe("IngredientForm", () => {
  it("asks for name, type and density, hiding count fields for weight", () => {
    render(<IngredientForm action={noop} library={library} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight")).toBeChecked();
    expect(screen.getByLabelText(/Grams per ml/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Count unit")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Grams each/)).not.toBeInTheDocument();
  });

  it("shows count fields when the type is count", async () => {
    const user = userEvent.setup();
    render(<IngredientForm action={noop} library={library} />);
    await user.click(screen.getByLabelText("Count"));
    expect(screen.getByLabelText("Count unit")).toBeInTheDocument();
    expect(screen.getByLabelText(/Grams each/)).toBeInTheDocument();
  });

  it("copies type and density from a 'same as' ingredient without touching the name", async () => {
    const user = userEvent.setup();
    render(<IngredientForm action={noop} library={library} />);
    await user.type(screen.getByLabelText("Name"), "Rapeseed oil");
    await user.selectOptions(screen.getByLabelText(/Same as/), "Olive oil");
    expect(screen.getByLabelText("Name")).toHaveValue("Rapeseed oil");
    expect(screen.getByLabelText("Weight")).toBeChecked();
    expect(screen.getByLabelText(/Grams per ml/)).toHaveValue(0.92);

    await user.selectOptions(screen.getByLabelText(/Same as/), "Egg");
    expect(screen.getByLabelText("Count")).toBeChecked();
    expect(screen.getByLabelText("Count unit")).toHaveValue("egg");
    expect(screen.getByLabelText(/Grams each/)).toHaveValue(58);
  });

  it("starts from the existing values when editing", () => {
    render(<IngredientForm action={noop} library={library} initial={library[1]} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Egg");
    expect(screen.getByLabelText("Count")).toBeChecked();
    expect(screen.getByLabelText("Count unit")).toHaveValue("egg");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("shows the errors the action returns", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ errors: { name: "An ingredient called Egg already exists" } }));
    render(<IngredientForm action={action} library={library} />);
    await user.type(screen.getByLabelText("Name"), "Egg");
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(await screen.findByText("An ingredient called Egg already exists")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Egg");
  });
});
