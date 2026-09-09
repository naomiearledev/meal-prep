import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("shows the app name as the page heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Meal Prep" }),
    ).toBeInTheDocument();
  });
});
