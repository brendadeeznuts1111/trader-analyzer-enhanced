/**
 * Markets Module
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;root=ROOT-MARKET-TAXONOMY}]
 * [#REF:v-0.1.16.MARKETS.INDEX.1.0.A.1.1]]
 *
 * Exports market fetching utilities with canonicalization and caching
 */

export {
  // Types
  type FetchOptions,
  type FetchResult,
  type MarketQuery,
  // Class
  MarketFetcher,
  // Singleton
  marketFetcher,
} from './fetcher';

// Default export
export { default } from './fetcher';
