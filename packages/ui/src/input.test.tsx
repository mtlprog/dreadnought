import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Input } from "./input";

describe("Input", () => {
  test("should render input element", () => {
    render(<Input />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  test("should accept placeholder text", () => {
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText("Enter text");
    expect(input).toBeInTheDocument();
  });

  test("should be disabled when disabled prop is true", () => {
    render(<Input disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  test("should accept value attribute", () => {
    render(<Input value="test value" readOnly />);

    const input = screen.getByRole("textbox");
    expect(input.value).toBe("test value");
  });

  test("should support number type", () => {
    render(<Input type="number" />);

    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
  });

  test("should forward ref correctly", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
