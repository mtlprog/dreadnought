"use client";

import { TransactionResult } from "@/components/form/transaction-result";
import { useLocale } from "@/components/locale-client-provider";
import { addStellarUri } from "@/lib/stellar-uri-service";
import type { Project } from "@/types/project";
import { useState } from "react";
import { FundingForm } from "./funding-form";
import { ProjectInfo } from "./project-info";

interface ProjectPageProps {
  project: Project;
}

export function ProjectPage({ project }: ProjectPageProps) {
  const { t } = useLocale();
  const [transactionXDR, setTransactionXDR] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isTelegramUrlLoading, setIsTelegramUrlLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTransaction = async (
    data: { userAccountId: string; amount: string; mtlCrowdAmount: string; eurMtlAmount: string },
  ) => {
    const targetAmount = parseFloat(project.target_amount);
    const currentProjectAmount = parseFloat(project.current_amount);
    const remainingAmount = Math.max(targetAmount - currentProjectAmount, 0);
    const requiredAmount = parseFloat(data.amount);

    if (remainingAmount === 0) {
      return;
    }

    if (requiredAmount > remainingAmount) {
      return;
    }

    setIsGenerating(true);
    setTransactionXDR(null);
    setTelegramError(null);

    try {
      const response = await fetch("/api/funding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAccountId: data.userAccountId,
          projectCode: project.code,
          amount: data.amount,
          mtlCrowdAmount: data.mtlCrowdAmount,
          eurMtlAmount: data.eurMtlAmount,
        }),
      });

      const result = await response.json() as { success: boolean; transactionXDR?: string; error?: string };

      if (result.success === true && result.transactionXDR !== undefined) {
        setTransactionXDR(result.transactionXDR);
      }
    } catch (error) {
      console.error("Error generating transaction:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      if (typeof globalThis.navigator !== "undefined" && "clipboard" in globalThis.navigator) {
        await globalThis.navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleTelegramOpen = async () => {
    if (transactionXDR === null) return;

    setIsTelegramUrlLoading(true);
    try {
      const params = new globalThis.URLSearchParams();
      params.append("xdr", transactionXDR);
      params.append("msg", t("project.signTransaction"));
      if (typeof window !== "undefined") {
        params.append("return_url", window.location.href);
      }

      const stellarUri = `web+stellar:tx?${params.toString()}`;
      const telegramUrl = await addStellarUri(stellarUri);

      if (typeof window !== "undefined") {
        window.open(telegramUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Failed to open MMWB:", error);
      setTelegramError(error instanceof Error ? error.message : "Failed to open MMWB");
    } finally {
      setIsTelegramUrlLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-black text-foreground uppercase tracking-tighter mb-4">
              {project.name}
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-lg font-mono text-muted-foreground">
              <span>{t("project.projectCode")}: {project.code}</span>
              <span className="hidden sm:block">|</span>
              <span>{t("project.deadline")}: {new Date(project.deadline).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column - Project Details */}
            <ProjectInfo project={project} />

            {/* Right Column - Support Form */}
            <div className="space-y-6">
              {transactionXDR !== null
                ? (
                  <div className="space-y-4">
                    <TransactionResult
                      transactionXDR={transactionXDR}
                      title={t("project.transactionGenerated")}
                      isCopied={isCopied}
                      onCopy={(text) => void handleCopy(text)}
                      isTelegramUrlLoading={isTelegramUrlLoading}
                      onTelegramOpen={() => void handleTelegramOpen()}
                      showTelegramButton={true}
                      showCopyButton={true}
                      showSep7Button={true}
                      className="border-2 border-primary bg-background"
                    />

                    {/* Telegram Error Display */}
                    {telegramError !== null && (
                      <div className="border-2 border-red-500 bg-red-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 bg-red-500" />
                          <span className="text-lg font-bold text-red-700 uppercase">
                            {t("project.mmwbError")}
                          </span>
                        </div>
                        <p className="text-sm text-red-600">{telegramError}</p>
                        <p className="text-xs text-red-500 mt-2">
                          {t("project.useSep7Button")}
                        </p>
                      </div>
                    )}
                  </div>
                )
                : (
                  <FundingForm
                    project={project}
                    onSubmit={handleGenerateTransaction}
                    isSubmitting={isGenerating}
                  />
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
