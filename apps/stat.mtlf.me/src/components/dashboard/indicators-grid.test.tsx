import type { DecimalString, Indicator } from "@/lib/api/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "bun:test";
import { IndicatorsGrid } from "./indicators-grid";

afterEach(cleanup);

const dec = (s: string): DecimalString => s as DecimalString;

const make = (id: number, name: string, description = ""): Indicator => ({
  id,
  name,
  description,
  unit: "EURMTL",
  value: dec("100"),
});

const sample: Indicator[] = [
  make(1, "Assets Value", "Total fund assets"),
  make(2, "Operating Balance", "Cash and equivalents"),
  make(3, "DEFI Total Value", "DEFI subfund assets"),
];

const ALL_KEY_IDS = [1, 2, 3];

describe("IndicatorsGrid", () => {
  test("renders all indicators in default LIST view", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    expect(screen.getByText("Assets Value")).toBeDefined();
    expect(screen.getByText("Operating Balance")).toBeDefined();
    expect(screen.getByText("DEFI Total Value")).toBeDefined();
  });

  test("LIST is the default view (aria-pressed)", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    expect(screen.getByRole("button", { name: "LIST" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "CARDS" }).getAttribute("aria-pressed")).toBe("false");
  });

  test("typing in search filters by name", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "defi" } });
    expect(screen.queryByText("Assets Value")).toBeNull();
    expect(screen.queryByText("Operating Balance")).toBeNull();
    expect(screen.getByText("DEFI Total Value")).toBeDefined();
  });

  test("typing in search filters by description", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "cash" } });
    expect(screen.queryByText("Assets Value")).toBeNull();
    expect(screen.getByText("Operating Balance")).toBeDefined();
  });

  test("name match ranks above description match", () => {
    const items: Indicator[] = [
      make(10, "Foo Bar", "this contains DEFI in description"),
      make(11, "DEFI Subfund", "unrelated description"),
    ];
    render(<IndicatorsGrid data={items} keyIds={[10, 11]} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "defi" } });
    const rendered = screen.getAllByText(/DEFI Subfund|Foo Bar/);
    expect(rendered[0]?.textContent).toBe("DEFI Subfund");
  });

  test("empty/whitespace query shows full list", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "   " } });
    expect(screen.getByText("Assets Value")).toBeDefined();
    expect(screen.getByText("Operating Balance")).toBeDefined();
    expect(screen.getByText("DEFI Total Value")).toBeDefined();
  });

  test("shows NO MATCHES state for non-matching query", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "xyzzy" } });
    expect(screen.getByText(/NO MATCHES FOR/)).toBeDefined();
  });

  test("shows INDICATORS NOT YET COMPUTED when data is empty", () => {
    render(<IndicatorsGrid data={[]} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    expect(screen.getByText("INDICATORS NOT YET COMPUTED")).toBeDefined();
  });

  test("shows error state", () => {
    render(<IndicatorsGrid data={[]} keyIds={ALL_KEY_IDS} isLoading={false} error="boom" />);
    expect(screen.getByText("ERROR: boom")).toBeDefined();
  });

  test("CLEAR button resets query and restores full list", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "defi" } });
    fireEvent.click(screen.getByRole("button", { name: "CLEAR" }));
    expect(screen.getByText("Assets Value")).toBeDefined();
    expect(screen.getByText("Operating Balance")).toBeDefined();
    expect(screen.getByText("DEFI Total Value")).toBeDefined();
  });

  test("counter shows filtered/total when filtering reduces count", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "defi" } });
    expect(screen.getByText(/1 \/ 3 INDICATORS/)).toBeDefined();
  });

  test("counter shows just total when no filter applied", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    expect(screen.getByText("3 INDICATORS")).toBeDefined();
  });

  test("CARDS toggle switches view", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole("button", { name: "CARDS" }));
    expect(screen.getByRole("button", { name: "CARDS" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "LIST" }).getAttribute("aria-pressed")).toBe("false");
  });

  test("ID search \"I30\" filters to id=30 row only", () => {
    const items: Indicator[] = [
      make(26, "EURMTL Volume", "Volume metric"),
      make(30, "Price Book Ratio", "Book ratio metric"),
    ];
    render(<IndicatorsGrid data={items} keyIds={[26, 30]} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "I30" } });
    expect(screen.getByText("Price Book Ratio")).toBeDefined();
    expect(screen.queryByText("EURMTL Volume")).toBeNull();
  });

  test("ID prefix \"I3\" includes id=30 but excludes id=130", () => {
    const items: Indicator[] = [
      make(30, "Three", ""),
      make(130, "OneThirty", ""),
    ];
    render(<IndicatorsGrid data={items} keyIds={[30, 130]} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "I3" } });
    expect(screen.getByText("Three")).toBeDefined();
    expect(screen.queryByText("OneThirty")).toBeNull();
  });

  test("list view ready: header row is rendered", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    expect(screen.getByText("ID")).toBeDefined();
    expect(screen.getByText("NAME")).toBeDefined();
    expect(screen.getByText("VALUE")).toBeDefined();
    expect(screen.getByText("30D")).toBeDefined();
  });

  test("list view loading: header row is rendered", () => {
    render(<IndicatorsGrid data={[]} keyIds={ALL_KEY_IDS} isLoading={true} error={null} />);
    expect(screen.getByText("ID")).toBeDefined();
    expect(screen.getByText("NAME")).toBeDefined();
  });

  test("cards view ready: header row is NOT rendered", () => {
    render(<IndicatorsGrid data={sample} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole("button", { name: "CARDS" }));
    expect(screen.queryByText("ID")).toBeNull();
    expect(screen.queryByText("NAME")).toBeNull();
  });

  test("empty state: header row is NOT rendered", () => {
    render(<IndicatorsGrid data={[]} keyIds={ALL_KEY_IDS} isLoading={false} error={null} />);
    expect(screen.queryByText("ID")).toBeNull();
    expect(screen.queryByText("NAME")).toBeNull();
  });

  test("error state: header row is NOT rendered", () => {
    render(<IndicatorsGrid data={[]} keyIds={ALL_KEY_IDS} isLoading={false} error="boom" />);
    expect(screen.queryByText("ID")).toBeNull();
    expect(screen.queryByText("NAME")).toBeNull();
  });

  test("KEY scope is the default and shows only key indicators", () => {
    render(<IndicatorsGrid data={sample} keyIds={[1, 3]} isLoading={false} error={null} />);
    expect(screen.getByRole("button", { name: "KEY" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "ALL" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Assets Value")).toBeDefined();
    expect(screen.queryByText("Operating Balance")).toBeNull();
    expect(screen.getByText("DEFI Total Value")).toBeDefined();
    expect(screen.getByText("2 INDICATORS")).toBeDefined();
  });

  test("ALL scope shows every indicator", () => {
    render(<IndicatorsGrid data={sample} keyIds={[1]} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole("button", { name: "ALL" }));
    expect(screen.getByRole("button", { name: "ALL" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Assets Value")).toBeDefined();
    expect(screen.getByText("Operating Balance")).toBeDefined();
    expect(screen.getByText("DEFI Total Value")).toBeDefined();
    expect(screen.getByText("3 INDICATORS")).toBeDefined();
  });

  test("KEY scope with no matching ids in data shows NO KEY INDICATORS AVAILABLE", () => {
    render(<IndicatorsGrid data={sample} keyIds={[999]} isLoading={false} error={null} />);
    expect(screen.getByText("NO KEY INDICATORS AVAILABLE")).toBeDefined();
    expect(screen.queryByText("INDICATORS NOT YET COMPUTED")).toBeNull();
  });

  test("search is scoped to the active set", () => {
    render(<IndicatorsGrid data={sample} keyIds={[1]} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText("Search indicators"), { target: { value: "defi" } });
    expect(screen.getByText(/NO MATCHES FOR/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ALL" }));
    expect(screen.getByText("DEFI Total Value")).toBeDefined();
  });
});
