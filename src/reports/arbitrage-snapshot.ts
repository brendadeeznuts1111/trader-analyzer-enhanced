// src/reports/arbitrage-snapshot.ts
import { getBunRuntimeInfo } from "@/lib/bun-utils-enhanced";
import { formatMoney } from "../../utils/formatters";

interface Opportunity {
  pair: string;
  spread: number;
  exchangeA: string;
  exchangeB: string;
}

// Runtime-aware string width calculation using official Bun.string.width
function getStringWidth(text: string): number {
  const runtimeInfo = getBunRuntimeInfo();
  
  if (runtimeInfo.isBun && typeof (Bun as any).string?.width === 'function') {
    // Use Bun's official string.width API
    return (Bun as any).string.width(text);
  } else if (runtimeInfo.isBun && typeof (Bun as any).stringWidth === 'function') {
    // Fallback to older Bun API
    return (Bun as any).stringWidth(text);
  } else {
    // Fallback for non-Bun environments
    return text.length + (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g)?.length || 0);
  }
}

// Conceptual utility: Truncate string to display width
function stringTruncate(text: string, maxWidth: number, ellipsis = '...'): string {
  const currentWidth = getStringWidth(text);
  if (currentWidth <= maxWidth) return text;
  
  const ellipsisWidth = getStringWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;
  
  if (targetWidth <= 0) return ellipsis.slice(0, maxWidth);
  
  let truncated = text;
  while (getStringWidth(truncated) > targetWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  
  return truncated + ellipsis;
}

// Conceptual utility: Pad string to target display width
function stringPadEnd(text: string, targetWidth: number, padChar = ' '): string {
  const currentWidth = getStringWidth(text);
  if (currentWidth >= targetWidth) return text;
  
  const padWidth = targetWidth - currentWidth;
  const pad = padChar.repeat(Math.ceil(padWidth / padChar.length));
  return text + pad.slice(0, padWidth);
}

function stringPadStart(text: string, targetWidth: number, padChar = ' '): string {
  const currentWidth = getStringWidth(text);
  if (currentWidth >= targetWidth) return text;
  
  const padWidth = targetWidth - currentWidth;
  const pad = padChar.repeat(Math.ceil(padWidth / padChar.length));
  return pad.slice(0, padWidth) + text;
}

// Conceptual utility: Strip ANSI escape codes
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

// Enhanced padding functions
function padEnd(text: string, width: number, fillString?: string): string {
  return stringPadEnd(text, width, fillString);
}

function padStart(text: string, width: number, fillString?: string): string {
  return stringPadStart(text, width, fillString);
}

function generateCustomSnapshot(opportunities: Opportunity[]): string {
  const runtimeInfo = getBunRuntimeInfo();
  const startTime = performance.now();
  
  let report = "Arbitrage Opportunity Snapshot\n";
  report += "---------------------------------\n\n";

  // Calculate dynamic column widths
  const maxPairWidth = Math.max(
    getStringWidth("Pair"),
    ...opportunities.map(op => getStringWidth(op.pair))
  );
  const maxSpreadWidth = Math.max(
    getStringWidth("Spread"),
    ...opportunities.map(op => getStringWidth(formatMoney(op.spread)))
  );
  const maxExchangeAWidth = Math.max(
    getStringWidth("Exchange A"),
    ...opportunities.map(op => getStringWidth(op.exchangeA))
  );
  const maxExchangeBWidth = Math.max(
    getStringWidth("Exchange B"),
    ...opportunities.map(op => getStringWidth(op.exchangeB))
  );

  // Build header
  const headerParts = [
    padEnd("Pair", maxPairWidth),
    padStart("Spread", maxSpreadWidth),
    padEnd("Exchange A", maxExchangeAWidth),
    padEnd("Exchange B", maxExchangeBWidth)
  ];
  const header = ` ${headerParts.join(" | ")} `;
  report += header + "\n";
  
  // Build separator
  const separatorParts = [
    padEnd("", maxPairWidth, "-"),
    padEnd("", maxSpreadWidth, "-"),
    padEnd("", maxExchangeAWidth, "-"),
    padEnd("", maxExchangeBWidth, "-")
  ];
  const separator = ` ${separatorParts.join(" | ")} `;
  report += separator + "\n";

  // Build data rows
  for (const op of opportunities) {
    const rowParts = [
      padEnd(op.pair, maxPairWidth),
      padStart(formatMoney(op.spread), maxSpreadWidth),
      padEnd(op.exchangeA, maxExchangeAWidth),
      padEnd(op.exchangeB, maxExchangeBWidth)
    ];
    report += ` ${rowParts.join(" | ")}\n`;
  }

  const generationTime = performance.now() - startTime;
  
  // Add runtime information footer
  report += "\n---------------------------------\n";
  report += `Generated in ${generationTime.toFixed(2)}ms using `;
  report += runtimeInfo.isBun ? `Bun ${runtimeInfo.version} (optimized)` : 'standard JavaScript';
  
  // Show which string width API is being used
  if (runtimeInfo.isBun && typeof (Bun as any).string?.width === 'function') {
    report += `\nString width calculation: Bun.string.width (official API)\n`;
  } else if (runtimeInfo.isBun && typeof (Bun as any).stringWidth === 'function') {
    report += `\nString width calculation: Bun.stringWidth (legacy API)\n`;
  } else {
    report += `\nString width calculation: fallback implementation\n`;
  }

  return report;
}

// Enhanced version with color support
function generateColoredSnapshot(opportunities: Opportunity[]): string {
  const runtimeInfo = getBunRuntimeInfo();
  
  if (!runtimeInfo.isBun) {
    return generateCustomSnapshot(opportunities);
  }

  const reset = "\x1b[0m";
  const bright = "\x1b[1m";
  const green = "\x1b[32m";
  const red = "\x1b[31m";
  const yellow = "\x1b[33m";
  const blue = "\x1b[34m";
  
  let report = `${bright}${blue}Arbitrage Opportunity Snapshot${reset}\n`;
  report += `${bright}${blue}---------------------------------${reset}\n\n`;

  // Calculate dynamic widths using string width that accounts for ANSI codes
  const maxPairWidth = Math.max(
    getStringWidth(stripAnsi("Pair")),
    ...opportunities.map(op => getStringWidth(stripAnsi(op.pair)))
  );
  const maxSpreadWidth = Math.max(
    getStringWidth(stripAnsi("Spread")),
    ...opportunities.map(op => getStringWidth(stripAnsi(formatMoney(op.spread))))
  );
  const maxExchangeAWidth = Math.max(
    getStringWidth(stripAnsi("Exchange A")),
    ...opportunities.map(op => getStringWidth(stripAnsi(op.exchangeA)))
  );
  const maxExchangeBWidth = Math.max(
    getStringWidth(stripAnsi("Exchange B")),
    ...opportunities.map(op => getStringWidth(stripAnsi(op.exchangeB)))
  );

  // Colored header
  const headerParts = [
    padEnd("Pair", maxPairWidth),
    padStart("Spread", maxSpreadWidth),
    padEnd("Exchange A", maxExchangeAWidth),
    padEnd("Exchange B", maxExchangeBWidth)
  ];
  const header = ` ${headerParts.join(" | ")} `;
  report += `${bright}${header}${reset}\n`;
  
  // Separator
  const separatorParts = [
    padEnd("", maxPairWidth, "-"),
    padEnd("", maxSpreadWidth, "-"),
    padEnd("", maxExchangeAWidth, "-"),
    padEnd("", maxExchangeBWidth, "-")
  ];
  const separator = ` ${separatorParts.join(" | ")} `;
  report += `${separator}\n`;

  // Colored data rows
  for (const op of opportunities) {
    const pairCol = padEnd(op.pair, maxPairWidth);
    const spreadCol = padStart(formatMoney(op.spread), maxSpreadWidth);
    const exACol = padEnd(op.exchangeA, maxExchangeAWidth);
    const exBCol = padEnd(op.exchangeB, maxExchangeBWidth);
    
    let spreadColor = bright;
    if (op.spread > 1000) spreadColor = green;
    else if (op.spread > 500) spreadColor = yellow;
    else spreadColor = red;
    
    report += ` ${bright}${pairCol}${reset} | ${spreadColor}${spreadCol}${reset} | ${exACol} | ${exBCol}\n`;
  }

  report += "\n---------------------------------\n";
  report += `${bright}Generated with Bun ${runtimeInfo.version} optimization${reset}\n`;
  report += `${bright}String width: ${typeof (Bun as any).string?.width === 'function' ? 'Bun.string.width' : 'fallback'}${reset}\n`;
  
  return report;
}

// LUMEN CLI utility function
function generateLumenStatusReport(opportunities: Opportunity[]): string {
  const runtimeInfo = getBunRuntimeInfo();
  const reset = "\x1b[0m";
  const bright = "\x1b[1m";
  const green = "\x1b[32m";
  const red = "\x1b[31m";
  const yellow = "\x1b[33m";
  const blue = "\x1b[34m";
  
  let report = `${bright}🚀 LUMEN Arbitrage Status${reset}\n`;
  report += `${'='.repeat(50)}\n\n`;
  
  // Summary section
  const totalOpportunities = opportunities.length;
  const highValueOpportunities = opportunities.filter(op => op.spread > 1000).length;
  const avgSpread = opportunities.reduce((sum, op) => sum + op.spread, 0) / totalOpportunities;
  
  report += `${bright}Summary:${reset}\n`;
  report += `  Total Opportunities: ${green}${totalOpportunities}${reset}\n`;
  report += `  High Value (> $1000): ${green}${highValueOpportunities}${reset}\n`;
  report += `  Average Spread: ${yellow}${formatMoney(avgSpread)}${reset}\n`;
  report += `  Runtime: ${blue}${runtimeInfo.isBun ? `Bun ${runtimeInfo.version}` : 'Standard'}${reset}\n\n`;
  
  // Top opportunities table
  report += `${bright}Top Opportunities:${reset}\n`;
  const topOpportunities = opportunities
    .sort((a, b) => b.spread - a.spread)
    .slice(0, 5);
  
  if (topOpportunities.length > 0) {
    const maxPairWidth = Math.max(
      getStringWidth("Pair"),
      ...topOpportunities.map(op => getStringWidth(op.pair))
    );
    const maxSpreadWidth = Math.max(
      getStringWidth("Spread"),
      ...topOpportunities.map(op => getStringWidth(formatMoney(op.spread)))
    );
    
    const headerParts = [
      padEnd("Pair", maxPairWidth),
      padStart("Spread", maxSpreadWidth)
    ];
    const header = ` ${headerParts.join(" | ")} `;
    report += `${header}\n`;
    
    const separatorParts = [
      padEnd("", maxPairWidth, "-"),
      padEnd("", maxSpreadWidth, "-")
    ];
    const separator = ` ${separatorParts.join(" | ")} `;
    report += `${separator}\n`;
    
    for (const op of topOpportunities) {
      const pairCol = padEnd(op.pair, maxPairWidth);
      const spreadCol = padStart(formatMoney(op.spread), maxSpreadWidth);
      const color = op.spread > 1000 ? green : op.spread > 500 ? yellow : red;
      report += ` ${pairCol} | ${color}${spreadCol}${reset}\n`;
    }
  }
  
  return report;
}

// Export all functions
export { 
  generateCustomSnapshot, 
  generateColoredSnapshot, 
  generateLumenStatusReport,
  getStringWidth,
  stringTruncate,
  stringPadEnd,
  stringPadStart,
  stripAnsi,
  padEnd,
  padStart
};
export type { Opportunity };

// Example usage
if (import.meta.main) {
  const sampleOpportunities: Opportunity[] = [
    { pair: "BTC/USD", spread: 1250.50, exchangeA: "Binance", exchangeB: "Coinbase" },
    { pair: "ETH/USD", spread: 875.25, exchangeA: "Kraken", exchangeB: "Gemini" },
    { pair: "SOL/USD", spread: 342.75, exchangeA: "Raydium", exchangeB: "Orca" },
    { pair: "🚀MOON/USD", spread: 2100.00, exchangeA: "Uniswap", exchangeB: "Sushiswap" },
    { pair: "ビットコイン/USD", spread: 1500.00, exchangeA: "Bitflyer", exchangeB: "Zaif" }
  ];

  console.log("=== Plain Text Version ===");
  console.log(generateCustomSnapshot(sampleOpportunities));
  
  console.log("\n=== Colored Version (Bun only) ===");
  console.log(generateColoredSnapshot(sampleOpportunities));
  
  console.log("\n=== LUMEN CLI Status ===");
  console.log(generateLumenStatusReport(sampleOpportunities));
}
