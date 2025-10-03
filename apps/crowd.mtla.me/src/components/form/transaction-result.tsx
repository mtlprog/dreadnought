"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-client-provider";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import React, { forwardRef } from "react";

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
  title,
  showTelegramButton = true,
  showCopyButton = true,
  showSep7Button = true,
}, ref) => {
  const { t } = useLocale();

  if (transactionXDR === "" || transactionXDR === null || transactionXDR === undefined) {
    return null;
  }

  const handleCopy = () => {
    if (onCopy !== undefined) {
      onCopy(transactionXDR);
    }
  };

  const handleTelegramOpen = () => {
    if (telegramBotUrl !== null && telegramBotUrl !== undefined && telegramBotUrl !== "") {
      if (typeof window !== "undefined") {
        window.open(telegramBotUrl, "_blank", "noopener,noreferrer");
      }
    } else if (onTelegramOpen !== undefined) {
      onTelegramOpen();
    }
  };

  // Build SEP-0007 URI according to https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
  const buildSep7TransactionUri = (xdr: string, options: { msg?: string; return_url?: string } = {}) => {
    const params = new globalThis.URLSearchParams();
    params.set("xdr", xdr);
    if (options.msg !== undefined && options.msg !== null && options.msg !== "") params.set("msg", options.msg);
    if (options.return_url !== undefined && options.return_url !== null && options.return_url !== "") {
      params.set("return_url", options.return_url);
    }

    return `web+stellar:tx?${params.toString()}`;
  };

  return (
    <Card ref={ref} className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          {title ?? t("transactionResult.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* XDR Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t("transactionResult.xdrLabel")}
          </label>
          <div className="relative">
            <textarea
              readOnly
              value={transactionXDR}
              className="w-full min-h-[120px] p-3 bg-muted font-mono text-sm border resize-none"
              placeholder={t("transactionResult.xdrPlaceholder")}
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
              {isCopied
                ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{t("transactionResult.copied")}</span>
                  </>
                )
                : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>{t("transactionResult.copyButton")}</span>
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
                  msg: t("project.signTransaction"),
                  return_url: typeof window !== "undefined" ? window.location.href : "",
                })}
                target="_blank"
                rel="noreferrer"
              >
                <span>{t("transactionResult.sep7Button")}</span>
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
              {telegramBotUrl !== null && telegramBotUrl !== undefined && telegramBotUrl !== ""
                ? (
                  <>
                    <span>{t("transactionResult.mmwbOpen")}</span>
                    <ExternalLink className="h-4 w-4" />
                  </>
                )
                : (
                  <>
                    {isTelegramUrlLoading === true
                      ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t("transactionResult.loading")}</span>
                        </>
                      )
                      : (
                        <>
                          <span>{t("transactionResult.mmwbSign")}</span>
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
            <strong>{t("transactionResult.nextSteps")}</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>{t("transactionResult.step1")}</li>
            <li>{t("transactionResult.step2")}</li>
            <li>{t("transactionResult.step3")}</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
});

TransactionResult.displayName = "TransactionResult";

export { TransactionResult };
export default TransactionResult;
