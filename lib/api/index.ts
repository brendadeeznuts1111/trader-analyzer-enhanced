/**
 * API Module
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;root=ROOT-SQLITE-WAL}]
 * [#REF:v-0.1.16.API.INDEX.1.0.A.1.1]]
 *
 * Exports API caching and header management utilities
 */

export {
  // Types
  type CacheEntry,
  type CacheConfig,
  type CacheStats,
  // Class
  APICacheManager,
  // Singleton
  apiCacheManager,
} from './cache-manager';

// Default export
export { default } from './cache-manager';
