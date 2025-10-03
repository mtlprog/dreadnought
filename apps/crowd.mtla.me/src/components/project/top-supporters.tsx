"use client";

import { useLocale } from "@/components/locale-client-provider";
import { formatNumber, type Locale } from "@/lib/format";
import { truncateAccountId } from "@/lib/stellar-validation";
import type { SupporterContributionExact } from "@/lib/stellar/types";

interface TopSupportersProps {
  supporters: readonly SupporterContributionExact[];
}

export function TopSupporters({ supporters }: TopSupportersProps) {
  const { t, locale } = useLocale();

  if (supporters.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary uppercase mb-6">
          {t("project.topSupporters.title")}
        </h2>
        <div className="border-2 border-border bg-muted p-8 text-center">
          <p className="text-sm font-mono text-muted-foreground uppercase">
            {t("project.topSupporters.noSupporters")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary uppercase mb-6">
        {t("project.topSupporters.title")}
      </h2>

      <div className="border-2 border-border bg-background">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b-2 border-border bg-muted">
          <div className="col-span-1 text-xs font-mono text-muted-foreground uppercase">
            {t("project.topSupporters.place")}
          </div>
          <div className="col-span-7 text-xs font-mono text-muted-foreground uppercase">
            {t("project.topSupporters.account")}
          </div>
          <div className="col-span-4 text-xs font-mono text-muted-foreground uppercase text-right">
            {t("project.topSupporters.contribution")}
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y-2 divide-border">
          {supporters.map((supporter, index) => {
            const place = index + 1;
            const isTopThree = place <= 3;

            return (
              <div
                key={supporter.account_id}
                className={`grid grid-cols-12 gap-4 p-4 hover:bg-muted transition-colors ${
                  isTopThree ? "bg-primary/5" : ""
                }`}
              >
                {/* Place */}
                <div className="col-span-1">
                  <span
                    className={`text-sm font-black ${isTopThree ? "text-primary" : "text-foreground"}`}
                  >
                    {place}
                  </span>
                </div>

                {/* Account ID or Name */}
                <div className="col-span-7">
                  <a
                    href={`https://bsn.expert/accounts/${supporter.account_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-foreground hover:text-primary transition-colors underline"
                    title={supporter.account_id}
                  >
                    {supporter.name !== undefined ? supporter.name : truncateAccountId(supporter.account_id)}
                  </a>
                </div>

                {/* Contribution */}
                <div className="col-span-4 text-right">
                  <span className={`text-sm font-black ${isTopThree ? "text-primary" : "text-foreground"}`}>
                    {formatNumber(parseFloat(supporter.amount), locale as Locale)}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground ml-2">MTLCrowd</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
