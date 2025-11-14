"use client";

import type { Contract } from "@/types";
import { Button } from "@dreadnought/ui";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface ContractDisplayProps {
  contract: Contract;
}

// Helper to detect and render Stellar account IDs
function renderStellarAccount(text: string) {
  const stellarAccountRegex = /^(G[A-Z0-9]{55})$/;
  const match = text.match(stellarAccountRegex);

  if (match?.[1]) {
    const accountId = match[1];
    const shortened = `${accountId.slice(0, 4)}...${accountId.slice(-4)}`;
    return (
      <a
        href={`https://bsn.expert/accounts/${accountId}`}
        className="text-primary hover:text-accent underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {shortened}
      </a>
    );
  }

  return text;
}

export function ContractDisplay({ contract }: ContractDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!contract.markdown) return;

    void navigator.clipboard.writeText(contract.markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenRaw = () => {
    if (!contract.metadata.url) return;

    // If url is already a full URL, use it; otherwise construct IPFS gateway URL
    const rawUrl = contract.metadata.url.startsWith("http")
      ? contract.metadata.url
      : `https://ipfs.io/ipfs/${contract.metadata.url}`;

    window.open(rawUrl, "_blank");
  };

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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-primary uppercase">
              Contract Document
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenRaw}
                className="uppercase font-mono text-xs"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                RAW
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="uppercase font-mono text-xs"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copied ? "COPIED!" : "COPY"}
              </Button>
            </div>
          </div>
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
                code: ({ children }) => {
                  const text = String(children);
                  const content = renderStellarAccount(text);

                  return (
                    <code className="bg-muted px-1 py-0.5 text-xs font-mono text-primary">
                      {content}
                    </code>
                  );
                },
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
