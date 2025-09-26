"use client";

import { Card } from "@/components/ui/card";
import { StellarAccount } from "@/components/ui/stellar-account";
import { StellarAsset } from "@/components/ui/stellar-asset";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FundAccountPortfolio, FundStructureData } from "@/lib/stellar/fund-structure-service";
import type { PriceDetails } from "@/lib/stellar/types";
import React from "react";

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

  if (details.source === "orderbook") {
    return (
      <div className="font-mono space-y-1">
        <div className="text-cyber-green uppercase text-xs">ПРЯМАЯ ТОРГОВЛЯ</div>
        {details.bid !== null && details.bid !== undefined && (
          <div className="text-xs">
            <span className="text-steel-gray">BID:</span> {parseFloat(details.bid).toFixed(7)}
          </div>
        )}
        {details.ask !== null && details.ask !== undefined && (
          <div className="text-xs">
            <span className="text-steel-gray">ASK:</span> {parseFloat(details.ask).toFixed(7)}
          </div>
        )}
        {details.midPrice !== null && details.midPrice !== undefined && (
          <div className="text-xs border-t border-steel-gray/30 pt-1 mt-1">
            <span className="text-steel-gray">СРЕДНЯЯ:</span> {parseFloat(details.midPrice).toFixed(7)}
          </div>
        )}
      </div>
    );
  }

  if (details.source === "path" && details.path !== null && details.path !== undefined) {
    return (
      <div className="font-mono space-y-1">
        <div className="text-electric-cyan uppercase text-xs">ПОИСК ПУТИ</div>
        <div className="text-xs">
          <span className="text-steel-gray">ПУТЬ:</span>
        </div>
        {details.path.map((hop, index) => (
          <div key={index} className="text-xs pl-2 space-y-1 border-l border-steel-gray/50 ml-1">
            <div className="font-semibold">
              {hop.from} → {hop.to}
            </div>
            {hop.bid !== null && hop.bid !== undefined && hop.ask !== null && hop.ask !== undefined
                && hop.midPrice !== null && hop.midPrice !== undefined
              ? (
                <div className="pl-2 space-y-1">
                  <div>
                    <span className="text-steel-gray">BID:</span> {parseFloat(hop.bid).toFixed(7)}
                  </div>
                  <div>
                    <span className="text-steel-gray">ASK:</span> {parseFloat(hop.ask).toFixed(7)}
                  </div>
                  <div className="border-t border-steel-gray/30 pt-1">
                    <span className="text-steel-gray">СРЕДНЯЯ:</span> {parseFloat(hop.midPrice).toFixed(7)}
                  </div>
                </div>
              )
              : hop.price !== null && hop.price !== undefined
              ? (
                <div className="pl-2">
                  <span className="text-steel-gray">ЦЕНА:</span> {parseFloat(hop.price).toFixed(7)}
                </div>
              )
              : (
                <div className="pl-2 text-warning-amber text-xs">
                  НЕТ ДАННЫХ
                </div>
              )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function AccountTypeIndicator({ type }: { type: "issuer" | "subfond" | "operational" }) {
  const colors = {
    issuer: "text-cyber-green",
    subfond: "text-electric-cyan",
    operational: "text-warning-amber",
  };

  const labels = {
    issuer: "ЭМИТЕНТ",
    subfond: "САБФОНД",
    operational: "ОПЕРАЦ.",
  };

  return (
    <span className={`text-xs font-mono uppercase tracking-wider ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function AccountSection({ account }: { account: FundAccountPortfolio }) {
  // Filter only liquid tokens
  const liquidTokens = account.tokens.filter(token => token.priceInXLM !== null || token.priceInEURMTL !== null);

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
              {account.totalEURMTL.toFixed(2)} EURMTL
            </div>
            <div className="text-sm font-mono text-steel-gray">
              {account.totalXLM.toFixed(7)} XLM
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
                {parseFloat(account.xlmBalance).toFixed(7)}
              </TableCell>
              <TableCell className="text-right font-mono text-foreground w-32">
                {account.xlmPriceInEURMTL !== null && account.xlmPriceInEURMTL !== undefined
                  ? parseFloat(account.xlmPriceInEURMTL).toFixed(4)
                  : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-foreground w-32">1.0000000</TableCell>
              <TableCell className="text-right font-mono text-electric-cyan w-40">
                {account.xlmPriceInEURMTL !== null && account.xlmPriceInEURMTL !== undefined
                  ? (parseFloat(account.xlmBalance) * parseFloat(account.xlmPriceInEURMTL)).toFixed(2)
                  : "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-electric-cyan w-40">
                {parseFloat(account.xlmBalance).toFixed(7)}
              </TableCell>
            </TableRow>

            {/* Token Rows */}
            {liquidTokens.map((token, index) => (
              <TableRow key={index} className="border-steel-gray/30">
                <TableCell>
                  <StellarAsset
                    assetCode={token.asset.code}
                    assetIssuer={token.asset.issuer}
                  />
                </TableCell>
                <TableCell className="font-mono text-foreground">
                  {parseFloat(token.balance).toFixed(token.asset.code === "EURMTL" ? 2 : 7)}
                </TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline-offset-2 hover:underline">
                        {token.priceInEURMTL != null ? parseFloat(token.priceInEURMTL).toFixed(4) : "—"}
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
                        {token.priceInXLM != null ? parseFloat(token.priceInXLM).toFixed(7) : "—"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {formatPriceTooltip(token.detailsXLM)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right font-mono text-electric-cyan">
                  {token.valueInEURMTL ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-electric-cyan">
                  {token.valueInXLM ?? "—"}
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
                    {fundData.aggregatedTotals.totalEURMTL.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-steel-gray uppercase">ВСЕГО XLM</div>
                  <div className="text-4xl font-mono text-warning-amber">
                    {fundData.aggregatedTotals.totalXLM.toFixed(7)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
