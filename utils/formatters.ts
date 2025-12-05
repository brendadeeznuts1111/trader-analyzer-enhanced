// @utils/formatters.ts
import { getBunRuntimeInfo } from '@/lib/bun-utils-enhanced';

/**
 * Format money with runtime optimization
 */
export function formatMoney(amount: number, currency = '$'): string {
  const runtimeInfo = getBunRuntimeInfo();
  
  if (runtimeInfo.isBun) {
    // Use Bun's optimized number formatting
    return `${currency}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  } else {
    // Standard fallback
    return `${currency}${amount.toFixed(2)}`;
  }
}

/**
 * Format percentage with runtime optimization
 */
export function formatPercentage(value: number, decimals = 2): string {
  const runtimeInfo = getBunRuntimeInfo();
  
  if (runtimeInfo.isBun) {
    return `${(value * 100).toFixed(decimals)}%`;
  } else {
    return `${(value * 100).toFixed(decimals)}%`;
  }
}

/**
 * Format number with runtime optimization
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const runtimeInfo = getBunRuntimeInfo();
  
  if (runtimeInfo.isBun) {
    return value.toLocaleString('en-US', options);
  } else {
    return value.toLocaleString('en-US', options);
  }
}

/**
 * Format timestamp with runtime optimization
 */
export function formatTimestamp(timestamp: number | Date): string {
  const runtimeInfo = getBunRuntimeInfo();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (runtimeInfo.isBun) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } else {
    return date.toISOString();
  }
}
