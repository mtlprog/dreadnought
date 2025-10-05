import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Progress } from "./progress";

describe("Progress", () => {
  test("should render progress bar", () => {
    render(<Progress value={50} />);

    const progress = screen.getByRole("progressbar");
    expect(progress).toBeInTheDocument();
  });

  test("should accept value prop", () => {
    const { container } = render(<Progress value={75} />);

    const indicator = container.querySelector(".bg-primary");
    expect(indicator).toBeInTheDocument();
  });

  test("should handle 0% progress", () => {
    render(<Progress value={0} />);

    const progress = screen.getByRole("progressbar");
    expect(progress).toBeInTheDocument();
  });

  test("should handle 100% progress", () => {
    render(<Progress value={100} />);

    const progress = screen.getByRole("progressbar");
    expect(progress).toBeInTheDocument();
  });

  test("should be accessible with progressbar role", () => {
    render(<Progress value={50} />);

    const progress = screen.getByRole("progressbar");
    expect(progress).toBeInTheDocument();
  });
});
