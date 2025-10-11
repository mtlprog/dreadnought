"use client";

import { Card } from "@/components/ui/card";
import { StellarAccount } from "@/components/ui/stellar-account";
import { StellarAsset } from "@/components/ui/stellar-asset";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FundAccountPortfolio, FundStructureData } from "@/lib/stellar/fund-structure-service";
import type { PriceDetails } from "@/lib/stellar/types";
import { formatNumber } from "@/lib/utils";
import React from "react";
import { FundSummaryMetrics } from "./fund-summary-metrics";

interface FundStructureTableProps {
  fundData: FundStructureData;
  isLoading?: boolean;
}

function formatPriceTooltip(details?: PriceDetails): React.ReactNode {
  if (details === null || details === undefined) {
    return (
      <div className="font-mono">
        <div className="text-warning-amber">НЕТ ДАННЫХ</div>
        <div className="text-xs text-steel-gray mt-1">Цена недоступна</div>
      </div>
    );
  }

  if (details.source === "path" && details.path !== null && details.path !== undefined) {
    return (
      <div className="font-mono space-y-2">
        <div className="text-electric-cyan uppercase text-xs font-bold border-b border-electric-cyan/30 pb-1">
          ПОИСК ПУТИ
        </div>
        <div className="space-y-2">
          {details.path.map((hop, index) => (
            <div key={index} className="text-xs pl-2 border-l-2 border-steel-gray/50 ml-1 space-y-1">
              <div className="font-semibold text-foreground">
                {hop.from} → {hop.to}
              </div>
              {hop.orderbook !== null && hop.orderbook !== undefined && (
                <div className="pl-2 space-y-1.5 text-[10px]">
                  {/* Best source indicator */}
                  {hop.orderbook.bestSource !== "none" && (
                    <div className="text-electric-cyan uppercase text-[9px] font-bold">
                      BEST: {hop.orderbook.bestSource.toUpperCase()}
                    </div>
                  )}

                  {/* Orderbook prices */}
                  {(hop.orderbook.orderbook.ask !== null || hop.orderbook.orderbook.bid !== null) && (
                    <div className="space-y-0.5">
                      <div className="text-steel-gray uppercase text-[9px] font-bold">ORDERBOOK:</div>
                      <div className="flex justify-between gap-3">
                        <span className={`uppercase font-bold ${hop.orderbook.bestSource === "orderbook" ? "text-cyber-green" : "text-steel-gray"}`}>
                          ASK:
                        </span>
                        <span className={`font-mono ${hop.orderbook.bestSource === "orderbook" ? "text-cyber-green" : "text-steel-gray"}`}>
                          {hop.orderbook.orderbook.ask !== null ? formatNumber(parseFloat(hop.orderbook.orderbook.ask), 7) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className={`uppercase font-bold ${hop.orderbook.bestSource === "orderbook" ? "text-warning-amber" : "text-steel-gray"}`}>
                          BID:
                        </span>
                        <span className={`font-mono ${hop.orderbook.bestSource === "orderbook" ? "text-warning-amber" : "text-steel-gray"}`}>
                          {hop.orderbook.orderbook.bid !== null ? formatNumber(parseFloat(hop.orderbook.orderbook.bid), 7) : "—"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* AMM prices */}
                  {(hop.orderbook.amm.ask !== null || hop.orderbook.amm.bid !== null) && (
                    <div className="space-y-0.5 pt-1">
                      <div className="text-steel-gray uppercase text-[9px] font-bold">AMM POOL:</div>
                      <div className="flex justify-between gap-3">
                        <span className={`uppercase font-bold ${hop.orderbook.bestSource === "amm" ? "text-cyber-green" : "text-steel-gray"}`}>
                          ASK:
                        </span>
                        <span className={`font-mono ${hop.orderbook.bestSource === "amm" ? "text-cyber-green" : "text-steel-gray"}`}>
                          {hop.orderbook.amm.ask !== null ? formatNumber(parseFloat(hop.orderbook.amm.ask), 7) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className={`uppercase font-bold ${hop.orderbook.bestSource === "amm" ? "text-warning-amber" : "text-steel-gray"}`}>
                          BID:
                        </span>
                        <span className={`font-mono ${hop.orderbook.bestSource === "amm" ? "text-warning-amber" : "text-steel-gray"}`}>
                          {hop.orderbook.amm.bid !== null ? formatNumber(parseFloat(hop.orderbook.amm.bid), 7) : "—"}
                        </span>
                      </div>
                      {hop.orderbook.amm.poolId !== null && hop.orderbook.amm.poolId !== undefined && (
                        <div className="text-steel-gray text-[9px] mt-0.5 truncate" title={hop.orderbook.amm.poolId}>
                          Pool: {hop.orderbook.amm.poolId.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  )}

                  {/* No data message */}
                  {hop.orderbook.bestSource === "none" && (
                    <div className="text-steel-gray italic">нет данных</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function AccountTypeIndicator({ type }: { type: "issuer" | "subfond" | "mutual" | "operational" | "other" }) {
  const colors = {
    issuer: "text-cyber-green",
    subfond: "text-electric-cyan",
    mutual: "text-purple-400",
    operational: "text-warning-amber",
    other: "text-steel-gray",
  };

  const labels = {
    issuer: "ЭМИТЕНТ",
    subfond: "САБФОНД",
    mutual: "МУТУАЛ",
    operational: "ОПЕРАЦ.",
    other: "ПРОЧЕЕ",
  };

  return (
    <span className={`text-xs font-mono uppercase tracking-wider ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function AccountSection({ account }: { account: FundAccountPortfolio }) {
  return (
    <div className="space-y-2">
      {/* Account Header */}
      <div className="bg-steel-gray/20 p-4 border-l-4 border-cyber-green">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-mono text-foreground uppercase tracking-wider">
                {account.name}
              </h3>
              <AccountTypeIndicator type={account.type} />
            </div>
            <p className="text-sm font-mono text-steel-gray mt-1">
              {account.description}
            </p>
            <StellarAccount accountId={account.id} className="mt-1" />
          </div>
          <div className="text-right">
            <div className="text-sm font-mono text-steel-gray uppercase">ИТОГО СЧЁТА</div>
            <div className="text-lg font-mono text-warning-amber">
              {formatNumber(account.totalEURMTL, 2)} EURMTL
            </div>
            <div className="text-sm font-mono text-steel-gray">
              {formatNumber(account.totalXLM, 7)} XLM
            </div>
          </div>
        </div>
      </div>

      {/* XLM Balance Row */}
      <div className="ml-4">
        <Table>
          <TableBody>
            <TableRow className="border-border">
              <TableCell className="w-32">
                <StellarAsset assetCode="XLM" />
              </TableCell>
              <TableCell className="font-mono text-foreground w-40">
                {formatNumber(parseFloat(account.xlmBalance), 7)}
              </TableCell>
              <TableCell className="text-right font-mono text-foreground w-32">
                {account.xlmPriceInEURMTL !== null && account.xlmPriceInEURMTL !== undefined
                  ? formatNumber(parseFloat(account.xlmPriceInEURMTL), 4)
                  : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-foreground w-32">1.0000000</TableCell>
              <TableCell className="text-right font-mono text-electric-cyan w-40">
                {account.xlmPriceInEURMTL !== null && account.xlmPriceInEURMTL !== undefined
                  ? formatNumber(parseFloat(account.xlmBalance) * parseFloat(account.xlmPriceInEURMTL), 2)
                  : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-electric-cyan w-40">
                {formatNumber(parseFloat(account.xlmBalance), 7)}
              </TableCell>
            </TableRow>

            {/* Token Rows */}
            {account.tokens.map((token, index) => (
              <TableRow key={index} className="border-steel-gray/30">
                <TableCell>
                  <StellarAsset
                    assetCode={token.asset.code}
                    assetIssuer={token.asset.issuer}
                  />
                </TableCell>
                <TableCell className="font-mono text-foreground">
                  {formatNumber(parseFloat(token.balance), token.asset.code === "EURMTL" ? 2 : 7)}
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline-offset-2 hover:underline">
                        {token.priceInEURMTL != null ? formatNumber(parseFloat(token.priceInEURMTL), 4) : "—"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {formatPriceTooltip(token.detailsEURMTL)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline-offset-2 hover:underline">
                        {token.priceInXLM != null ? formatNumber(parseFloat(token.priceInXLM), 7) : "—"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {formatPriceTooltip(token.detailsXLM)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right font-mono text-electric-cyan">
                  {token.valueInEURMTL != null ? formatNumber(parseFloat(token.valueInEURMTL), 2) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-electric-cyan">
                  {token.valueInXLM != null ? formatNumber(parseFloat(token.valueInXLM), 7) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function FundStructureTable({ fundData, isLoading = false }: FundStructureTableProps) {
  if (isLoading) {
    return (
      <Card className="p-8 border-0 bg-background text-white">
        <div className="text-center">
          <div className="text-2xl text-cyber-green mb-4">⏳ ЗАГРУЗКА СТРУКТУРЫ ФОНДА...</div>
          <div className="text-steel-gray">Получение данных по всем счетам...</div>
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Fund Summary Metrics */}
        <FundSummaryMetrics
          totalEURMTL={fundData.aggregatedTotals.totalEURMTL}
          totalXLM={fundData.aggregatedTotals.totalXLM}
          accountCount={fundData.aggregatedTotals.accountCount}
          tokenCount={fundData.aggregatedTotals.tokenCount}
          isLoading={isLoading}
        />

        <Card className="p-0 border-0 bg-card text-card-foreground overflow-hidden">
          <div className="bg-cyber-green text-background p-6">
            <h2 className="text-3xl font-mono uppercase tracking-wider">СТРУКТУРА ФОНДА MONTELIBERO</h2>
            <p className="text-lg font-mono mt-2">
              {fundData.aggregatedTotals.accountCount} СЧЕТОВ // {fundData.aggregatedTotals.tokenCount} ТОКЕНОВ
            </p>
          </div>

          <div className="p-6">
            {/* Sticky Table Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border mb-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-steel-gray">
                    <TableHead className="text-foreground font-mono uppercase tracking-wider w-32 bg-background">
                      ТОКЕН
                    </TableHead>
                    <TableHead className="text-foreground font-mono uppercase tracking-wider w-40 bg-background">
                      БАЛАНС
                    </TableHead>
                    <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-32 bg-background">
                      ЦЕНА (EURMTL)
                    </TableHead>
                    <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-32 bg-background">
                      ЦЕНА (XLM)
                    </TableHead>
                    <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-40 bg-background">
                      СТОИМОСТЬ (EURMTL)
                    </TableHead>
                    <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-40 bg-background">
                      СТОИМОСТЬ (XLM)
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>

            {/* Account Sections */}
            <div className="space-y-6">
              {fundData.accounts.map((account, index) => <AccountSection key={index} account={account} />)}
            </div>
          </div>

          {/* Aggregated Totals */}
          <div className="border-t-4 border-cyber-green bg-cyber-green/10 p-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-3xl font-mono uppercase tracking-wider text-cyber-green">
                  ОБЩИЙ ИТОГ ФОНДА
                </span>
                <div className="text-sm font-mono text-steel-gray mt-2">
                  {fundData.aggregatedTotals.accountCount} СЧЕТОВ • {fundData.aggregatedTotals.tokenCount} ТОКЕНОВ
                </div>
              </div>
              <div className="flex space-x-12">
                <div className="text-right">
                  <div className="text-sm font-mono text-steel-gray uppercase">ВСЕГО EURMTL</div>
                  <div className="text-4xl font-mono text-warning-amber">
                    {formatNumber(fundData.aggregatedTotals.totalEURMTL, 2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-steel-gray uppercase">ВСЕГО XLM</div>
                  <div className="text-4xl font-mono text-warning-amber">
                    {formatNumber(fundData.aggregatedTotals.totalXLM, 7)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Other Accounts Section (separate from main fund totals) */}
        {fundData.otherAccounts && fundData.otherAccounts.length > 0 && (
          <Card className="p-0 border-0 bg-card text-card-foreground overflow-hidden">
            <div className="bg-steel-gray/30 text-foreground p-6 border-l-4 border-steel-gray">
              <h2 className="text-2xl font-mono uppercase tracking-wider">ПРОЧИЕ СЧЕТА</h2>
              <p className="text-sm font-mono mt-2 text-steel-gray">
                Не входят в общий итог фонда
              </p>
            </div>

            <div className="p-6">
              {/* Sticky Table Header */}
              <div className="sticky top-0 z-10 bg-background border-b border-border mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-steel-gray">
                      <TableHead className="text-foreground font-mono uppercase tracking-wider w-32 bg-background">
                        ТОКЕН
                      </TableHead>
                      <TableHead className="text-foreground font-mono uppercase tracking-wider w-40 bg-background">
                        БАЛАНС
                      </TableHead>
                      <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-32 bg-background">
                        ЦЕНА (EURMTL)
                      </TableHead>
                      <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-32 bg-background">
                        ЦЕНА (XLM)
                      </TableHead>
                      <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-40 bg-background">
                        СТОИМОСТЬ (EURMTL)
                      </TableHead>
                      <TableHead className="text-foreground font-mono uppercase tracking-wider text-right w-40 bg-background">
                        СТОИМОСТЬ (XLM)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
              </div>

              {/* Other Account Sections */}
              <div className="space-y-6">
                {fundData.otherAccounts.map((account, index) => <AccountSection key={index} account={account} />)}
              </div>
            </div>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
