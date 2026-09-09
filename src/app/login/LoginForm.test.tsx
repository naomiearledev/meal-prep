import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("asks for the password", () => {
    render(<LoginForm action={async () => {}} />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error after a wrong password", () => {
    render(<LoginForm action={async () => {}} error="wrong" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong password");
  });
});
