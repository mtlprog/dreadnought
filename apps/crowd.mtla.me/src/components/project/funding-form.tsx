import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StellarAccountInput } from "@/components/form/stellar-account-input";
import { BalanceDisplay } from "./balance-display";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useStellarBalance } from "@/hooks/use-stellar-balance";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { isValidStellarAccountId } from "@/lib/stellar-validation";
import type { Project } from "@/types/project";
import { z } from "zod";

interface FundingFormProps {
  project: Project;
  onSubmit: (data: { userAccountId: string; amount: string }) => Promise<void>;
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
  const [formData, setFormData] = useState<FundingFormData>({
    userAccountId: "",
    amount: "",
  });

  const [savedAccountId, setSavedAccountId] = useLocalStorage<string>("crowd_account_id", "");
  const { errors, validate, clearErrors } = useFormValidation(fundingFormSchema);
  const { balance, isLoading: isLoadingBalance, error: balanceError, checkBalance, clearBalance } = useStellarBalance();

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
      checkBalance(formData.userAccountId);
    } else {
      clearBalance();
    }
  }, [formData.userAccountId, savedAccountId, setSavedAccountId, checkBalance, clearBalance]);

  // Auto-set amount based on balance and remaining funding
  useEffect(() => {
    if (balance !== null && !isLoadingBalance) {
      const balanceValue = parseFloat(balance);
      const targetAmount = parseFloat(project.target_amount);
      const currentAmount = parseFloat(project.current_amount);
      const remainingAmount = Math.max(targetAmount - currentAmount, 0);

      if (balanceValue === 0 || remainingAmount === 0) {
        setFormData(prev => ({ ...prev, amount: "0" }));
      } else {
        const maxAllowedAmount = Math.min(balanceValue, remainingAmount);
        setFormData(prev => ({ ...prev, amount: maxAllowedAmount.toString() }));
      }
    }
  }, [balance, isLoadingBalance, project]);

  // Auto-correct amount when user types
  useEffect(() => {
    if (balance !== null && formData.amount !== "" && formData.amount !== "0") {
      const enteredAmount = parseFloat(formData.amount);
      const balanceValue = parseFloat(balance);
      const targetAmount = parseFloat(project.target_amount);
      const currentProjectAmount = parseFloat(project.current_amount);
      const remainingAmount = Math.max(targetAmount - currentProjectAmount, 0);

      if (!isNaN(enteredAmount) && enteredAmount > 0) {
        const maxAllowedAmount = Math.min(balanceValue, remainingAmount);
        if (enteredAmount > maxAllowedAmount && maxAllowedAmount > 0) {
          setFormData(prev => ({ ...prev, amount: maxAllowedAmount.toString() }));
        }
      }
    }
  }, [formData.amount, balance, project]);

  const handleInputChange = (field: keyof FundingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validate(formData);
    if (!validation.success) {
      return;
    }

    await onSubmit(formData);
  };

  const targetAmount = parseFloat(project.target_amount);
  const currentProjectAmount = parseFloat(project.current_amount);
  const remainingAmount = Math.max(targetAmount - currentProjectAmount, 0);
  const balanceValue = balance ? parseFloat(balance) : 0;
  const isProjectCompleted = project.status === "completed";

  if (isProjectCompleted) {
    return (
      <div className="border-2 border-secondary bg-background p-6">
        <h2 className="text-2xl font-bold text-secondary uppercase mb-6">
          PROJECT STATUS
        </h2>
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-secondary" />
            <span className="text-xl font-bold text-secondary uppercase">
              FUNDING COMPLETED
            </span>
          </div>
          <div className="space-y-3 text-base font-mono">
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
              <span className="text-secondary">
                {Math.round((currentProjectAmount / targetAmount) * 100)}%
              </span>
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
    );
  }

  return (
    <div className="border-2 border-primary bg-background p-6">
      <h2 className="text-2xl font-bold text-primary uppercase mb-6">
        SUPPORT PROJECT
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <StellarAccountInput
          name="userAccountId"
          label="Your Account ID"
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          required
          className="space-y-3"
          value={formData.userAccountId}
          onChange={(value) => handleInputChange("userAccountId", value)}
          error={errors.userAccountId}
        />

        {/* BUY MTL CROWD Button when user has no tokens */}
        {formData.userAccountId !== ""
          && isValidStellarAccountId(formData.userAccountId)
          && !isLoadingBalance
          && balanceError === null
          && balance !== null
          && balanceValue === 0 && (
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
                onClick={() => checkBalance(formData.userAccountId)}
                disabled={isLoadingBalance}
              >
                {isLoadingBalance ? "CHECKING..." : "REFRESH BALANCE"}
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
          && balanceValue === 0) && (
          <>
            <div className="space-y-3">
              <label className="block text-lg font-bold text-foreground uppercase">
                Amount (MTLCrowd Tokens)
              </label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                min="1"
                max={balance !== null && remainingAmount > 0
                  ? Math.min(balanceValue, remainingAmount).toString()
                  : undefined}
                disabled={balance !== null && balanceValue === 0 || remainingAmount === 0}
                className="text-xl text-center"
                placeholder="100"
              />

              <BalanceDisplay
                accountId={formData.userAccountId}
                balance={balance}
                isLoading={isLoadingBalance}
                error={balanceError}
                remainingAmount={remainingAmount}
                onRefresh={() => checkBalance(formData.userAccountId)}
              />

              {errors.amount && (
                <p className="text-sm text-red-500">
                  {errors.amount}
                </p>
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
                  <span className="text-foreground">{formData.amount || "0"} MTLCrowd</span>
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
              disabled={isSubmitting
                || isLoadingBalance
                || remainingAmount === 0
                || (balance !== null && balanceValue === 0)
                || (balance !== null && balanceValue < parseFloat(formData.amount || "0"))}
              className="w-full text-xl py-6"
              size="lg"
            >
              {isSubmitting
                ? "GENERATING..."
                : isLoadingBalance
                ? "CHECKING BALANCE..."
                : remainingAmount === 0
                ? "PROJECT FULLY FUNDED"
                : (balance !== null && balanceValue === 0)
                ? "NO MTLCROWD TOKENS"
                : (balance !== null && balanceValue < parseFloat(formData.amount || "0"))
                ? "INSUFFICIENT BALANCE"
                : "FUND PROJECT"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}