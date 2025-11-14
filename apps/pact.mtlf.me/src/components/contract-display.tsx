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

// Stellar account ID regex for validation
const stellarAccountRegex = /^(G[A-Z0-9]{55})$/;

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
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-primary uppercase mt-8 mb-4 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-foreground uppercase mt-6 mb-3">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-bold text-foreground uppercase mt-4 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-foreground font-mono text-sm leading-[1.6]">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside ml-6 mb-4 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-foreground font-mono text-sm leading-[1.6] pl-2">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-primary">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-accent">{children}</em>
                ),
                code: ({ children }) => {
                  const text = String(children);
                  const match = text.match(stellarAccountRegex);

                  if (match?.[1]) {
                    const accountId = match[1];
                    const shortened = `${accountId.slice(0, 4)}...${accountId.slice(-4)}`;
                    return (
                      <code className="bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">
                        <a
                          href={`https://bsn.expert/accounts/${accountId}`}
                          className="text-primary hover:text-accent underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {shortened}
                        </a>
                      </code>
                    );
                  }

                  return (
                    <code className="bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">
                      {children}
                    </code>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
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
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-2 border-border">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted">{children}</thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-border">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2 text-left font-bold text-primary uppercase text-xs border-r border-border last:border-r-0">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 text-sm font-mono border-r border-border last:border-r-0">
                    {children}
                  </td>
                ),
                hr: () => <hr className="my-6 border-t-2 border-border" />,
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
