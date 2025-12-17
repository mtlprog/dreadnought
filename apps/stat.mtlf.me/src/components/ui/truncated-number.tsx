"use client";

import { formatNumber } from "@/lib/utils";
import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface TruncatedNumberProps {
  value: number | null | undefined;
  /** Number of decimal places to show in truncated view (default: 1) */
  truncatedDecimals?: number;
  /** Full number of decimal places for copy and tooltip (default: same as original formatting) */
  fullDecimals?: number;
  /** Additional CSS classes for the number display */
  className?: string;
  /** Suffix to add after the number (e.g., " EURMTL") */
  suffix?: string;
  /** Disable the built-in tooltip (useful when used inside another tooltip) */
  disableTooltip?: boolean;
}

/**
 * TruncatedNumber - Display numbers with truncation, hover tooltip, and click-to-copy
 *
 * Features:
 * - Shows truncated number by default (1 decimal place)
 * - Shows full number on hover via tooltip
 * - Copies full number to clipboard on click
 * - Visual feedback on successful copy
 */
export function TruncatedNumber({
  value,
  truncatedDecimals = 1,
  fullDecimals = 7,
  className = "",
  suffix = "",
  disableTooltip = false,
}: TruncatedNumberProps) {
  const [copied, setCopied] = React.useState(false);

  const truncatedDisplay = formatNumber(value, truncatedDecimals);
  const fullDisplay = formatNumber(value, fullDecimals);

  const handleClick = async () => {
    try {
      // Copy the raw number without formatting (no thin spaces)
      const safeValue = value ?? 0;
      await navigator.clipboard.writeText(safeValue.toFixed(fullDecimals));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const content = (
    <span
      onClick={() => void handleClick()}
      className={`cursor-pointer hover:underline underline-offset-2 ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void handleClick();
        }
      }}
    >
      {truncatedDisplay}
      {suffix}
    </span>
  );

  if (disableTooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="font-mono space-y-2">
            {copied ? (
              <div className="text-cyber-green uppercase text-sm font-bold">
                ✓ СКОПИРОВАНО
              </div>
            ) : (
              <>
                <div className="text-electric-cyan uppercase text-xs font-bold border-b border-electric-cyan/30 pb-1">
                  ПОЛНОЕ ЗНАЧЕНИЕ
                </div>
                <div className="text-foreground text-sm break-all">
                  {fullDisplay}
                  {suffix}
                </div>
                <div className="text-steel-gray text-[10px] uppercase mt-2 pt-2 border-t border-steel-gray/30">
                  Нажмите для копирования
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
