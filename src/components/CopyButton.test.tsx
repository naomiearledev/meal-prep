import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./CopyButton";

describe("CopyButton", () => {
  it("copies the text to the clipboard and says so", async () => {
    const user = userEvent.setup();
    render(<CopyButton text={"Eggs 6 eggs\nMilk 1 L"} label="Copy list" />);
    await user.click(screen.getByRole("button", { name: "Copy list" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/copied/i);
    expect(await navigator.clipboard.readText()).toBe("Eggs 6 eggs\nMilk 1 L");
  });
});
