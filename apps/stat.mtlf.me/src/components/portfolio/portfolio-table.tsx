"use client";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TokenPriceWithBalance } from "@/lib/stellar/price-service";
import type { PriceDetails } from "@/lib/stellar/types";
import React from "react";

interface PortfolioTableProps {
  accountId: string;
  tokens: readonly TokenPriceWithBalance[];
  xlmBalance: string;
  xlmPriceInEURMTL?: string | undefined;
  isLoading?: boolean;
}

function formatTokenName(code: string): string {
  if (code === "XLM") return "XLM";
  return `${code}`;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatPriceTooltip(details?: PriceDetails): React.ReactNode {
  if (details == null) {
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
        {details.bid != null && (
          <div className="text-xs">
            <span className="text-steel-gray">BID:</span> {parseFloat(details.bid).toFixed(7)}
          </div>
        )}
        {details.ask != null && (
          <div className="text-xs">
            <span className="text-steel-gray">ASK:</span> {parseFloat(details.ask).toFixed(7)}
          </div>
        )}
        {details.midPrice != null && (
          <div className="text-xs border-t border-steel-gray/30 pt-1 mt-1">
            <span className="text-steel-gray">СРЕДНЯЯ:</span> {parseFloat(details.midPrice).toFixed(7)}
          </div>
        )}
      </div>
    );
  }

  if (details.source === "path" && details.path != null) {
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
            {hop.bid != null && hop.ask != null && hop.midPrice != null
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
              : hop.price != null
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

export function PortfolioTable({
  accountId,
  tokens,
  xlmBalance,
  xlmPriceInEURMTL,
  isLoading = false,
}: PortfolioTableProps) {
  // Filter out tokens that have no price in both XLM and EURMTL (illiquid service tokens)
  const liquidTokens = tokens.filter(token => token.priceInXLM !== null || token.priceInEURMTL !== null);

  // Calculate totals using only liquid tokens
  const totalEURMTL = liquidTokens.reduce((sum, token) => {
    if (token.valueInEURMTL != null) {
      return sum + parseFloat(token.valueInEURMTL);
    }
    return sum;
  }, 0) + (xlmPriceInEURMTL != null ? parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL) : 0);

  const totalXLM = liquidTokens.reduce((sum, token) => {
    if (token.valueInXLM != null) {
      return sum + parseFloat(token.valueInXLM);
    }
    return sum;
  }, 0) + parseFloat(xlmBalance);

  if (isLoading) {
    return (
      <Card className="p-8 border-0 bg-black text-white">
        <div className="text-center">
          <div className="text-2xl text-cyber-green mb-4">⏳ ЗАГРУЗКА...</div>
          <div className="text-steel-gray">Получение данных портфеля...</div>
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <Card className="p-0 border-0 bg-black text-white overflow-hidden">
          <div className="bg-cyber-green text-black p-6">
            <h2 className="text-3xl font-mono uppercase tracking-wider">ПОРТФЕЛЬ</h2>
            <p className="text-lg font-mono mt-2">СЧЕТ: {formatAddress(accountId)}</p>
          </div>

          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="border-steel-gray hover:bg-steel-gray/20">
                  <TableHead className="text-white font-mono uppercase tracking-wider">ТОКЕН</TableHead>
                  <TableHead className="text-white font-mono uppercase tracking-wider">БАЛАНС</TableHead>
                  <TableHead className="text-white font-mono uppercase tracking-wider text-right">
                    ЦЕНА (EURMTL)
                  </TableHead>
                  <TableHead className="text-white font-mono uppercase tracking-wider text-right">ЦЕНА (XLM)</TableHead>
                  <TableHead className="text-white font-mono uppercase tracking-wider text-right">
                    СТОИМОСТЬ (EURMTL)
                  </TableHead>
                  <TableHead className="text-white font-mono uppercase tracking-wider text-right">
                    СТОИМОСТЬ (XLM)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* XLM Balance */}
                <TableRow className="border-steel-gray hover:bg-steel-gray/10">
                  <TableCell className="font-mono text-cyber-green">XLM</TableCell>
                  <TableCell className="font-mono text-white">{parseFloat(xlmBalance).toFixed(7)}</TableCell>
                  <TableCell className="text-right font-mono text-white">
                    {xlmPriceInEURMTL != null && xlmPriceInEURMTL !== ""
                      ? parseFloat(xlmPriceInEURMTL).toFixed(4)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-white">1.0000000</TableCell>
                  <TableCell className="text-right font-mono text-electric-cyan">
                    {xlmPriceInEURMTL != null && xlmPriceInEURMTL !== ""
                      ? (parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL)).toFixed(2)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-electric-cyan">
                    {parseFloat(xlmBalance).toFixed(7)}
                  </TableCell>
                </TableRow>

                {/* Other Tokens */}
                {liquidTokens.map((token, index) => (
                  <TableRow key={index} className="border-steel-gray hover:bg-steel-gray/10">
                    <TableCell className="font-mono text-cyber-green">
                      {formatTokenName(token.asset.code)}
                    </TableCell>
                    <TableCell className="font-mono text-white">
                      {parseFloat(token.balance).toFixed(token.asset.code === "EURMTL" ? 2 : 7)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-white">
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
                    <TableCell className="text-right font-mono text-white">
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

          <div className="border-t border-steel-gray bg-steel-gray/20 p-6">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-mono uppercase tracking-wider text-white">ИТОГО:</span>
              <div className="flex space-x-8">
                <div className="text-right">
                  <div className="text-sm font-mono text-steel-gray uppercase">EURMTL</div>
                  <div className="text-2xl font-mono text-warning-amber">
                    {totalEURMTL.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-steel-gray uppercase">XLM</div>
                  <div className="text-2xl font-mono text-warning-amber">
                    {totalXLM.toFixed(7)}
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
