"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as S from "@effect/schema/Schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

// Error definitions
export class ClipboardError extends S.TaggedError<ClipboardError>()(
  "ClipboardError",
  {
    message: S.String,
    cause: S.optional(S.Unknown)
  }
) {}

interface StellarAccountProps {
  accountId: string;
  className?: string;
  showIcon?: boolean;
}

export function StellarAccount({ accountId, className = "", showIcon = true }: StellarAccountProps) {
  const [copied, setCopied] = useState(false);

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    const program = pipe(
      Effect.tryPromise({
        try: () => window.navigator.clipboard.writeText(text),
        catch: (error) => new ClipboardError({
          message: "Failed to copy to clipboard",
          cause: error
        })
      }),
      Effect.tap(() => Effect.sync(() => setCopied(true))),
      Effect.tap(() =>
        Effect.delay(
          Effect.sync(() => setCopied(false)),
          "2 seconds"
        )
      ),
      Effect.catchAll((error) =>
        pipe(
          Effect.logError(`Clipboard operation failed: ${error.message}`),
          Effect.tap(() => Effect.sync(() => setCopied(false)))
        )
      )
    );

    Effect.runPromise(program).catch(() => {
      // Fallback: already handled by Effect error handling
    });
  };

  const openInStellarExpert = () => {
    const program = pipe(
      Effect.sync(() =>
        window.open(`https://stellar.expert/explorer/public/account/${accountId}`, "_blank")
      ),
      Effect.tap(() => Effect.log(`Opened Stellar Expert for account: ${accountId}`))
    );

    Effect.runSync(program);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={openInStellarExpert}
            className="font-mono text-steel-gray hover:text-cyber-green transition-colors cursor-pointer"
          >
            {formatAddress(accountId)}
            {showIcon && <ExternalLink className="w-3 h-3 inline ml-1" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="font-mono space-y-2">
            <div className="text-cyber-green uppercase text-xs">STELLAR ACCOUNT</div>
            <div className="text-xs break-all">{accountId}</div>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => copyToClipboard(accountId)}
            className="text-steel-gray hover:text-cyber-green transition-colors p-1"
          >
            <Copy className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="font-mono text-xs">
            {copied ? "✅ COPIED!" : "Copy account ID"}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}