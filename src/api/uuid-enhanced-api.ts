/**
 * Enhanced API with UUIDv5 for entity identification
 */

import { serve } from 'bun';
import { randomUUIDv5 } from "bun";
import { uuidv5, benchmarkUUIDv5 } from '../utils/uuid-v5';
import { entityIds, VaultEntity, SportsMarketEntity, NBAGameEntity } from '../core/entity-ids';
import { vaultStorage, sportsMarketStorage, arbitrageStorage } from '../database/uuid-storage';

class UUIDEnhancedAPI {
  private server: ReturnType<typeof serve> | null = null;

  start(port: number = 3033): void {
    this.server = serve({
      port,
      hostname: '0.0.0.0',

      fetch: async (req) => {
        const url = new URL(req.url);
        const path = url.pathname;

        // UUID generation endpoints
        if (path === '/api/uuid/generate' && req.method === 'POST') {
          return await this.handleGenerateUUID(req);
        }

        if (path === '/api/uuid/parse' && req.method === 'POST') {
          return await this.handleParseUUID(req);
        }

        if (path === '/api/uuid/validate' && req.method === 'POST') {
          return await this.handleValidateUUID(req);
        }

        // Entity endpoints with UUIDv5
        if (path.startsWith('/api/vaults')) {
          return await this.handleVaults(req, path);
        }

        if (path.startsWith('/api/sports/markets')) {
          return await this.handleSportsMarkets(req, path);
        }

        if (path.startsWith('/api/nba/games')) {
          return await this.handleNBAGames(req, path);
        }

        if (path.startsWith('/api/arbitrage')) {
          return await this.handleArbitrage(req, path);
        }

        // Storage statistics
        if (path === '/api/storage/stats') {
          return this.handleStorageStats();
        }

        return new Response('Not Found', { status: 404 });
      }
    });

    console.log(`🔑 UUID-Enhanced API running on port ${port}`);
  }

