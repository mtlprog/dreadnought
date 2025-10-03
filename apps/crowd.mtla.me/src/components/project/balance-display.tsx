import { useLocale } from "@/components/locale-client-provider";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
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
  const { t, locale } = useLocale();
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
          {t("project.support.mtlCrowdAvailable")}: {formatNumber(mtlCrowdBalance, locale)}{" "}
          {t("project.support.tokens")}
        </p>

        <p className="text-sm font-mono text-muted-foreground">
          {t("project.support.needed")}: {formatNumber(remainingAmount, locale)} {t("project.support.tokens")}
        </p>

        <p className="text-sm font-mono text-accent">
          {t("project.support.maxContribution")}: {formatNumber(maxFromMtlCrowd, locale)} {t("project.support.tokens")}
        </p>
      </div>

      {/* EURMTL AUTO-EXCHANGE SECTION */}
      {eurMtlBalanceValue > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-mono text-cyan-400 uppercase">
            {t("project.support.eurMtlAutoExchange")}: {formatNumber(eurMtlBalanceValue, locale)}{" "}
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
              {t("project.support.fromMtlCrowd")}: {formatNumber(Math.min(requestedAmount, mtlCrowdBalance), locale)}
              {" "}
              {t("project.support.tokens")}
            </p>
            {eurMtlToUse > 0 && (
              <p className="text-xs font-mono text-muted-foreground">
                {t("project.support.fromEurMtl")}: {formatNumber(eurMtlToUse, locale)} →{" "}
                {formatNumber(eurMtlToUse, locale)} {t("project.support.exchangedToMtlCrowd")}
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
