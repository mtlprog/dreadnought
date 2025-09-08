import { Button } from "@/components/ui/button";
import { isValidStellarAccountId } from "@/lib/stellar-validation";

interface BalanceDisplayProps {
  accountId: string;
  balance: string | null;
  isLoading: boolean;
  error: string | null;
  remainingAmount: number;
  onRefresh: () => void;
}

export function BalanceDisplay({
  accountId,
  balance,
  isLoading,
  error,
  remainingAmount,
  onRefresh,
}: BalanceDisplayProps) {
  const isValidAccount = accountId !== "" && isValidStellarAccountId(accountId);
  const balanceValue = balance ? parseFloat(balance) : 0;
  const maxContribution = Math.min(balanceValue, remainingAmount);

  if (!isValidAccount) {
    return (
      <p className="text-sm font-mono text-muted-foreground">
        MINIMUM SUPPORT: 1 MTLCROWD TOKEN
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className="text-sm font-mono text-muted-foreground">
        CHECKING BALANCE...
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-mono text-red-500">
          ERROR LOADING BALANCE
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="text-xs"
        >
          RETRY
        </Button>
      </div>
    );
  }

  if (balance === null) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-mono text-muted-foreground">
        AVAILABLE: {balanceValue.toLocaleString()} MTLCROWD TOKENS
      </p>
      <p className="text-sm font-mono text-muted-foreground">
        NEEDED: {remainingAmount.toLocaleString()} MTLCROWD TOKENS
      </p>
      <p className="text-sm font-mono text-accent">
        MAX CONTRIBUTION: {maxContribution.toLocaleString()} MTLCROWD TOKENS
      </p>

      {balanceValue === 0 && (
        <p className="text-sm font-mono text-red-500">
          NO MTLCROWD TOKENS AVAILABLE FOR FUNDING
        </p>
      )}

      {remainingAmount === 0 && (
        <p className="text-sm font-mono text-green-500">
          PROJECT FULLY FUNDED
        </p>
      )}
    </div>
  );
}