  private async handleGenerateUUID(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { name, namespace = 'url', format = 'string' } = body;

      if (!name) {
        return Response.json(
          { error: 'Name is required' },
          { status: 400 }
        );
      }

      // Generate UUIDv5
      const uuid = randomUUIDv5(
        name,
        namespace,
        format === 'string' ? undefined : format
      );

      const result = typeof uuid === 'string' ? uuid : uuid.toString('hex');
      const parsed = uuidv5.parseUUID(uuid);

      return Response.json({
        uuid: result,
        parsed,
        isValid: uuidv5.isValidUUIDv5(uuid),
        timestamp: Date.now()
      });

    } catch (error) {
      return Response.json(
        { error: 'Invalid request', message: (error as Error).message },
        { status: 400 }
      );
    }
  }

  private async handleParseUUID(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { uuid } = body;

      if (!uuid) {
        return Response.json(
          { error: 'UUID is required' },
          { status: 400 }
        );
      }

      const parsed = uuidv5.parseUUID(uuid);
      const isValid = uuidv5.isValidUUIDv5(uuid);

      return Response.json({
        original: uuid,
        parsed,
        isValid,
        metadata: {
          version: isValid ? 5 : 'unknown',
          variant: 'RFC 4122',
          length: uuid.length
        }
      });

    } catch (error) {
      return Response.json(
        { error: 'Invalid UUID format', message: (error as Error).message },
        { status: 400 }
      );
    }
  }

  private async handleValidateUUID(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { uuid } = body;

      if (!uuid) {
        return Response.json(
          { error: 'UUID is required' },
          { status: 400 }
        );
      }

      const isValid = uuidv5.isValidUUIDv5(uuid);
      const namespace = uuidv5.getNamespace(uuid);

      return Response.json({
        uuid,
        isValid,
        namespace,
        version: isValid ? 5 : 'unknown',
        recommendations: isValid ? [] : ['Use UUIDv5 for deterministic ID generation']
      });

    } catch (error) {
      return Response.json(
        { error: 'Validation failed', message: (error as Error).message },
        { status: 400 }
      );
    }
  }

  private async handleVaults(req: Request, path: string): Promise<Response> {
    const method = req.method;

    if (method === 'POST') {
      // Create vault with UUIDv5 ID
      try {
        const body = await req.json();
        const { name, ...vaultData } = body;

        if (!name) {
          return Response.json(
            { error: 'Vault name is required' },
            { status: 400 }
          );
        }

        // Create vault entity
        const vault = new VaultEntity(name, vaultData);

        // Store in UUID storage
        const storageId = vaultStorage.storeVault({
          ...vault,
          ...vaultData
        });

        return Response.json({
          success: true,
          vault: {
            id: vault.id,
            shortId: entityIds.generateShortId(vault.id),
            name: vault.name,
            createdAt: vault.createdAt,
            storageId
          },
          metadata: {
            uuid: vault.id,
            isValid: uuidv5.isValidUUIDv5(vault.id),
            namespace: 'vault-optimizer'
          }
        }, { status: 201 });

      } catch (error) {
        return Response.json(
          { error: 'Failed to create vault', message: (error as Error).message },
          { status: 400 }
        );
      }
    }

    if (method === 'GET') {
      // Get vault by ID
      const id = path.split('/').pop();

      if (id) {
        const vault = vaultStorage.get(id);

        if (vault) {
          return Response.json({
            vault,
            metadata: {
              id,
              isValid: uuidv5.isValidUUIDv5(id),
              storageType: 'uuidv5'
            }
          });
        }
      }

      // List all vaults
      const stats = vaultStorage.getStats();
      const allVaults = vaultStorage.export();

      return Response.json({
        vaults: allVaults,
        count: allVaults.length,
        stats
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  private async handleSportsMarkets(req: Request, path: string): Promise<Response> {
    const method = req.method;

    if (method === 'POST') {
      try {
        const body = await req.json();
        const { sport, event, marketType, ...marketData } = body;

        if (!sport || !event || !marketType) {
          return Response.json(
            { error: 'Sport, event, and marketType are required' },
            { status: 400 }
          );
        }

        // Create sports market entity
        const market = new SportsMarketEntity(sport, event, marketType, marketData);

        // Store in UUID storage
        const storageId = sportsMarketStorage.storeMarket(sport, event, {
          ...market,
          ...marketData
        });

        return Response.json({
          success: true,
          market: {
            id: market.id,
            shortId: entityIds.generateShortId(market.id),
            sport: market.sport,
            event: market.event,
            marketType: market.marketType,
            storageId
          },
          metadata: {
            uuid: market.id,
            isValid: uuidv5.isValidUUIDv5(market.id),
            namespace: 'sports-market'
          }
        }, { status: 201 });

      } catch (error) {
        return Response.json(
          { error: 'Failed to create market', message: (error as Error).message },
          { status: 400 }
        );
      }
    }

    if (method === 'GET') {
      // Get market by ID or list all
      const id = path.split('/').pop();

      if (id && id !== 'markets') {
        const market = sportsMarketStorage.get(id);

        if (market) {
          return Response.json({
            market,
            metadata: {
              id,
              isValid: uuidv5.isValidUUIDv5(id)
            }
          });
        }

        return new Response('Market not found', { status: 404 });
      }

      // List all markets
      const allMarkets = sportsMarketStorage.export();
      const stats = sportsMarketStorage.getStats();

      return Response.json({
        markets: allMarkets,
        count: allMarkets.length,
        stats
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  private async handleNBAGames(req: Request, path: string): Promise<Response> {
    // Similar implementation for NBA games
    return Response.json({ message: 'NBA games endpoint' });
  }

  private async handleArbitrage(req: Request, path: string): Promise<Response> {
    // Similar implementation for arbitrage opportunities
    return Response.json({ message: 'Arbitrage endpoint' });
  }

  private handleStorageStats(): Response {
    const vaultStats = vaultStorage.getStats();
    const marketStats = sportsMarketStorage.getStats();
    const arbitrageStats = arbitrageStorage.getStats();

    return Response.json({
      timestamp: Date.now(),
      storage: {
        vaults: vaultStats,
        sportsMarkets: marketStats,
        arbitrage: arbitrageStats
      },
      totalItems: vaultStats.total + marketStats.total + arbitrageStats.total,
      totalStorage: vaultStats.storageSize + marketStats.storageSize + arbitrageStats.storageSize
    });
  }

  stop(): void {
    if (this.server) {
      this.server.stop();
      console.log('🔑 UUID-Enhanced API stopped');
    }
  }
}

// Export the class
export { UUIDEnhancedAPI };

// Start the API
const api = new UUIDEnhancedAPI();
api.start(3033);

// Example usage
export async function demonstrateUUIDv5(): Promise<void> {
  console.log('\n🎯 Demonstrating UUIDv5 Usage:');

  // 1. Generate UUIDv5 for a vault
  const vaultId = entityIds.generateVaultId('My Investment Vault');
  console.log('Vault ID:', vaultId);
  console.log('Short ID:', entityIds.generateShortId(vaultId));
  console.log('Is valid?', uuidv5.isValidUUIDv5(vaultId));

  // 2. Generate UUIDv5 for sports market
  const marketId = entityIds.generateSportsMarketId('nba', 'Lakers vs Warriors', 'moneyline');
  console.log('\nMarket ID:', marketId);

  // 3. Generate buffer UUID for high-performance
  const bufferUUID = uuidv5.generateBufferUUID('test-data', 'url');
  console.log('\nBuffer UUID:', bufferUUID);
  console.log('Hex:', bufferUUID.toString('hex'));
  console.log('Base64:', bufferUUID.toString('base64'));

  // 4. Parse UUID
  const parsed = uuidv5.parseUUID(marketId);
  console.log('\nParsed UUID:', parsed);

  // 5. Benchmark
  await benchmarkUUIDv5(1000);
}

// Run demonstration if this file is executed directly
if (import.meta.main) {
  demonstrateUUIDv5().catch(console.error);
}
