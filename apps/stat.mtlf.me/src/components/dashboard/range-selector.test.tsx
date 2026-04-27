import type { Range } from "@/lib/api/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";
import { RangeSelector } from "./range-selector";

afterEach(cleanup);

describe("RangeSelector", () => {
  test("renders all 5 range buttons", () => {
    render(<RangeSelector value="90d" onChange={() => {}} />);
    ["30D", "90D", "180D", "1Y", "ALL"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeDefined();
    });
  });

  test("active button differs visually from inactive", () => {
    render(<RangeSelector value="90d" onChange={() => {}} />);
    const active = screen.getByRole("button", { name: "90D" });
    const inactive = screen.getByRole("button", { name: "30D" });
    expect(active.className).not.toBe(inactive.className);
  });

  test("calls onChange with the clicked range", () => {
    const calls: Range[] = [];
    render(<RangeSelector value="90d" onChange={(r) => calls.push(r)} />);
    fireEvent.click(screen.getByRole("button", { name: "365D".replace("365D", "1Y") }));
    expect(calls).toEqual(["365d"]);
  });

  test("group has aria-label", () => {
    render(<RangeSelector value="90d" onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Range selector" })).toBeDefined();
  });
});
