import { useMemo } from 'react';
import { Trade } from '@/lib/types';

interface TradeListProps {
  trades: Trade[];
}

export function TradeList({ trades }: TradeListProps) {
  const safeTrades = useMemo(() => trades || [], [trades]);

  if (safeTrades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-card/50 rounded-xl border border-border border-dashed">
        No trades found.
      </div>
    );
  }

  // TODO: Implement virtualization for large lists (>1000 items) to improve performance

  // Regular table for smaller lists
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-secondary/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Symbol
            </th>
            <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Side
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Value (BTC)
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Fee (BTC)
            </th>
          </tr>
        </thead>
        <tbody className="bg-card/50 divide-y divide-border">
          {safeTrades.map(trade => {
            // Convert cost from satoshis to BTC
            const valueBTC = Math.abs(trade.cost) / 100000000;
            const feeBTC = trade.fee.cost / 100000000;

            return (
              <tr key={trade.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {new Date(trade.datetime).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {trade.displaySymbol || trade.symbol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                        trade.side === 'buy'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : trade.side === 'sell'
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      {trade.side ? trade.side.toUpperCase() : 'UNKNOWN'}
                    </span>
                    {trade.executionCount && trade.executionCount > 1 && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {trade.executionCount} fills
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium font-mono">
                  $
                  {trade.price.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                  {trade.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                  {valueBTC.toFixed(8)}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    feeBTC < 0 ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {feeBTC >= 0 ? '' : '+'}
                  {Math.abs(feeBTC).toFixed(8)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
