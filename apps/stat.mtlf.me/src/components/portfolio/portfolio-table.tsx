"use client";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TokenPriceWithBalance } from "@/lib/stellar/price-service";
import type { PriceDetails } from "@/lib/stellar/types";
import { formatNumber } from "@/lib/utils";
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

  if (details.source === "path" && details.path != null) {
    return (
      <div className="font-mono space-y-1">
        <div className="text-electric-cyan uppercase text-xs">ПОИСК ПУТИ</div>
        <div className="text-xs">
          <span className="text-steel-gray">ПУТЬ:</span>
        </div>
        {details.path.map((hop, index) => (
          <div key={index} className="text-xs pl-2 border-l border-steel-gray/50 ml-1">
            <div className="font-semibold">
              {hop.from} → {hop.to}
            </div>
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
                  <TableCell className="font-mono text-white">{formatNumber(parseFloat(xlmBalance), 7)}</TableCell>
                  <TableCell className="text-right font-mono text-white">
                    {xlmPriceInEURMTL != null && xlmPriceInEURMTL !== ""
                      ? formatNumber(parseFloat(xlmPriceInEURMTL), 4)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-white">1.0000000</TableCell>
                  <TableCell className="text-right font-mono text-electric-cyan">
                    {xlmPriceInEURMTL != null && xlmPriceInEURMTL !== ""
                      ? formatNumber(parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL), 2)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-electric-cyan">
                    {formatNumber(parseFloat(xlmBalance), 7)}
                  </TableCell>
                </TableRow>

                {/* Other Tokens */}
                {liquidTokens.map((token, index) => (
                  <TableRow key={index} className="border-steel-gray hover:bg-steel-gray/10">
                    <TableCell className="font-mono text-cyber-green">
                      {formatTokenName(token.asset.code)}
                    </TableCell>
                    <TableCell className="font-mono text-white">
                      {formatNumber(parseFloat(token.balance), token.asset.code === "EURMTL" ? 2 : 7)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-white">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`cursor-help underline-offset-2 hover:underline ${
                            token.isNFT
                              ? "text-purple-400"
                              : token.nftValuationAccount != null
                                ? "text-electric-cyan"
                                : ""
                          }`}>
                            {token.priceInEURMTL != null ? formatNumber(parseFloat(token.priceInEURMTL), 4) : "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {token.isNFT ? (
                            <div className="font-mono space-y-2">
                              <div className="text-purple-400 uppercase text-xs font-bold border-b border-purple-400/30 pb-1">
                                ОЦЕНКА NFT
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Источник:</div>
                                <div className="text-electric-cyan font-mono text-[9px] break-all">
                                  {token.nftValuationAccount}
                                </div>
                              </div>
                            </div>
                          ) : token.nftValuationAccount != null ? (
                            <div className="font-mono space-y-2">
                              <div className="text-electric-cyan uppercase text-xs font-bold border-b border-electric-cyan/30 pb-1">
                                ЦЕНА ИЗ DATA ENTRY
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Источник:</div>
                                <div className="text-electric-cyan font-mono text-[9px] break-all">
                                  {token.nftValuationAccount}
                                </div>
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Тип оценки:</div>
                                <div className="text-foreground">{token.asset.code}_1COST</div>
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Цена за единицу:</div>
                                <div className="text-cyber-green">{token.priceInEURMTL != null ? formatNumber(parseFloat(token.priceInEURMTL), 7) : "—"} EURMTL</div>
                              </div>
                            </div>
                          ) : (
                            formatPriceTooltip(token.detailsEURMTL)
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right font-mono text-white">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`cursor-help underline-offset-2 hover:underline ${
                            token.isNFT
                              ? "text-purple-400"
                              : token.nftValuationAccount != null
                                ? "text-electric-cyan"
                                : ""
                          }`}>
                            {token.priceInXLM != null ? formatNumber(parseFloat(token.priceInXLM), 7) : "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {token.isNFT ? (
                            <div className="font-mono space-y-2">
                              <div className="text-purple-400 uppercase text-xs font-bold border-b border-purple-400/30 pb-1">
                                ОЦЕНКА NFT
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Источник:</div>
                                <div className="text-electric-cyan font-mono text-[9px] break-all">
                                  {token.nftValuationAccount}
                                </div>
                              </div>
                            </div>
                          ) : token.nftValuationAccount != null ? (
                            <div className="font-mono space-y-2">
                              <div className="text-electric-cyan uppercase text-xs font-bold border-b border-electric-cyan/30 pb-1">
                                ЦЕНА ИЗ DATA ENTRY
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Источник:</div>
                                <div className="text-electric-cyan font-mono text-[9px] break-all">
                                  {token.nftValuationAccount}
                                </div>
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Тип оценки:</div>
                                <div className="text-foreground">{token.asset.code}_1COST</div>
                              </div>
                              <div className="text-[10px] space-y-0.5">
                                <div className="text-steel-gray">Цена за единицу:</div>
                                <div className="text-cyber-green">{token.priceInXLM != null ? formatNumber(parseFloat(token.priceInXLM), 7) : "—"} XLM</div>
                              </div>
                            </div>
                          ) : (
                            formatPriceTooltip(token.detailsXLM)
                          )}
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

          <div className="border-t border-steel-gray bg-steel-gray/20 p-6">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-mono uppercase tracking-wider text-white">ИТОГО:</span>
              <div className="flex space-x-8">
                <div className="text-right">
                  <div className="text-sm font-mono text-steel-gray uppercase">EURMTL</div>
                  <div className="text-2xl font-mono text-warning-amber">
                    {formatNumber(totalEURMTL, 2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-steel-gray uppercase">XLM</div>
                  <div className="text-2xl font-mono text-warning-amber">
                    {formatNumber(totalXLM, 7)}
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
