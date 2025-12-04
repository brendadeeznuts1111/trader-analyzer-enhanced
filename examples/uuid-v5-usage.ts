// Example 1: Basic UUIDv5 generation
import { randomUUIDv5 } from "bun";
import { uuidv5 } from '../src/utils/uuid-v5';

// Generate UUIDv5 like the Bun documentation example
const example = randomUUIDv5("www.example.com", "url", "buffer");
console.log(example); // <Buffer 6b a7 b8 11 9d ad 11 d1 80 b4 00 c0 4f d4 30 c8>

// Parse it
const parsed = uuidv5.parseUUID(example);
console.log(parsed.string); // 6ba7b811-9dad-11d1-80b4-00c04fd430c8

// Example 2: Generate vault ID
const vaultId = uuidv5.generateForVault('My Investment Portfolio');
console.log('Vault ID:', vaultId);

// Example 3: Generate sports market ID
const marketId = uuidv5.generateForSportsMarket('nba-lakers-warriors-2024');
console.log('Market ID:', marketId);

// Example 4: Store data with UUIDv5 key
import { vaultStorage } from '../src/database/uuid-storage';

const vaultData = {
  name: 'Growth Fund',
  balance: 1000000,
  allocation: { equities: 60, bonds: 30, crypto: 10 }
};

const storageId = vaultStorage.storeVault(vaultData);
console.log('Storage ID:', storageId);

// Retrieve by ID
const retrieved = vaultStorage.get(storageId);
console.log('Retrieved:', retrieved);

// Example 5: Entity creation
import { VaultEntity, SportsMarketEntity, entityIds } from '../src/core/entity-ids';

const vault = new VaultEntity('Retirement Fund');
console.log('Vault entity:', {
  id: vault.id,
  name: vault.name,
  shortId: entityIds.generateShortId(vault.id)
});

const market = new SportsMarketEntity('nba', 'Celtics vs Heat', 'point-spread');
console.log('Market entity:', {
  id: market.id,
  sport: market.sport,
  event: market.event
});

// Example 6: Validate UUID
const isValid = uuidv5.isValidUUIDv5(vault.id);
console.log('Is valid UUIDv5?', isValid);

// Example 7: Performance benchmark
async function runBenchmark() {
  const iterations = 100000;
  console.log(`Generating ${iterations} UUIDv5...`);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    randomUUIDv5(`item-${i}`, 'url');
  }
  const end = performance.now();

  console.log(`Time: ${(end - start).toFixed(2)}ms`);
  console.log(`Rate: ${Math.floor(iterations / ((end - start) / 1000))} UUIDs/sec`);
}

// Example 8: Using different formats
const formats = ['string', 'buffer', 'hex', 'base64'] as const;

formats.forEach(format => {
  const uuid = uuidv5.generateForVault('Test Vault', format);
  console.log(`${format}:`, typeof uuid === 'string' ? uuid.slice(0, 20) + '...' : uuid);
});
