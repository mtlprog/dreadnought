"use client";

import type { Contract } from "@/types";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface ContractDisplayProps {
  contract: Contract;
}

export function ContractDisplay({ contract }: ContractDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Contract Header */}
      <div className="border-2 border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-primary uppercase mb-4">
          {contract.metadata.name}
        </h2>
        <p className="text-foreground font-mono text-sm leading-relaxed">
          {contract.metadata.description}
        </p>
      </div>

      {/* Contract Document */}
      {contract.markdown && (
        <div className="border-2 border-border bg-card p-6">
          <h3 className="text-xl font-bold text-primary uppercase mb-4">
            Contract Document
          </h3>
          <div className="prose prose-sm max-w-none prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold text-primary uppercase mb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold text-foreground uppercase mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold text-foreground uppercase mb-1">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-2 text-foreground font-mono text-sm leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-foreground font-mono text-sm">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-primary">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-accent">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1 py-0.5 text-xs font-mono text-primary">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-primary hover:text-accent underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {contract.markdown}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* No Document Available */}
      {!contract.markdown && (
        <div className="border-2 border-border bg-card p-6">
          <div className="text-muted-foreground font-mono text-sm uppercase text-center">
            No document URL provided in metadata
          </div>
        </div>
      )}
    </div>
  );
}
