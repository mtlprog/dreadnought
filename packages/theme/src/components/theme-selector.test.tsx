import { render, screen } from "@testing-library/react";
import { describe, expect, mock, test } from "bun:test";
import { ThemeSelector } from "./theme-selector";

// Mock the server actions module
mock.module("@/app/actions", () => ({
  setTheme: mock(async () => {}),
  getTheme: mock(async () => "dark" as const),
}));

describe("ThemeSelector", () => {
  test("should render theme selector button", () => {
    render(<ThemeSelector />);

    const button = screen.getByRole("button", { name: /select theme/i });
    expect(button).toBeInTheDocument();
  });

  test("should have correct button classes for styling", () => {
    render(<ThemeSelector />);

    const button = screen.getByRole("button", { name: /select theme/i });
    expect(button).toHaveClass("border-2");
    expect(button).toHaveClass("bg-background/90");
    expect(button).toHaveClass("h-12");
    expect(button).toHaveClass("w-12");
  });

  test("should render sun icon for light mode", () => {
    render(<ThemeSelector />);

    const button = screen.getByRole("button", { name: /select theme/i });
    const icon = button.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  test("should be accessible with proper aria-label", () => {
    render(<ThemeSelector />);

    const button = screen.getByLabelText("Select theme");
    expect(button).toBeInTheDocument();
  });

  test("should have proper focus-visible styles", () => {
    render(<ThemeSelector />);

    const button = screen.getByRole("button", { name: /select theme/i });
    expect(button).toHaveClass("focus-visible:outline-none");
    expect(button).toHaveClass("focus-visible:ring-2");
  });
});
