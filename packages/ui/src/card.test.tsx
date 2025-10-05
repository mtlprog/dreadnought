import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

describe("Card components", () => {
  test("should render card with children", () => {
    render(<Card>Card content</Card>);

    const card = screen.getByText("Card content");
    expect(card).toBeInTheDocument();
  });

  test("should render card header", () => {
    render(<CardHeader>Header content</CardHeader>);

    const header = screen.getByText("Header content");
    expect(header).toBeInTheDocument();
  });

  test("should render card title as heading", () => {
    render(<CardTitle>Title</CardTitle>);

    const title = screen.getByRole("heading", { level: 3 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent("Title");
  });

  test("should render card description", () => {
    render(<CardDescription>Description text</CardDescription>);

    const description = screen.getByText("Description text");
    expect(description).toBeInTheDocument();
  });

  test("should render card content", () => {
    render(<CardContent>Main content</CardContent>);

    const content = screen.getByText("Main content");
    expect(content).toBeInTheDocument();
  });

  test("should render card footer", () => {
    render(<CardFooter>Footer content</CardFooter>);

    const footer = screen.getByText("Footer content");
    expect(footer).toBeInTheDocument();
  });

  test("should render complete card composition", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card Description")).toBeInTheDocument();
    expect(screen.getByText("Card Content")).toBeInTheDocument();
    expect(screen.getByText("Card Footer")).toBeInTheDocument();
  });
});
