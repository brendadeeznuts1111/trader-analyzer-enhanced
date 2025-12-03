/**
 * Canonical Market Module
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;root=ROOT-MARKET-TAXONOMY}]
 * [#REF:v-0.1.16.CANONICAL.INDEX.1.0.A.1.1]]
 *
 * Exports UUIDv5 canonicalization utilities for market identification
 */

export {
  // Constants
  ORCA_NAMESPACE,
  EXCHANGE_NAMESPACES,
  // Types
  type MarketExchange,
  type MarketType,
  type MarketIdentifier,
  type CanonicalMarket,
  // Class
  MarketCanonicalizer,
  // Singleton
  marketCanonicalizer,
} from './uuidv5';

// Default export
export { default } from './uuidv5';
