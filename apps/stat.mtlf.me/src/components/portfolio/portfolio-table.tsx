"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { TokenPriceWithBalance } from "@/lib/stellar/price-service";

interface PortfolioTableProps {
  accountId: string;
  tokens: readonly TokenPriceWithBalance[];
  xlmBalance: string;
  xlmPriceInEURMTL?: string | undefined;
  isLoading?: boolean;
}

function formatTokenName(code: string, _issuer: string): string {
  if (code === "XLM") return "XLM";
  return `${code}`;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PortfolioTable({
  accountId,
  tokens,
  xlmBalance,
  xlmPriceInEURMTL,
  isLoading = false,
}: PortfolioTableProps) {
  // Calculate totals
  const totalEURMTL = tokens.reduce((sum, token) => {
    if (token.valueInEURMTL) {
      return sum + parseFloat(token.valueInEURMTL);
    }
    return sum;
  }, 0) + (xlmPriceInEURMTL ? parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL) : 0);

  const totalXLM = tokens.reduce((sum, token) => {
    if (token.valueInXLM) {
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
                <TableHead className="text-white font-mono uppercase tracking-wider text-right">ЦЕНА (EURMTL)</TableHead>
                <TableHead className="text-white font-mono uppercase tracking-wider text-right">ЦЕНА (XLM)</TableHead>
                <TableHead className="text-white font-mono uppercase tracking-wider text-right">СТОИМОСТЬ (EURMTL)</TableHead>
                <TableHead className="text-white font-mono uppercase tracking-wider text-right">СТОИМОСТЬ (XLM)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* XLM Balance */}
              <TableRow className="border-steel-gray hover:bg-steel-gray/10">
                <TableCell className="font-mono text-cyber-green">XLM</TableCell>
                <TableCell className="font-mono text-white">{parseFloat(xlmBalance).toFixed(7)}</TableCell>
                <TableCell className="text-right font-mono text-white">
                  {xlmPriceInEURMTL ? parseFloat(xlmPriceInEURMTL).toFixed(4) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-white">1.0000000</TableCell>
                <TableCell className="text-right font-mono text-electric-cyan">
                  {xlmPriceInEURMTL
                    ? (parseFloat(xlmBalance) * parseFloat(xlmPriceInEURMTL)).toFixed(2)
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-electric-cyan">
                  {parseFloat(xlmBalance).toFixed(7)}
                </TableCell>
              </TableRow>

              {/* Other Tokens */}
              {tokens.map((token, index) => (
                <TableRow key={index} className="border-steel-gray hover:bg-steel-gray/10">
                  <TableCell className="font-mono text-cyber-green">
                    {formatTokenName(token.asset.code, token.asset.issuer)}
                  </TableCell>
                  <TableCell className="font-mono text-white">
                    {parseFloat(token.balance).toFixed(token.asset.code === 'EURMTL' ? 2 : 7)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-white">
                    {token.priceInEURMTL ? parseFloat(token.priceInEURMTL).toFixed(4) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-white">
                    {token.priceInXLM ? parseFloat(token.priceInXLM).toFixed(7) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-electric-cyan">
                    {token.valueInEURMTL || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-electric-cyan">
                    {token.valueInXLM || "—"}
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
  );
}