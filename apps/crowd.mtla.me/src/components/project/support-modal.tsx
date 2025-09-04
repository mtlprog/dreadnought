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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface SupportModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onProjectUpdate?: () => void;
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

export function SupportModal({ project, open, onClose, onProjectUpdate }: Readonly<SupportModalProps>) {
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
      amount: "",
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
        form.setValue("userAccountId", savedAccountId, { shouldTouch: false, shouldValidate: true });
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
  const currentAmount = form.watch("amount");

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

  // Отслеживаем возврат пользователя на вкладку для перепроверки баланса
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Когда пользователь возвращается на вкладку и модалка открыта
      if (!document.hidden && open && currentAccountId !== "" && StrKey.isValidEd25519PublicKey(currentAccountId)) {
        console.log("User returned to tab, rechecking balance...");
        void checkUserBalance(currentAccountId);
      }
    };

    const handleWindowFocus = () => {
      // Когда окно получает фокус и модалка открыта
      if (open && currentAccountId !== "" && StrKey.isValidEd25519PublicKey(currentAccountId)) {
        console.log("Window focused, rechecking balance...");
        void checkUserBalance(currentAccountId);
      }
    };

    // Добавляем слушатели событий
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    // Убираем слушатели при размонтировании
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [open, currentAccountId, checkUserBalance]);

  // Автоматически устанавливаем сумму на основе баланса и оставшейся суммы для фандинга
  useEffect(() => {
    if (userBalance !== null && !isLoadingBalance && project !== null) {
      const balance = parseFloat(userBalance);
      const targetAmount = parseFloat(project.target_amount);
      const currentAmount = parseFloat(project.current_amount);
      const remainingAmount = Math.max(targetAmount - currentAmount, 0);

      if (balance === 0 || remainingAmount === 0) {
        form.setValue("amount", "0", { shouldTouch: false, shouldValidate: true });
      } else {
        // Устанавливаем максимально возможную сумму взноса
        const maxAllowedAmount = Math.min(balance, remainingAmount);
        form.setValue("amount", maxAllowedAmount.toString(), { shouldTouch: false, shouldValidate: true });
      }
    }
  }, [userBalance, isLoadingBalance, form, project]);

  // Автокоррекция суммы при вводе пользователем
  useEffect(() => {
    if (
      project !== null && userBalance !== null && currentAmount !== null && currentAmount !== undefined
      && currentAmount !== ""
    ) {
      const enteredAmount = parseFloat(currentAmount);
      const balance = parseFloat(userBalance);
      const targetAmount = parseFloat(project.target_amount);
      const currentProjectAmount = parseFloat(project.current_amount);
      const remainingAmount = Math.max(targetAmount - currentProjectAmount, 0);

      if (!isNaN(enteredAmount) && enteredAmount > 0) {
        const maxAllowedAmount = Math.min(balance, remainingAmount);

        // Если введенная сумма больше максимально допустимой, корректируем
        if (enteredAmount > maxAllowedAmount && maxAllowedAmount > 0) {
          form.setValue("amount", maxAllowedAmount.toString(), { shouldTouch: true, shouldValidate: true });
        }
      }
    }
  }, [currentAmount, userBalance, project, form]);

  if (project === null) return null;

  const progressPercentage = Math.min(
    (parseFloat(project.current_amount) / parseFloat(project.target_amount)) * 100,
    100,
  );

  // Function to truncate Stellar account ID for display
  const truncateAccountId = (accountId: string): string => {
    if (accountId.length < 8) return accountId;
    return `${accountId.substring(0, 2)}...${accountId.substring(accountId.length - 6)}`;
  };

  // Function to check if string is valid base64
  const isValidBase64 = (str: string): boolean => {
    try {
      // Check if string matches base64 pattern
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(str)) {
        return false;
      }
      
      // Try to decode and re-encode to verify
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  };

  // Function to decode base64 fulldescription with proper UTF-8 support
  const decodeFullDescription = (base64String: string): string => {
    try {
      // Check if the string is empty or undefined
      if (!base64String || base64String.trim() === "") {
        console.warn("Empty fulldescription provided");
        return "No detailed description available";
      }

      const trimmedString = base64String.trim();
      
      // Check if it's valid base64
      if (!isValidBase64(trimmedString)) {
        console.warn("fulldescription is not valid base64, treating as plain text");
        return trimmedString;
      }

      // Decode base64 to bytes, then properly decode UTF-8
      const binaryString = atob(trimmedString);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Use TextDecoder for proper UTF-8 decoding
      const decoder = new TextDecoder('utf-8');
      const decoded = decoder.decode(bytes);
      
      return decoded;
    } catch (error) {
      console.error("Failed to decode fulldescription:", error);
      console.error("Base64 string length:", base64String?.length);
      console.error("First 100 chars:", base64String?.substring(0, 100));
      
      // If decoding fails, return the original string as fallback
      return base64String || "Failed to decode project description";
    }
  };

  // Calculate remaining funding amount needed
  const targetAmount = parseFloat(project.target_amount);
  const currentProjectAmount = parseFloat(project.current_amount);
  const remainingAmount = Math.max(targetAmount - currentProjectAmount, 0);
  const isProjectCompleted = project.status === "completed";

  const handleGenerateTransaction = async (data: FundingFormData) => {
    if (project === null || project === undefined) return;

    // Проверяем достаточность баланса и оставшуюся сумму для фандинга
    const requiredAmount = parseFloat(data.amount);
    const availableBalance = userBalance !== null ? parseFloat(userBalance) : 0;

    if (availableBalance === 0) {
      setBalanceError("No MTLCrowd tokens available for funding");
      return;
    }

    if (remainingAmount === 0) {
      setBalanceError("Project is already fully funded");
      return;
    }

    if (availableBalance < requiredAmount) {
      setBalanceError(
        `Insufficient balance. Required: ${requiredAmount} MTLCrowd, Available: ${availableBalance} MTLCrowd`,
      );
      return;
    }

    if (requiredAmount > remainingAmount) {
      setBalanceError(
        `Amount exceeds funding needed. Required: ${requiredAmount} MTLCrowd, Needed: ${remainingAmount} MTLCrowd`,
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
        
        // Обновляем проекты после успешной генерации транзакции
        // (транзакция еще не подписана, но данные могли измениться)
        if (onProjectUpdate) {
          console.log("Transaction generated, updating projects...");
          onProjectUpdate();
        }
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
        <DialogHeader className="pr-12">
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
                  <div className="text-foreground mt-2 leading-relaxed prose prose-sm max-w-none prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        // Custom styling for markdown elements to match our design
                        h1: ({ children }) => <h1 className="text-lg font-bold text-primary uppercase mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold text-foreground uppercase mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold text-foreground uppercase mb-1">{children}</h3>,
                        p: ({ children }) => <p className="mb-2 text-foreground font-mono text-sm leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-foreground font-mono text-sm">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                        em: ({ children }) => <em className="italic text-accent">{children}</em>,
                        code: ({ children }) => <code className="bg-muted px-1 py-0.5 text-xs font-mono text-primary">{children}</code>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">{children}</blockquote>,
                        a: ({ href, children }) => <a href={href} className="text-primary hover:text-accent underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      }}
                    >
                      {decodeFullDescription(project.fulldescription)}
                    </ReactMarkdown>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">CONTACT ACCOUNT:</span>
                  <a
                    href={`https://bsn.expert/accounts/${project.contact_account_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-accent mt-1 block text-sm font-mono underline cursor-pointer transition-colors"
                    title={project.contact_account_id}
                  >
                    {truncateAccountId(project.contact_account_id)}
                  </a>
                </div>
                <div>
                  <span className="text-muted-foreground">PROJECT ACCOUNT:</span>
                  <a
                    href={`https://bsn.expert/accounts/${project.project_account_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-accent mt-1 block text-sm font-mono underline cursor-pointer transition-colors"
                    title={project.project_account_id}
                  >
                    {truncateAccountId(project.project_account_id)}
                  </a>
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
                  <div className="border-2 border-border bg-muted p-3 text-center">
                    <div className="text-xs font-mono text-muted-foreground mb-1">RAISED</div>
                    <div className="text-lg font-black text-primary leading-tight">
                      {parseInt(project.current_amount).toLocaleString()}
                    </div>
                  </div>
                  <div className="border-2 border-border bg-muted p-3 text-center">
                    <div className="text-xs font-mono text-muted-foreground mb-1">TARGET</div>
                    <div className="text-lg font-black text-foreground leading-tight">
                      {parseInt(project.target_amount).toLocaleString()}
                    </div>
                  </div>
                  <div className="border-2 border-border bg-muted p-3 text-center">
                    <div className="text-xs font-mono text-muted-foreground mb-1">SUPPORTERS</div>
                    <div className="text-lg font-black text-secondary leading-tight">
                      {project.supporters_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {isProjectCompleted
              ? (
                <div className="border-2 border-secondary bg-background p-6">
                  <h3 className="text-xl font-bold text-secondary uppercase mb-6">
                    PROJECT STATUS
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-4 h-4 bg-secondary" />
                      <span className="text-lg font-bold text-secondary uppercase">
                        FUNDING COMPLETED
                      </span>
                    </div>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FINAL AMOUNT:</span>
                        <span className="text-foreground">
                          {parseFloat(project.current_amount).toLocaleString()} MTLCrowd
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TARGET:</span>
                        <span className="text-foreground">
                          {parseFloat(project.target_amount).toLocaleString()} MTLCrowd
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SUCCESS RATE:</span>
                        <span className="text-secondary">{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TOTAL SUPPORTERS:</span>
                        <span className="text-foreground">{project.supporters_count}</span>
                      </div>
                    </div>
                    <div className="border-t-2 border-border pt-4 mt-4">
                      <p className="text-sm font-mono text-muted-foreground">
                        This project has reached its funding goal or deadline. No further contributions are accepted.
                      </p>
                    </div>
                  </div>
                </div>
              )
              : transactionXDR === null || transactionXDR === undefined || transactionXDR === ""
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

                      {/* BUY MTL CROWD Button when user has no tokens */}
                      {form.watch("userAccountId") !== ""
                          && form.watch("userAccountId") !== null
                          && form.watch("userAccountId") !== undefined
                          && StrKey.isValidEd25519PublicKey(form.watch("userAccountId"))
                          && !isLoadingBalance
                          && balanceError === null
                          && userBalance !== null
                          && parseFloat(userBalance) === 0 && (
                        <div className="border-2 border-accent bg-card p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-4 h-4 bg-accent" />
                            <span className="text-lg font-bold text-accent uppercase">
                              NO TOKENS AVAILABLE
                            </span>
                          </div>
                          <p className="text-sm font-mono text-muted-foreground mb-4">
                            You need MTL CROWD tokens to support projects. Purchase tokens to start funding initiatives.
                          </p>
                          <div className="space-y-3">
                            <Button
                              type="button"
                              variant="default"
                              size="lg"
                              className="w-full text-xl py-4"
                              onClick={() => window.open("https://eurmtl.me/asset/MTLCrowd", "_blank")}
                            >
                              BUY MTL CROWD
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full text-sm py-2"
                              onClick={() => void checkUserBalance(currentAccountId)}
                              disabled={isLoadingBalance}
                            >
                              {isLoadingBalance ? "CHECKING..." : "REFRESH BALANCE"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Show funding form only if user has tokens */}
                      {!(form.watch("userAccountId") !== ""
                          && form.watch("userAccountId") !== null
                          && form.watch("userAccountId") !== undefined
                          && StrKey.isValidEd25519PublicKey(form.watch("userAccountId"))
                          && !isLoadingBalance
                          && balanceError === null
                          && userBalance !== null
                          && parseFloat(userBalance) === 0) && (
                        <>
                          <div className="space-y-3">
                            <label className="block text-lg font-bold text-foreground uppercase">
                              Amount (MTLCrowd Tokens)
                            </label>
                            <Input
                              type="number"
                              {...form.register("amount")}
                              min="1"
                              max={userBalance !== null && remainingAmount > 0
                                ? Math.min(parseFloat(userBalance), remainingAmount).toString()
                                : undefined}
                              disabled={userBalance !== null && parseFloat(userBalance) === 0 || remainingAmount === 0}
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
                                          <p className="text-sm font-mono text-muted-foreground">
                                            NEEDED: {remainingAmount.toLocaleString()} MTLCROWD TOKENS
                                          </p>
                                          <p className="text-sm font-mono text-accent">
                                            MAX CONTRIBUTION:{" "}
                                            {Math.min(parseFloat(userBalance), remainingAmount).toLocaleString()}{" "}
                                            MTLCROWD TOKENS
                                          </p>
                                          {parseFloat(userBalance) === 0 && (
                                            <p className="text-sm font-mono text-red-500">
                                              NO MTLCROWD TOKENS AVAILABLE FOR FUNDING
                                            </p>
                                          )}
                                          {remainingAmount === 0 && (
                                            <p className="text-sm font-mono text-green-500">
                                              PROJECT FULLY FUNDED
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
                                <span className="text-foreground">{form.watch("amount") ?? "0"} MTLCrowd</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">PROJECT:</span>
                                <span className="text-foreground">{project.code}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">SERVICE FEE:</span>
                                <span className="text-foreground">5 XLM</span>
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
                              || remainingAmount === 0
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
                              : remainingAmount === 0
                              ? "PROJECT FULLY FUNDED"
                              : (userBalance !== null && parseFloat(userBalance) === 0)
                              ? "NO MTLCROWD TOKENS"
                              : (userBalance !== null && parseFloat(userBalance) < parseFloat(form.watch("amount") ?? "0"))
                              ? "INSUFFICIENT BALANCE"
                              : "FUND PROJECT"}
                          </Button>
                        </>
                      )}
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
