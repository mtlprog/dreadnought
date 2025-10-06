import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Label } from "./label";

describe("Label", () => {
  test("should render label with text", () => {
    render(<Label>Username</Label>);

    const label = screen.getByText("Username");
    expect(label).toBeInTheDocument();
  });

  test("should accept htmlFor attribute", () => {
    render(<Label htmlFor="username">Username</Label>);

    const label = screen.getByText("Username");
    expect(label.getAttribute("for")).toBe("username");
  });

  test("should apply custom className", () => {
    render(<Label className="custom-label">Text</Label>);

    const label = screen.getByText("Text");
    expect(label.className).toContain("custom-label");
  });

  test("should work with input element", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" type="email" />
      </>,
    );

    const label = screen.getByText("Email");
    const input = screen.getByRole("textbox");

    expect(label.getAttribute("for")).toBe("email");
    expect(input.getAttribute("id")).toBe("email");
  });
});
