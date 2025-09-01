"use client";

import React, { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink, Loader2, Check } from "lucide-react";

export interface TransactionResultProps {
  // Transaction data
  transactionXDR: string;
  
  // Clipboard functionality
  isCopied?: boolean;
  onCopy?: (text: string) => void;
  
  // Telegram integration
  telegramBotUrl?: string | null;
  isTelegramUrlLoading?: boolean;
  onTelegramOpen?: () => void;
  
  // Styling
  className?: string;
  
  // Configuration
  title?: string;
  showTelegramButton?: boolean;
  showCopyButton?: boolean;
  showSep7Button?: boolean;
}

const TransactionResult = forwardRef<HTMLDivElement, TransactionResultProps>(({
  transactionXDR,
  isCopied = false,
  onCopy,
  telegramBotUrl,
  isTelegramUrlLoading = false,
  onTelegramOpen,
  className,
  title = "Generated Transaction",
  showTelegramButton = true,
  showCopyButton = true,
  showSep7Button = true,
}, ref) => {
  if (!transactionXDR) {
    return null;
  }

  const handleCopy = () => {
    if (onCopy) {
      onCopy(transactionXDR);
    }
  };

  const handleTelegramOpen = () => {
    if (telegramBotUrl) {
      window.open(telegramBotUrl, '_blank', 'noopener,noreferrer');
    } else if (onTelegramOpen) {
      onTelegramOpen();
    }
  };

  // Build SEP-0007 URI according to https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
  const buildSep7TransactionUri = (xdr: string, options: { msg?: string; return_url?: string } = {}) => {
    const params = new URLSearchParams();
    params.set('xdr', xdr);
    if (options.msg) params.set('msg', options.msg);
    if (options.return_url) params.set('return_url', options.return_url);
    
    return `web+stellar:tx?${params.toString()}`;
  };

  return (
    <Card ref={ref} className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* XDR Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Transaction XDR:
          </label>
          <div className="relative">
            <textarea
              readOnly
              value={transactionXDR}
              className="w-full min-h-[120px] p-3 bg-muted font-mono text-sm rounded-md border resize-none"
              placeholder="Transaction XDR will appear here..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {showCopyButton && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy XDR</span>
                </>
              )}
            </Button>
          )}

          {showSep7Button && (
            <Button
              type="button"
              variant="outline"
              asChild
              className="w-full flex items-center justify-center gap-2"
            >
              <a 
                href={buildSep7TransactionUri(transactionXDR, {
                  msg: "Please sign this transaction",
                  return_url: typeof window !== 'undefined' ? window.location.href : ''
                })}
                target="_blank"
                rel="noreferrer"
              >
                <span>SEP-0007</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}

          {showTelegramButton && (
            <Button
              type="button"
              variant="default"
              onClick={handleTelegramOpen}
              disabled={isTelegramUrlLoading}
              className="w-full flex items-center justify-center gap-2"
            >
              {telegramBotUrl ? (
                <>
                  <span>Open in MMWB</span>
                  <ExternalLink className="h-4 w-4" />
                </>
              ) : (
                <>
                  {isTelegramUrlLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign with MMWB</span>
                      <ExternalLink className="h-4 w-4" />
                    </>
                  )}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Next steps:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Copy the XDR above</li>
            <li>Sign it using your Stellar wallet or the MMWB Telegram bot</li>
            <li>Submit the signed transaction to the Stellar network</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
});

TransactionResult.displayName = "TransactionResult";

export { TransactionResult };
export default TransactionResult;
