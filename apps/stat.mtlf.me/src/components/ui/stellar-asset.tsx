"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface StellarAssetProps {
  assetCode: string;
  assetIssuer?: string;
  className?: string;
}

export function StellarAsset({ assetCode, assetIssuer, className = "" }: StellarAssetProps) {
  const openInStellarExpert = () => {
    if (assetCode === "XLM" || assetIssuer === undefined || assetIssuer === null || assetIssuer === "") {
      window.open("https://stellar.expert/explorer/public/asset/XLM", "_blank");
    } else {
      window.open(`https://stellar.expert/explorer/public/asset/${assetCode}-${assetIssuer}`, "_blank");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={openInStellarExpert}
          className={`font-mono text-cyber-green hover:text-white transition-colors cursor-pointer ${className}`}
        >
          {assetCode}
        </button>
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
