import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "bun:test";
import { Github } from "lucide-react";
import { Footer, type FooterSection } from "./footer";

describe("Footer", () => {
  const mockSections: FooterSection[] = [
    {
      title: "Resources",
      links: [
        { href: "/docs", label: "Documentation" },
        { href: "/api", label: "API" },
      ],
    },
    {
      title: "Community",
      links: [
        { href: "https://github.com/test", label: "GitHub", external: true, icon: Github },
      ],
    },
  ];

  test("should render footer with title", () => {
    render(
      <Footer
        title="Test App"
        description="Test description"
        sections={mockSections}
      />,
    );

    const title = screen.getByText("Test App");
    expect(title).toBeInTheDocument();
  });

  test("should render description as string", () => {
    render(
      <Footer
        title="App"
        description="This is a description"
        sections={mockSections}
      />,
    );

    const description = screen.getByText("This is a description");
    expect(description).toBeInTheDocument();
  });

  test("should render all sections", () => {
    render(
      <Footer
        title="App"
        description="Description"
        sections={mockSections}
      />,
    );

    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  test("should render all links", () => {
    render(
      <Footer
        title="App"
        description="Description"
        sections={mockSections}
      />,
    );

    expect(screen.getByRole("link", { name: /documentation/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /api/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });

  test("should apply correct href to links", () => {
    render(
      <Footer
        title="App"
        description="Description"
        sections={mockSections}
      />,
    );

    const docsLink = screen.getByRole("link", { name: /documentation/i });
    expect(docsLink.getAttribute("href")).toBe("/docs");
  });

  test("should add target=_blank for external links", () => {
    render(
      <Footer
        title="App"
        description="Description"
        sections={mockSections}
      />,
    );

    const githubLink = screen.getByRole("link", { name: /github/i });
    expect(githubLink.getAttribute("target")).toBe("_blank");
    expect(githubLink.getAttribute("rel")).toBe("noopener noreferrer");
  });

  test("should render bottom text", () => {
    render(
      <Footer
        title="App"
        description="Description"
        sections={mockSections}
        bottomText="© 2025 Test Company"
      />,
    );

    const bottomText = screen.getByText("© 2025 Test Company");
    expect(bottomText).toBeInTheDocument();
  });
});
