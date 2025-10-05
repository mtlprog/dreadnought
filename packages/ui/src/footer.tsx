"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export interface FooterLink {
  href: string;
  label: string;
  icon?: LucideIcon;
  external?: boolean;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterProps {
  title: string;
  description: string | ReactNode;
  sections: FooterSection[];
  bottomText?: string | ReactNode;
  className?: string;
}

/**
 * Configurable footer component with Functional Brutalism design
 *
 * @example
 * <Footer
 *   title="App Title"
 *   description="Description text"
 *   sections={[
 *     {
 *       title: "Resources",
 *       links: [
 *         { href: "/docs", label: "Documentation" },
 *         { href: "https://github.com", label: "GitHub", external: true, icon: Github }
 *       ]
 *     }
 *   ]}
 *   bottomText="© 2025 Company"
 * />
 */
export function Footer({
  title,
  description,
  sections,
  bottomText,
  className = "",
}: FooterProps) {
  return (
    <footer className={`border-t-4 border-primary bg-muted mt-24 ${className}`}>
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Title and description section */}
          <div>
            <h3 className="text-2xl font-black text-primary uppercase mb-6">
              {title}
            </h3>
            {typeof description === "string"
              ? (
                <p className="text-base font-mono text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )
              : description}
          </div>

          {/* Dynamic sections */}
          {sections.map((section, idx) => (
            <div key={idx}>
              <h4 className="text-xl font-bold text-foreground uppercase mb-6">
                {section.title}
              </h4>
              <div className="space-y-4">
                {section.links.map((link, linkIdx) => {
                  const Icon = link.icon;
                  const isExternal = link.external ?? link.href.startsWith("http");

                  const linkClasses = Icon
                    ? "flex items-center gap-3 text-lg font-mono text-muted-foreground hover:text-destructive transition-colors"
                    : "block text-lg font-mono text-muted-foreground hover:text-destructive transition-colors";

                  return (
                    <Link
                      key={linkIdx}
                      href={link.href}
                      className={linkClasses}
                      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {Icon ? <Icon className="w-6 h-6" /> : null}
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        {bottomText && (
          <div className="border-t-2 border-border pt-8 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {typeof bottomText === "string"
                ? (
                  <p className="text-base font-mono text-muted-foreground">
                    {bottomText}
                  </p>
                )
                : bottomText}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
