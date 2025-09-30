import { StellarAccountInput } from "@/components/form/stellar-account-input";
import { useLocale } from "@/components/locale-client-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDualBalance } from "@/hooks/use-dual-balance";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { isValidStellarAccountId } from "@/lib/stellar-validation";
import type { Project } from "@/types/project";
import { HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { BalanceDisplay } from "./balance-display";

interface FundingFormProps {
  project: Project;
  onSubmit: (
    data: { userAccountId: string; amount: string; mtlCrowdAmount: string; eurMtlAmount: string },
  ) => Promise<void>;
  isSubmitting: boolean;
}

const fundingFormSchema = z.object({
  userAccountId: z.string()
    .min(1, "Account ID is required")
    .refine((val) => isValidStellarAccountId(val), {
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

export function FundingForm({ project, onSubmit, isSubmitting }: FundingFormProps) {
  const { t } = useLocale();
  const [formData, setFormData] = useState<FundingFormData>({
    userAccountId: "",
    amount: "",
  });

  const [savedAccountId, setSavedAccountId] = useLocalStorage<string>("crowd_account_id", "");
  const { errors, validate, clearErrors } = useFormValidation(fundingFormSchema);
  const { balance, isLoading: isLoadingBalance, error: balanceError, checkBalance, clearBalance } = useDualBalance();

  // Calculate MTLCrowd and EURMTL spending breakdown
  const calculateSpending = (totalAmount: string, mtlCrowdBalance: string, eurMtlBalance: string) => {
    const totalNum = Number(totalAmount);
    const mtlCrowdNum = Number(mtlCrowdBalance);
    const eurMtlNum = Number(eurMtlBalance);

    const total = Number.isNaN(totalNum) ? 0 : totalNum;
    const mtlCrowd = Number.isNaN(mtlCrowdNum) ? 0 : mtlCrowdNum;
    const eurMtl = Number.isNaN(eurMtlNum) ? 0 : eurMtlNum;

    if (total <= mtlCrowd && total > 0) {
      // Use only MTLCrowd
      return { mtlCrowdAmount: total.toString(), eurMtlAmount: "0" };
    } else if (total > 0) {
      // Use all MTLCrowd first, then EURMTL
      const remainingNeeded = total - mtlCrowd;
      const eurMtlToUse = Math.min(remainingNeeded, eurMtl);
      return {
        mtlCrowdAmount: mtlCrowd.toString(),
        eurMtlAmount: eurMtlToUse.toString(),
      };
    }

    // Default case for zero or invalid amounts
    return { mtlCrowdAmount: "0", eurMtlAmount: "0" };
  };

  // Auto-fill account ID from localStorage
  useEffect(() => {
    if (savedAccountId !== "" && isValidStellarAccountId(savedAccountId)) {
      setFormData(prev => ({ ...prev, userAccountId: savedAccountId }));
    }
  }, [savedAccountId]);

  // Check balance when account ID changes
  useEffect(() => {
    if (formData.userAccountId !== "" && isValidStellarAccountId(formData.userAccountId)) {
      if (formData.userAccountId !== savedAccountId) {
        setSavedAccountId(formData.userAccountId);
      }
      void checkBalance(formData.userAccountId);
    } else {
      clearBalance();
    }
  }, [formData.userAccountId, savedAccountId, setSavedAccountId, checkBalance, clearBalance]);

  // Auto-set amount based on MTLCrowd balance only (previous logic with hundreds)
  useEffect(() => {
    if (balance !== null && !isLoadingBalance) {
      const mtlCrowdBalance = Math.floor(parseFloat(balance.mtlCrowd));
      const targetAmount = parseFloat(project.target_amount);
      const currentAmount = parseFloat(project.current_amount);
      const remainingAmount = Math.max(targetAmount - currentAmount, 0);

      if (mtlCrowdBalance === 0 || remainingAmount === 0) {
        setFormData(prev => ({ ...prev, amount: "0" }));
      } else {
        // Use only MTLCrowd balance for auto-fill, не учитываем EURMTL
        const maxFromMtlCrowd = Math.floor(Math.min(mtlCrowdBalance, remainingAmount));
        setFormData(prev => ({ ...prev, amount: maxFromMtlCrowd.toString() }));
      }
    }
  }, [balance, isLoadingBalance, project]);

  // Auto-correct amount when user types - allow EURMTL usage but limit by total available
  useEffect(() => {
    if (balance !== null && formData.amount !== "" && formData.amount !== "0") {
      const enteredAmount = parseFloat(formData.amount);
      const mtlCrowdBalance = Math.floor(parseFloat(balance.mtlCrowd));
      const eurMtlBalance = Math.floor(parseFloat(balance.eurMtl));
      const totalAvailable = mtlCrowdBalance + eurMtlBalance;
      const targetAmount = parseFloat(project.target_amount);
      const currentProjectAmount = parseFloat(project.current_amount);
      const remainingAmount = Math.max(targetAmount - currentProjectAmount, 0);

      if (!isNaN(enteredAmount) && enteredAmount > 0) {
        // Позволяем пользователю ввести больше MTLCrowd (используя EURMTL),
        // но ограничиваем общим лимитом (MTLCrowd + EURMTL) и потребностями проекта
        const maxAllowedAmount = Math.floor(Math.min(totalAvailable, remainingAmount));
        if (enteredAmount > maxAllowedAmount && maxAllowedAmount > 0) {
          setFormData(prev => ({ ...prev, amount: Math.floor(maxAllowedAmount).toString() }));
        }
      }
    }
  }, [formData.amount, balance, project]);

  const handleInputChange = (field: keyof FundingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearErrors();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validate(formData);
    if (!validation.success) {
      return;
    }

    // Calculate spending breakdown
    const mtlCrowdBalance = balance !== null ? balance.mtlCrowd : "0";
    const eurMtlBalance = balance !== null ? balance.eurMtl : "0";
    const spending = calculateSpending(formData.amount, mtlCrowdBalance, eurMtlBalance);

    void onSubmit({
      ...formData,
      ...spending,
    });
  };

  const targetAmount = parseFloat(project.target_amount);
  const currentProjectAmount = parseFloat(project.current_amount);
  const remainingAmount = Math.max(targetAmount - currentProjectAmount, 0);
  const mtlCrowdBalanceValue = balance !== null ? Math.floor(parseFloat(balance.mtlCrowd)) : 0;
  const eurMtlBalanceValue = balance !== null ? Math.floor(parseFloat(balance.eurMtl)) : 0;
  const totalAvailable = mtlCrowdBalanceValue + eurMtlBalanceValue;
  const isProjectCompleted = project.status === "completed";

  // Calculate spending for current amount
  const currentSpending = balance !== null
    ? calculateSpending(formData.amount, balance.mtlCrowd, balance.eurMtl)
    : { mtlCrowdAmount: "0", eurMtlAmount: "0" };

  if (isProjectCompleted) {
    return (
      <div className="border-2 border-secondary bg-background p-6">
        <h2 className="text-2xl font-bold text-secondary uppercase mb-6">
          {t("project.status.title")}
        </h2>
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-secondary" />
            <span className="text-xl font-bold text-secondary uppercase">
              {t("project.status.completed")}
            </span>
          </div>
          <div className="space-y-3 text-base font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("project.status.finalAmount")}</span>
              <span className="text-foreground">
                {parseFloat(project.current_amount).toLocaleString()} MTLCrowd
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("project.status.target")}</span>
              <span className="text-foreground">
                {parseFloat(project.target_amount).toLocaleString()} MTLCrowd
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("project.status.successRate")}</span>
              <span className="text-secondary">
                {Math.round((currentProjectAmount / targetAmount) * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("project.status.totalSupporters")}</span>
              <span className="text-foreground">{project.supporters_count}</span>
            </div>
          </div>
          <div className="border-t-2 border-border pt-4 mt-4">
            <p className="text-sm font-mono text-muted-foreground">
              {t("project.status.completedMessage")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-primary bg-background p-6">
      <h2 className="text-2xl font-bold text-primary uppercase mb-6">
        {t("project.support.title")}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <StellarAccountInput
          name="userAccountId"
          label={t("project.support.accountIdLabel")}
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          required
          className="space-y-3"
          value={formData.userAccountId}
          onChange={(value) => handleInputChange("userAccountId", value)}
          error={errors["userAccountId"]}
          tooltip={t("project.support.tooltips.accountId")}
        />

        {/* BUY MTL CROWD Button when user has no MTLCrowd AND no EURMTL */}
        {formData.userAccountId !== ""
          && isValidStellarAccountId(formData.userAccountId)
          && !isLoadingBalance
          && balanceError === null
          && balance !== null
          && totalAvailable === 0 && (
          <div className="border-2 border-accent bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 bg-accent" />
              <span className="text-lg font-bold text-accent uppercase">
                {t("project.support.noTokens")}
              </span>
            </div>
            <p className="text-sm font-mono text-muted-foreground mb-4">
              {t("project.support.noTokensMessage")}
            </p>
            <div className="space-y-3">
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full text-xl py-4"
                onClick={() => window.open("https://eurmtl.me/asset/MTLCrowd", "_blank")}
              >
                {t("project.support.buyTokens")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-sm py-2"
                onClick={() => {
                  void checkBalance(formData.userAccountId);
                }}
                disabled={isLoadingBalance}
              >
                {isLoadingBalance ? t("common.loading") : t("project.support.refreshBalance")}
              </Button>
            </div>
          </div>
        )}

        {/* Show funding form only if user has tokens */}
        {!(formData.userAccountId !== ""
          && isValidStellarAccountId(formData.userAccountId)
          && !isLoadingBalance
          && balanceError === null
          && balance !== null
          && totalAvailable === 0) && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="block text-lg font-bold text-foreground uppercase">
                  {t("project.support.amountLabel")}
                </label>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
                      aria-label="Show help information"
                      tabIndex={0}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    className="max-w-xs font-mono text-xs border-primary"
                  >
                    <p>{t("project.support.tooltips.amount")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                min="1"
                max={balance !== null && remainingAmount > 0
                  ? Math.floor(Math.min(totalAvailable, remainingAmount)).toString()
                  : undefined}
                disabled={balance !== null && totalAvailable === 0 || remainingAmount === 0}
                className="text-xl text-center"
                placeholder="100"
              />

              <BalanceDisplay
                accountId={formData.userAccountId}
                balance={balance !== null ? balance.mtlCrowd : null}
                eurMtlBalance={balance !== null ? balance.eurMtl : null}
                isLoading={isLoadingBalance}
                error={balanceError}
                remainingAmount={remainingAmount}
                eurMtlSpend={currentSpending.eurMtlAmount !== "0" ? formData.amount : undefined}
                onRefresh={() => {
                  void checkBalance(formData.userAccountId);
                }}
              />

              {errors["amount"] !== undefined && (
                <p className="text-sm text-red-500">
                  {errors["amount"]}
                </p>
              )}
            </div>

            <div className="border-2 border-secondary bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 bg-secondary" />
                <span className="text-lg font-bold text-secondary uppercase">
                  {t("project.support.transactionPreview")}
                </span>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("project.support.amount")}:</span>
                  <span className="text-foreground">{formData.amount !== "" ? formData.amount : "0"} MTLCrowd</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("project.support.project")}:</span>
                  <span className="text-foreground">{project.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("project.support.serviceFee")}:</span>
                  <span className="text-foreground">0.5 XLM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("project.support.networkFee")}:</span>
                  <span className="text-foreground">~0.00001 XLM</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting
                || isLoadingBalance
                || remainingAmount === 0
                || (balance !== null && totalAvailable === 0)
                || (balance !== null && totalAvailable < parseFloat(formData.amount !== "" ? formData.amount : "0"))}
              className="w-full text-xl py-6"
              size="lg"
            >
              {isSubmitting
                ? t("funding.processing")
                : isLoadingBalance
                ? t("project.support.checkingBalance")
                : remainingAmount === 0
                ? t("project.support.fullyFunded")
                : (balance !== null && totalAvailable === 0)
                ? t("project.support.noMTLTokens")
                : (balance !== null && totalAvailable < parseFloat(formData.amount !== "" ? formData.amount : "0"))
                ? t("funding.insufficientBalance")
                : t("funding.fundButton")}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
