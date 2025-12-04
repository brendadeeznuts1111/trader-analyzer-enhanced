import { bench, run } from 'mitata';
import { marketCanonicalizer } from '../lib/canonical';
import { apiCacheManager } from '../lib/api/cache-manager';
import { marketFetcher } from '../lib/markets/fetcher';
import { exchangeManager } from '../lib/exchanges/exchange_manager';

// Ensure exchanges are initialized for benchmarks
exchangeManager.initialize();

bench('Canonicalize simple market', () => {
  marketCanonicalizer.canonicalize({
    exchange: 'kalshi',
    nativeId: 'US-Election-2024',
    type: 'binary',
  });
});

bench('Canonicalize complex sports market', () => {
  marketCanonicalizer.canonicalize({
    exchange: 'sports',
    nativeId: 'NBA-LAL-vs-BOS-20241203-Q1',
    home: 'LAL',
    away: 'BOS',
    type: 'binary',
  });
});

bench('Cache manager has check', () => {
  apiCacheManager.has('test-uuid');
});

bench('MarketFetcher quickFetch (cached if possible)', async () => {
  // Use a known market that might cache quickly or fail gracefully
  try {
    await marketFetcher.quickFetch('kalshi' as any, 'test-market');
  } catch (e) {
    // Ignore errors for benchmark
  }
});

bench('Exchange manager getExchange', () => {
  exchangeManager.getExchange('kalshi');
});

(async () => {
// Run benchmarks
await run();
})();
