"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

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

  const copyToClipboard = async (text: string) => {
    try {
      await window.navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const openInStellarExpert = () => {
    window.open(`https://stellar.expert/explorer/public/account/${accountId}`, "_blank");
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
            onClick={() => void copyToClipboard(accountId)}
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
