import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  test("should render button with children", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  test("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  test("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-class");
  });

  test("should render as child component with asChild", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/test");
  });
});

describe("buttonVariants", () => {
  test("should generate classes string", () => {
    const classes = buttonVariants();
    expect(typeof classes).toBe("string");
    expect(classes.length).toBeGreaterThan(0);
  });

  test("should include primary background in default variant", () => {
    const classes = buttonVariants();
    expect(classes).toContain("bg-primary");
  });

  test("should accept variant parameter", () => {
    const destructiveClasses = buttonVariants({ variant: "destructive" });
    expect(destructiveClasses).toContain("bg-destructive");
  });

  test("should accept size parameter", () => {
    const smallClasses = buttonVariants({ size: "sm" });
    expect(smallClasses).toContain("h-10");
  });
});
