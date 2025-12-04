/**
 * URLPattern API Tests
 * 
 * Tests for the URLPattern implementation based on the Bun PR #25168
 * @see https://github.com/oven-sh/bun/pull/25168
 */

import { describe, test, expect } from 'bun:test';
import {
  URLPattern,
  createPathPattern,
  createAPIPattern,
  createPatternRouter,
  matchPatterns,
  extractRouteParams,
  matchesAny,
  APIPatterns,
  hasNativeURLPattern,
  isURLPatternInit,
  isURLPatternResult,
} from '../lib/url-pattern';

describe('URLPattern API', () => {
  describe('Basic Functionality', () => {
    test('should create pattern from pathname', () => {
      const pattern = new URLPattern({ pathname: '/users/:id' });
      expect(pattern.pathname).toBe('/users/:id');
    });

    test('should test URL matches (true)', () => {
      const pattern = new URLPattern({ pathname: '/users/:id' });
      expect(pattern.test('https://example.com/users/123')).toBe(true);
    });

    test('should test URL matches (false)', () => {
      const pattern = new URLPattern({ pathname: '/users/:id' });
      expect(pattern.test('https://example.com/posts/456')).toBe(false);
    });

    test('should exec and extract groups', () => {
      const pattern = new URLPattern({ pathname: '/users/:id' });
      const result = pattern.exec('https://example.com/users/123');
      
      expect(result).not.toBeNull();
      expect(result!.pathname.groups.id).toBe('123');
    });

    test('should return null for non-matching exec', () => {
      const pattern = new URLPattern({ pathname: '/users/:id' });
      const result = pattern.exec('https://example.com/posts/456');
      
      expect(result).toBeNull();
    });
  });

  describe('Wildcard Patterns', () => {
    test('should match wildcard patterns', () => {
      const pattern = new URLPattern({ pathname: '/files/*' });
      
      expect(pattern.test('https://example.com/files/image.png')).toBe(true);
      expect(pattern.test('https://example.com/files/docs/readme.md')).toBe(true);
    });

    test('should extract wildcard groups', () => {
      const pattern = new URLPattern({ pathname: '/files/*' });
      const result = pattern.exec('https://example.com/files/image.png');
      
      expect(result).not.toBeNull();
      expect(result!.pathname.groups['0']).toBe('image.png');
    });
  });

  describe('Multiple Parameters', () => {
    test('should match multiple named groups', () => {
      const pattern = new URLPattern({ pathname: '/api/:resource/:id' });
      
      expect(pattern.test('https://example.com/api/users/123')).toBe(true);
      expect(pattern.test('https://example.com/api/posts/456')).toBe(true);
    });

    test('should extract multiple groups', () => {
      const pattern = new URLPattern({ pathname: '/api/:resource/:id' });
      const result = pattern.exec('https://example.com/api/users/123');
      
      expect(result).not.toBeNull();
      expect(result!.pathname.groups.resource).toBe('users');
      expect(result!.pathname.groups.id).toBe('123');
    });
  });

  describe('String Pattern Constructor', () => {
    test('should parse full URL pattern string', () => {
      const pattern = new URLPattern('https://example.com/users/:id');
      
      expect(pattern.test('https://example.com/users/123')).toBe(true);
    });

    test('should parse pathname-only pattern string', () => {
      const pattern = new URLPattern('/users/:id');
      
      // Should match with base URL
      expect(pattern.test('https://example.com/users/123')).toBe(true);
    });
  });

  describe('Protocol and Hostname Matching', () => {
    test('should match specific protocol', () => {
      const pattern = new URLPattern({
        protocol: 'https',
        pathname: '/secure/*',
      });
      
      expect(pattern.test('https://example.com/secure/page')).toBe(true);
      expect(pattern.test('http://example.com/secure/page')).toBe(false);
    });

    test('should match specific hostname', () => {
      const pattern = new URLPattern({
        hostname: 'api.example.com',
        pathname: '/*',
      });
      
      expect(pattern.test('https://api.example.com/users')).toBe(true);
      expect(pattern.test('https://www.example.com/users')).toBe(false);
    });
  });

  describe('hasRegExpGroups Property', () => {
    test('should be true for patterns with named groups', () => {
      const pattern = new URLPattern({ pathname: '/users/:id' });
      expect(pattern.hasRegExpGroups).toBe(true);
    });

    test('should be true for patterns with wildcards', () => {
      const pattern = new URLPattern({ pathname: '/files/*' });
      expect(pattern.hasRegExpGroups).toBe(true);
    });

    test('should be false for static patterns', () => {
      const pattern = new URLPattern({ pathname: '/about' });
      expect(pattern.hasRegExpGroups).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('createPathPattern', () => {
    test('should create pattern from pathname string', () => {
      const pattern = createPathPattern('/users/:id');
      expect(pattern.test('https://example.com/users/123')).toBe(true);
    });
  });

  describe('createAPIPattern', () => {
    test('should create pattern with base URL', () => {
      const pattern = createAPIPattern('/api/users/:id');
      expect(pattern.test('http://localhost:3000/api/users/123')).toBe(true);
    });
  });

  describe('matchPatterns', () => {
    test('should return first matching pattern', () => {
      const patterns = [
        createPathPattern('/users/:id'),
        createPathPattern('/posts/:id'),
      ];
      
      const result = matchPatterns('https://example.com/posts/123', patterns);
      
      expect(result).not.toBeNull();
      expect(result!.result.pathname.groups.id).toBe('123');
    });

    test('should return null if no patterns match', () => {
      const patterns = [
        createPathPattern('/users/:id'),
        createPathPattern('/posts/:id'),
      ];
      
      const result = matchPatterns('https://example.com/comments/123', patterns);
      
      expect(result).toBeNull();
    });
  });

  describe('createPatternRouter', () => {
    test('should create working router', () => {
      const router = createPatternRouter([
        { pattern: createPathPattern('/users/:id'), handler: 'userHandler' },
        { pattern: createPathPattern('/posts/:id'), handler: 'postHandler' },
      ]);
      
      const userResult = router('https://example.com/users/123');
      expect(userResult).not.toBeNull();
      expect(userResult!.handler).toBe('userHandler');
      expect(userResult!.params.id).toBe('123');
      
      const postResult = router('https://example.com/posts/456');
      expect(postResult).not.toBeNull();
      expect(postResult!.handler).toBe('postHandler');
      expect(postResult!.params.id).toBe('456');
    });

    test('should return null for unmatched routes', () => {
      const router = createPatternRouter([
        { pattern: createPathPattern('/users/:id'), handler: 'userHandler' },
      ]);
      
      const result = router('https://example.com/comments/123');
      expect(result).toBeNull();
    });
  });

  describe('extractRouteParams', () => {
    test('should extract params from URL', () => {
      const pattern = createPathPattern('/api/:resource/:id');
      const params = extractRouteParams(pattern, 'https://example.com/api/users/123');
      
      expect(params).not.toBeNull();
      expect(params!.resource).toBe('users');
      expect(params!.id).toBe('123');
    });

    test('should return null for non-matching URL', () => {
      const pattern = createPathPattern('/api/:resource/:id');
      const params = extractRouteParams(pattern, 'https://example.com/other/path');
      
      expect(params).toBeNull();
    });
  });

  describe('matchesAny', () => {
    test('should return true if any pattern matches', () => {
      const patterns = [
        createPathPattern('/users/*'),
        createPathPattern('/posts/*'),
      ];
      
      expect(matchesAny('https://example.com/users/123', patterns)).toBe(true);
      expect(matchesAny('https://example.com/posts/456', patterns)).toBe(true);
    });

    test('should return false if no patterns match', () => {
      const patterns = [
        createPathPattern('/users/*'),
        createPathPattern('/posts/*'),
      ];
      
      expect(matchesAny('https://example.com/comments/123', patterns)).toBe(false);
    });
  });
});

describe('API Patterns (trader-analyzer)', () => {
  test('should match markets route', () => {
    expect(APIPatterns.markets.test('https://api.example.com/api/markets')).toBe(true);
  });

  test('should match market by ID', () => {
    const result = APIPatterns.marketById.exec('https://api.example.com/api/markets/BTC-USD');
    expect(result).not.toBeNull();
    expect(result!.pathname.groups.id).toBe('BTC-USD');
  });

  test('should match market by exchange and symbol', () => {
    const result = APIPatterns.marketBySymbol.exec('https://api.example.com/api/markets/binance/BTC-USDT');
    expect(result).not.toBeNull();
    expect(result!.pathname.groups.exchange).toBe('binance');
    expect(result!.pathname.groups.symbol).toBe('BTC-USDT');
  });

  test('should match OHLCV route', () => {
    const result = APIPatterns.ohlcv.exec('https://api.example.com/api/ohlcv/binance/BTC-USDT/1h');
    expect(result).not.toBeNull();
    expect(result!.pathname.groups.exchange).toBe('binance');
    expect(result!.pathname.groups.symbol).toBe('BTC-USDT');
    expect(result!.pathname.groups.timeframe).toBe('1h');
  });

  test('should match any API route with wildcard', () => {
    expect(APIPatterns.anyAPI.test('https://api.example.com/api/anything/here')).toBe(true);
    expect(APIPatterns.anyAPI.test('https://api.example.com/api/deeply/nested/route')).toBe(true);
  });

  test('should match health check', () => {
    expect(APIPatterns.health.test('https://api.example.com/api/health')).toBe(true);
  });
});

describe('Type Guards', () => {
  describe('isURLPatternInit', () => {
    test('should return true for valid URLPatternInit', () => {
      expect(isURLPatternInit({ pathname: '/users/:id' })).toBe(true);
      expect(isURLPatternInit({ hostname: 'example.com' })).toBe(true);
      expect(isURLPatternInit({ protocol: 'https' })).toBe(true);
    });

    test('should return false for invalid values', () => {
      expect(isURLPatternInit(null)).toBe(false);
      expect(isURLPatternInit(undefined)).toBe(false);
      expect(isURLPatternInit('string')).toBe(false);
      expect(isURLPatternInit(123)).toBe(false);
      expect(isURLPatternInit({})).toBe(false);
    });
  });

  describe('isURLPatternResult', () => {
    test('should return true for valid URLPatternResult', () => {
      const pattern = createPathPattern('/users/:id');
      const result = pattern.exec('https://example.com/users/123');
      expect(isURLPatternResult(result)).toBe(true);
    });

    test('should return false for invalid values', () => {
      expect(isURLPatternResult(null)).toBe(false);
      expect(isURLPatternResult(undefined)).toBe(false);
      expect(isURLPatternResult({})).toBe(false);
    });
  });
});

describe('Native URLPattern Detection', () => {
  test('should detect native URLPattern availability', () => {
    // This will be true if Bun has native URLPattern, false otherwise
    expect(typeof hasNativeURLPattern).toBe('boolean');
    console.log(`Native URLPattern available: ${hasNativeURLPattern}`);
  });
});

describe('Edge Cases', () => {
  test('should handle empty input', () => {
    const pattern = createPathPattern('/users/:id');
    expect(pattern.test(undefined as unknown as string)).toBe(false);
    expect(pattern.exec(undefined as unknown as string)).toBeNull();
  });

  test('should handle malformed URLs gracefully', () => {
    const pattern = createPathPattern('/users/:id');
    expect(pattern.test('not-a-valid-url')).toBe(false);
  });

  test('should handle special characters in parameters', () => {
    const pattern = createPathPattern('/files/:filename');
    const result = pattern.exec('https://example.com/files/my-file-2023.txt');
    
    expect(result).not.toBeNull();
    expect(result!.pathname.groups.filename).toBe('my-file-2023.txt');
  });

  test('should handle URL-encoded characters', () => {
    const pattern = createPathPattern('/search/:query');
    const result = pattern.exec('https://example.com/search/hello%20world');
    
    expect(result).not.toBeNull();
    expect(result!.pathname.groups.query).toBe('hello%20world');
  });
});
