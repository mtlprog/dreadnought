"use client";

import { useState } from "react";
import { Button } from "@dreadnought/ui";
import { Copy, ExternalLink, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isFreighterInstalled, connectFreighter } from "@/lib/stellar/freighter";
import { toast } from "sonner";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [step, setStep] = useState<"connect" | "sign">("connect");
  const [publicKey, setPublicKey] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { startAuth, getStellarUri, sendToMMWB, challengeXDR, isLoading } = useAuth();

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!isFreighterInstalled()) {
      toast.error("Please install Freighter wallet extension");
      window.open("https://www.freighter.app/", "_blank");
      return;
    }

    const key = await connectFreighter();
    if (key) {
      setPublicKey(key);
      const xdr = await startAuth(key);
      if (xdr) {
        setStep("sign");
      }
    }
  };

  const handleManualInput = async () => {
    const key = prompt("Enter your Stellar public key (G...):");
    if (key && key.startsWith("G") && key.length === 56) {
      setPublicKey(key);
      const xdr = await startAuth(key);
      if (xdr) {
        setStep("sign");
      }
    } else {
      toast.error("Invalid public key format");
    }
  };

  const handleCopy = () => {
    if (challengeXDR) {
      navigator.clipboard.writeText(challengeXDR);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("XDR copied to clipboard");
    }
  };

  const handleMMWB = async () => {
    if (challengeXDR) {
      const stellarUri = getStellarUri(challengeXDR);
      await sendToMMWB(stellarUri);
    }
  };

  const sep7Link = challengeXDR ? getStellarUri(challengeXDR) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-background border-4 border-primary max-w-2xl w-full mx-4 p-8">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-black uppercase">
            {step === "connect" ? "CONNECT WALLET" : "SIGN TRANSACTION"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ×
          </Button>
        </div>

        {step === "connect" ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground font-mono">
              Connect your Stellar wallet to track progress and earn achievements
            </p>

            <div className="space-y-4">
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full uppercase"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    CONNECTING...
                  </>
                ) : (
                  "CONNECT WITH FREIGHTER"
                )}
              </Button>

              <Button
                onClick={handleManualInput}
                disabled={isLoading}
                variant="outline"
                className="w-full uppercase"
                size="lg"
              >
                ENTER PUBLIC KEY MANUALLY
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-2 border-primary bg-primary/10 p-4">
              <p className="text-sm font-bold text-foreground uppercase mb-2">
                IMPORTANT
              </p>
              <p className="text-sm text-foreground">
                Sign the transaction using one of the methods below. After signing, you will be automatically logged in.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground uppercase">
                Transaction XDR
              </label>
              <textarea
                readOnly
                value={challengeXDR || ""}
                className="w-full min-h-[120px] p-3 bg-muted font-mono text-sm border-2 border-border resize-none"
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>COPY XDR</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleMMWB}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>LOADING...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN WITH TELEGRAM BOT</span>
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>

              {sep7Link && (
                <Button
                  variant="outline"
                  asChild
                  className="w-full flex items-center justify-center gap-2"
                >
                  <a href={sep7Link} target="_blank" rel="noreferrer">
                    <span>SIGN WITH SEP-0007</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              After signing, return to this page and you will be logged in automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
