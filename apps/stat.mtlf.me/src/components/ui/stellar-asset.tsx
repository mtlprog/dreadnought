"use client";

import type { BlockchainExplorer } from "@/lib/blockchain-explorer";
import { Option } from "effect";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface StellarAssetProps {
  assetCode: string;
  assetIssuer?: string;
  explorer: BlockchainExplorer;
  className?: string;
}

export function StellarAsset({ assetCode, assetIssuer, explorer, className = "" }: StellarAssetProps) {
  const url = explorer.assetUrl(assetCode, assetIssuer);

  const openInExplorer = () => {
    Option.match(url, {
      onNone: () => {},
      onSome: (href) => window.open(href, "_blank"),
    });
  };

  const codeElement = Option.isSome(url)
    ? (
      <button
        onClick={openInExplorer}
        className={`font-mono text-cyber-green hover:text-white transition-colors cursor-pointer ${className}`}
      >
        {assetCode}
      </button>
    )
    : (
      <span className={`font-mono text-cyber-green ${className}`}>
        {assetCode}
      </span>
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {codeElement}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="font-mono space-y-2">
          <div className="text-cyber-green uppercase text-xs">STELLAR ASSET</div>
          <div className="text-xs">
            <span className="text-steel-gray">CODE:</span> {assetCode}
          </div>
          {assetIssuer !== undefined && assetIssuer !== null && assetIssuer !== "" && assetCode !== "XLM" && (
            <div className="text-xs break-all">
              <span className="text-steel-gray">ISSUER:</span> {assetIssuer}
            </div>
          )}
          {(assetCode === "XLM" || assetIssuer === undefined || assetIssuer === null || assetIssuer === "") && (
            <div className="text-xs text-steel-gray">
              Native Stellar Lumens (XLM)
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
