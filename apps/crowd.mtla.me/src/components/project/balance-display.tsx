import { useLocale } from "@/components/locale-client-provider";
import { Button } from "@/components/ui/button";
import { isValidStellarAccountId } from "@/lib/stellar-validation";

interface BalanceDisplayProps {
  accountId: string;
  balance: string | null;
  eurMtlBalance?: string | null;
  isLoading: boolean;
  error: string | null;
  remainingAmount: number;
  eurMtlSpend?: string | undefined;
  onRefresh: () => void;
}

export function BalanceDisplay({
  accountId,
  balance,
  eurMtlBalance,
  isLoading,
  error,
  remainingAmount,
  eurMtlSpend,
  onRefresh,
}: BalanceDisplayProps) {
  const { t } = useLocale();
  const isValidAccount = accountId !== "" && isValidStellarAccountId(accountId);
  const mtlCrowdBalance = balance !== null ? Math.floor(parseFloat(balance)) : 0;
  const eurMtlBalanceValue = eurMtlBalance !== null && eurMtlBalance !== undefined
    ? Math.floor(parseFloat(eurMtlBalance))
    : 0;
  const maxFromMtlCrowd = Math.min(mtlCrowdBalance, remainingAmount);
  const requestedAmount = eurMtlSpend !== undefined ? Math.floor(parseFloat(eurMtlSpend)) : 0;
  const needsEurMtl = requestedAmount > mtlCrowdBalance;
  const eurMtlToUse = needsEurMtl ? Math.min(requestedAmount - mtlCrowdBalance, eurMtlBalanceValue) : 0;

  if (isValidAccount === false) {
    return (
      <p className="text-sm font-mono text-muted-foreground">
        {t("project.support.minimumSupport")}
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className="text-sm font-mono text-muted-foreground">
        {t("project.support.checkingBalance")}
      </p>
    );
  }

  if (error !== null) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-mono text-red-500">
          {t("common.error")} {t("common.loading").toLowerCase()}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="text-xs"
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (balance === null) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* ОСНОВНАЯ ИНФОРМАЦИЯ О БАЛАНСЕ */}
      <div className="space-y-2">
        <p className="text-sm font-mono text-muted-foreground">
          {t("project.support.mtlCrowdAvailable")}: {mtlCrowdBalance.toLocaleString()} {t("project.support.tokens")}
        </p>

        <p className="text-sm font-mono text-muted-foreground">
          {t("project.support.needed")}: {remainingAmount.toLocaleString()} {t("project.support.tokens")}
        </p>

        <p className="text-sm font-mono text-accent">
          {t("project.support.maxContribution")}: {maxFromMtlCrowd.toLocaleString()} {t("project.support.tokens")}
        </p>
      </div>

      {/* EURMTL AUTO-EXCHANGE SECTION */}
      {eurMtlBalanceValue > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-mono text-cyan-400 uppercase">
            {t("project.support.eurMtlAutoExchange")}: {eurMtlBalanceValue.toLocaleString()}{" "}
            {t("project.support.tokens")}
          </p>
        </div>
      )}

      {/* TRANSACTION BREAKDOWN */}
      {requestedAmount > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-mono text-cyan-400 uppercase">
            {t("project.support.transactionWillUse")}:
          </p>
          <div className="space-y-1 pl-2">
            <p className="text-xs font-mono text-muted-foreground">
              {t("project.support.fromMtlCrowd")}: {Math.min(requestedAmount, mtlCrowdBalance).toLocaleString()}{" "}
              {t("project.support.tokens")}
            </p>
            {eurMtlToUse > 0 && (
              <p className="text-xs font-mono text-muted-foreground">
                {t("project.support.fromEurMtl")}: {eurMtlToUse.toLocaleString()} → {eurMtlToUse.toLocaleString()}{" "}
                {t("project.support.exchangedToMtlCrowd")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ERROR STATES */}
      {mtlCrowdBalance === 0 && eurMtlBalanceValue === 0 && (
        <p className="text-sm font-mono text-red-500">
          {t("project.support.noTokensAvailable")}
        </p>
      )}

      {remainingAmount === 0 && (
        <p className="text-sm font-mono text-green-500">
          {t("project.support.fullyFunded")}
        </p>
      )}
    </div>
  );
}
