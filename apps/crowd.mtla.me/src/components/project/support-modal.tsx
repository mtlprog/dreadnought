"use client";

import { StellarAccountInput } from "@/components/form/stellar-account-input";
import { TransactionResult } from "@/components/form/transaction-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { addStellarUri } from "@/lib/stellar-uri-service";
import type { Project } from "@/types/project";
import { zodResolver } from "@hookform/resolvers/zod";
import { StrKey } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface SupportModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

// Form schema
const fundingFormSchema = z.object({
  userAccountId: z.string()
    .min(1, "Account ID is required")
    .refine((val) => StrKey.isValidEd25519PublicKey(val), {
      message: "Invalid Stellar account ID format",
    }),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 1;
    }, {
      message: "Amount must be at least 1 MTLCrowd token",
    }),
});

type FundingFormData = z.infer<typeof fundingFormSchema>;

export function SupportModal({ project, open, onClose }: Readonly<SupportModalProps>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [transactionXDR, setTransactionXDR] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isTelegramUrlLoading, setIsTelegramUrlLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // Используем localStorage для сохранения Account ID
  const [savedAccountId, setSavedAccountId] = useLocalStorage<string>("crowd_account_id", "");

  // Ref для отслеживания последнего проверенного аккаунта
  const lastCheckedAccountRef = useRef<string | null>(null);

  const form = useForm<FundingFormData>({
    resolver: zodResolver(fundingFormSchema),
    defaultValues: {
      userAccountId: "",
      amount: "100",
    },
  });

  // Автоматически заполняем поле Account ID из localStorage и сбрасываем состояние
  useEffect(() => {
    if (open) {
      // Сбрасываем состояние баланса при открытии модалки
      setUserBalance(null);
      setBalanceError(null);
      setIsLoadingBalance(false);
      lastCheckedAccountRef.current = null;

      if (savedAccountId !== "" && StrKey.isValidEd25519PublicKey(savedAccountId)) {
        form.setValue("userAccountId", savedAccountId, { shouldTouch: false });
      } else {
        // Сбрасываем сумму на дефолтную, если нет сохраненного аккаунта
        form.setValue("amount", "100", { shouldTouch: false });
      }
    }
  }, [open, savedAccountId, form]);

  // Функция для проверки баланса пользователя
  const checkUserBalance = useCallback(async (accountId: string) => {
    if (accountId === "" || !StrKey.isValidEd25519PublicKey(accountId)) {
      setUserBalance(null);
      setBalanceError(null);
      return;
    }

    setIsLoadingBalance(true);
    setBalanceError(null);

    try {
      const response = await fetch("/api/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      });

      const result = await response.json() as { success: boolean; balance?: string; error?: string };

      if (result.success && result.balance !== undefined) {
        setUserBalance(result.balance);
      } else {
        setBalanceError(result.error ?? "Failed to load balance");
        setUserBalance(null);
      }
    } catch (error) {
      console.error("Error checking balance:", error);
      setBalanceError("Failed to check balance");
      setUserBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  // Отслеживаем изменения Account ID для проверки баланса и сохранения в localStorage
  const currentAccountId = form.watch("userAccountId");

  useEffect(() => {
    if (currentAccountId !== "" && StrKey.isValidEd25519PublicKey(currentAccountId)) {
      // Сохраняем в localStorage только если изменился
      if (currentAccountId !== savedAccountId) {
        setSavedAccountId(currentAccountId);
      }

      // Проверяем баланс только если аккаунт изменился
      if (currentAccountId !== lastCheckedAccountRef.current && !isLoadingBalance) {
        lastCheckedAccountRef.current = currentAccountId;
        void checkUserBalance(currentAccountId);
      }
    } else {
      // Сбрасываем состояние баланса если Account ID невалидный
      setUserBalance(null);
      setBalanceError(null);
      lastCheckedAccountRef.current = null;
    }
  }, [currentAccountId, savedAccountId, setSavedAccountId, isLoadingBalance, checkUserBalance]);

  // Автоматически устанавливаем сумму на основе баланса
  useEffect(() => {
    if (userBalance !== null && !isLoadingBalance) {
      const balance = parseFloat(userBalance);
      if (balance === 0) {
        form.setValue("amount", "0", { shouldTouch: false });
      } else if (balance < 100) {
        form.setValue("amount", balance.toString(), { shouldTouch: false });
      } else {
        form.setValue("amount", "100", { shouldTouch: false });
      }
    }
  }, [userBalance, isLoadingBalance, form]);

  if (project === null) return null;

  const progressPercentage = Math.min(
    (parseFloat(project.current_amount) / parseFloat(project.target_amount)) * 100,
    100,
  );

  const handleGenerateTransaction = async (data: FundingFormData) => {
    if (project === null || project === undefined) return;

    // Проверяем достаточность баланса
    const requiredAmount = parseFloat(data.amount);
    const availableBalance = userBalance !== null ? parseFloat(userBalance) : 0;

    if (availableBalance === 0) {
      setBalanceError("No MTLCrowd tokens available for funding");
      return;
    }

    if (availableBalance < requiredAmount) {
      setBalanceError(
        `Insufficient balance. Required: ${requiredAmount} MTLCrowd, Available: ${availableBalance} MTLCrowd`,
      );
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
        }),
      });

      const result = await response.json() as { success: boolean; transactionXDR?: string; error?: string };

      if (
        result.success === true && result.transactionXDR !== undefined && result.transactionXDR !== null
        && result.transactionXDR !== ""
      ) {
        setTransactionXDR(result.transactionXDR);
      } else {
        console.error("Failed to generate transaction:", result.error ?? "Unknown error");
        // TODO: Show error to user
      }
    } catch (error) {
      console.error("Error generating transaction:", error);
      // TODO: Show error to user
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
    if (transactionXDR === null || transactionXDR === undefined || transactionXDR === "") return;

    setIsTelegramUrlLoading(true);
    try {
      // Создаем SEP-0007 URI
      const params = new globalThis.URLSearchParams();
      params.append("xdr", transactionXDR);
      params.append("msg", "Please sign this funding transaction");
      if (typeof window !== "undefined") {
        params.append("return_url", window.location.href);
      }

      const stellarUri = `web+stellar:tx?${params.toString()}`;

      // Отправляем URI на сервер и получаем ссылку на Telegram
      const telegramUrl = await addStellarUri(stellarUri);

      // Открываем ссылку в новой вкладке
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

  const handleModalClose = () => {
    setTransactionXDR(null);
    setIsCopied(false);
    setUserBalance(null);
    setBalanceError(null);
    setIsLoadingBalance(false);
    setIsTelegramUrlLoading(false);
    setTelegramError(null);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
          <DialogDescription>
            PROJECT CODE: {project.code} | DEADLINE: {new Date(project.deadline).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="border-2 border-border bg-card p-6">
              <h3 className="text-xl font-bold text-primary uppercase mb-4">
                PROJECT DETAILS
              </h3>
              <div className="space-y-4 text-base font-mono">
                <div>
                  <span className="text-muted-foreground">DESCRIPTION:</span>
                  <p className="text-foreground mt-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">CONTACT ACCOUNT:</span>
                  <p className="text-foreground mt-1 break-all text-sm">
                    {project.contact_account_id}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">PROJECT ACCOUNT:</span>
                  <p className="text-foreground mt-1 break-all text-sm">
                    {project.project_account_id}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-border bg-card p-6">
              <h3 className="text-xl font-bold text-primary uppercase mb-4">
                FUNDING STATUS
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-foreground">PROGRESS</span>
                    <span className="text-lg font-mono text-primary">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-6" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="border-2 border-border bg-muted p-4 text-center">
                    <div className="text-sm font-mono text-muted-foreground mb-1">RAISED</div>
                    <div className="text-2xl font-black text-primary">
                      {parseInt(project.current_amount).toLocaleString()}
                    </div>
                  </div>
                  <div className="border-2 border-border bg-muted p-4 text-center">
                    <div className="text-sm font-mono text-muted-foreground mb-1">TARGET</div>
                    <div className="text-2xl font-black text-foreground">
                      {parseInt(project.target_amount).toLocaleString()}
                    </div>
                  </div>
                  <div className="border-2 border-border bg-muted p-4 text-center">
                    <div className="text-sm font-mono text-muted-foreground mb-1">SUPPORTERS</div>
                    <div className="text-2xl font-black text-secondary">
                      {project.supporters_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {transactionXDR === null || transactionXDR === undefined || transactionXDR === ""
              ? (
                <div className="border-2 border-primary bg-background p-6">
                  <h3 className="text-xl font-bold text-primary uppercase mb-6">
                    SUPPORT PROJECT
                  </h3>

                  <Form {...form}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void form.handleSubmit(handleGenerateTransaction)(e);
                      }}
                      className="space-y-6"
                    >
                      <StellarAccountInput
                        name="userAccountId"
                        label="Your Account ID"
                        placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        required
                        className="space-y-3"
                      />

                      <div className="space-y-3">
                        <label className="block text-lg font-bold text-foreground uppercase">
                          Amount (MTLCrowd Tokens)
                        </label>
                        <Input
                          type="number"
                          {...form.register("amount")}
                          min="1"
                          max={userBalance !== null ? parseFloat(userBalance).toString() : undefined}
                          disabled={userBalance !== null && parseFloat(userBalance) === 0}
                          className="text-xl text-center"
                          placeholder="100"
                        />

                        {/* Balance info under amount field */}
                        <div className="space-y-2">
                          {form.watch("userAccountId") !== ""
                              && form.watch("userAccountId") !== null
                              && form.watch("userAccountId") !== undefined
                              && StrKey.isValidEd25519PublicKey(form.watch("userAccountId"))
                            ? (
                              <>
                                {isLoadingBalance
                                  ? (
                                    <p className="text-sm font-mono text-muted-foreground">
                                      CHECKING BALANCE...
                                    </p>
                                  )
                                  : balanceError !== null && balanceError !== undefined && balanceError !== ""
                                  ? (
                                    <p className="text-sm font-mono text-red-500">
                                      ERROR LOADING BALANCE
                                    </p>
                                  )
                                  : userBalance !== null
                                  ? (
                                    <>
                                      <p className="text-sm font-mono text-muted-foreground">
                                        AVAILABLE: {parseFloat(userBalance).toLocaleString()} MTLCROWD TOKENS
                                      </p>
                                      {parseFloat(userBalance) === 0 && (
                                        <p className="text-sm font-mono text-red-500">
                                          NO MTLCROWD TOKENS AVAILABLE FOR FUNDING
                                        </p>
                                      )}
                                    </>
                                  )
                                  : null}
                              </>
                            )
                            : (
                              <p className="text-sm font-mono text-muted-foreground">
                                MINIMUM SUPPORT: 1 MTLCROWD TOKEN
                              </p>
                            )}
                        </div>

                        {form.formState.errors.amount !== undefined && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.amount.message}
                          </p>
                        )}

                        {balanceError !== null && balanceError !== undefined && balanceError !== "" && (
                          <p className="text-xs text-red-500">{balanceError}</p>
                        )}
                      </div>

                      <div className="border-2 border-secondary bg-card p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-4 h-4 bg-secondary" />
                          <span className="text-lg font-bold text-secondary uppercase">
                            TRANSACTION PREVIEW
                          </span>
                        </div>
                        <div className="space-y-2 text-sm font-mono">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">AMOUNT:</span>
                            <span className="text-foreground">{form.watch("amount") ?? "0"} MTLCROWD</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">PROJECT:</span>
                            <span className="text-foreground">{project.code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">NETWORK FEE:</span>
                            <span className="text-foreground">~0.00001 XLM</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isGenerating
                          || !form.formState.isValid
                          || isLoadingBalance
                          || (userBalance !== null && parseFloat(userBalance) === 0)
                          || (userBalance !== null
                            && parseFloat(userBalance) < parseFloat(form.watch("amount") ?? "0"))}
                        className="w-full text-xl py-6"
                        size="lg"
                      >
                        {isGenerating === true
                          ? "GENERATING..."
                          : isLoadingBalance === true
                          ? "CHECKING BALANCE..."
                          : (userBalance !== null && parseFloat(userBalance) === 0)
                          ? "NO MTLCROWD TOKENS"
                          : (userBalance !== null && parseFloat(userBalance) < parseFloat(form.watch("amount") ?? "0"))
                          ? "INSUFFICIENT BALANCE"
                          : "FUND PROJECT"}
                      </Button>
                    </form>
                  </Form>

                  {isGenerating === true && (
                    <div className="border-2 border-accent bg-background p-4 mt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-4 h-4 bg-accent animate-pulse" />
                        <span className="text-lg font-bold text-accent uppercase">
                          PROCESSING TRANSACTION
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-accent animate-pulse" />
                          <span className="text-sm font-mono text-muted-foreground">
                            VALIDATING PARAMETERS...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-accent animate-pulse delay-100" />
                          <span className="text-sm font-mono text-muted-foreground">
                            BUILDING STELLAR TRANSACTION...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-accent animate-pulse delay-200" />
                          <span className="text-sm font-mono text-muted-foreground">
                            PREPARING FOR SIGNATURE...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
              : (
                <div className="space-y-4">
                  <TransactionResult
                    transactionXDR={transactionXDR}
                    title="Funding Transaction Generated"
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
                  {telegramError !== null && telegramError !== undefined && telegramError !== "" && (
                    <div className="border-2 border-red-500 bg-red-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-red-500" />
                        <span className="text-lg font-bold text-red-700 uppercase">
                          MMWB ERROR
                        </span>
                      </div>
                      <p className="text-sm text-red-600">{telegramError}</p>
                      <p className="text-xs text-red-500 mt-2">
                        Please use the SEP-0007 button to sign the transaction manually.
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleModalClose}>
            CLOSE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
