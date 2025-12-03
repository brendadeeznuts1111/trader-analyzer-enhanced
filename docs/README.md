# Trader Role-Play Analyzer

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Bun](https://img.shields.io/badge/Bun-1.3-FFDF37?logo=bun)

Intelligent analysis platform for learning trading strategies by role-playing as top traders. **Powered by Cloudflare Workers** for global edge deployment and **UUIDv5 canonical market identifiers** for cross-exchange compatibility.

> **Runtime**: Bun-native development with Next.js 16 frontend
> **Architecture**: Multi-environment support (Bun SQLite + Next.js in-memory cache)

## Core Features

### 1. UUIDv5 Canonical Market System (NEW)

- **Deterministic UUIDs**: Same market input always produces identical UUID across all systems
- **Cross-Exchange Compatibility**: Unified identifiers for Polymarket, Kalshi, Manifold, BitMEX, Sports
- **Multi-Environment Cache**: SQLite WAL mode (Bun) with in-memory fallback (Next.js)
- **Exchange-Aware Headers**: Rate limiting, canonical tracking, debug headers

```typescript
// Generate canonical UUID for any market
import { marketCanonicalizer } from './lib/canonical';

const canonical = marketCanonicalizer.canonicalize({
  exchange: 'polymarket',
  nativeId: 'btc-100k-2025',
  type: 'binary',
});

console.log(canonical.uuid); // "d4551ab8-b0d7-5444-ab99-915c1a29308e"
// Same input = Same UUID (deterministic)
```

### 2. Role-Play Learning

- Guess the trader's next move based on market conditions
- Real-time scoring system to record your judgment accuracy
- Provide trader's thought process hints to help understand decision logic
- Auto-play mode with adjustable speed

### 3. AI Action Prediction

- Intelligent prediction based on trader's historical patterns
- Display similar historical situations and their outcomes
- Pattern statistical analysis, including operation distribution and average PnL
- Prediction confidence and detailed reasons

### 4. Trader Profile Analysis

- Risk preference assessment (Aggressive/Steady/Conservative)
- Trading frequency type (Scalping/Intraday/Swing/Trend)
- Trading discipline and patience score
- Core strengths and areas for improvement

### 5. Complete Data Visualization

- Multi-period K-line charts (1m ~ 1w) via Cloudflare Workers
- Trade markers displayed in real-time on the chart
- Position history tracking with live updates
- Equity curve and monthly PnL analysis
- **Global Edge Deployment**: 200+ data centers worldwide

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Cloudflare Workers, Bun runtime |
| Caching | SQLite WAL (Bun) / In-memory Map (Next.js) |
| Real-time | WebSocket with Durable Objects |
| Charts | Lightweight Charts, Recharts |
| Testing | Bun test runner (68 unit tests) |

## Quick Start

### Prerequisites

- [Bun](https://bun.com/) runtime (v1.3+) [#REF:BUN-RUNTIME]
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for Cloudflare Workers [#REF:CF-WRANGLER]

### Debug Resources

- [Bun Debugger](https://bun.com/docs/runtime/debugger) [#REF:BUN-DEBUG]
- [HTTP Error Handling](https://bun.com/docs/runtime/http/error-handling) [#REF:BUN-HTTP-ERR]

### 1. Install Dependencies

```bash
bun install
```

### 2. Local Development

```bash
# Start Next.js frontend (port 3002)
bun run dev

# In another terminal, start Workers locally (optional)
bunx wrangler dev --config scripts/deploy/markets-wrangler.toml
```

### 3. Run Tests

```bash
# Run all unit tests
bun test

# Run specific test suite
bun test tests/canonical.test.ts
```

### 4. Build & Deploy

```bash
# Build Next.js for production
bun run build

# Build with environment-specific constants (uses --define)
bun run build:dev      # Development build
bun run build:staging  # Staging build  
bun run build:prod     # Production build (minified)
bun run build:compile  # Compile to standalone executable

# Deploy Workers to staging
bunx wrangler deploy --config scripts/deploy/markets-wrangler.toml --env staging
```

> **Note**: Build scripts inject git metadata (version, commit, branch) automatically via `--define` flags. See `lib/constants.ts` for available helpers. [#REF:BUN-BUILD]

## Project Structure

```
trader-analyzer/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── markets/
│   │   │   ├── canonical/        # NEW: Canonical UUID API
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── trades/
│   │   └── health/
│   ├── miniapp/                  # Telegram Mini App
│   └── page.tsx
├── components/                   # React components
│   ├── Dashboard.tsx
│   ├── CanonicalMarketSelector.tsx
│   ├── CanonicalMarketSelectorUUID.tsx  # NEW: UUID selector
│   └── ...
├── lib/                          # Core libraries
│   ├── canonical/                # NEW: UUIDv5 canonicalization
│   │   ├── uuidv5.ts            # Bun.randomUUIDv5 + crypto fallback
│   │   └── index.ts
│   ├── api/                      # API utilities
│   │   ├── cache-manager.ts     # SQLite/Memory dual cache
│   │   ├── header-manager.ts    # Exchange-aware headers
│   │   └── index.ts
│   ├── markets/                  # NEW: Market fetcher
│   │   ├── fetcher.ts           # Canonicalize + cache wrapper
│   │   └── index.ts
│   ├── exchanges/                # Exchange adapters
│   │   ├── polymarket_exchange.ts
│   │   ├── kalshi_exchange.ts
│   │   └── ...
│   └── telegram.ts              # Telegram bot integration
├── tests/                        # Test suites
│   ├── canonical.test.ts        # 29 critical path tests
│   ├── blueprint.test.ts
│   └── basic.test.ts
├── scripts/
│   ├── deploy/                   # Deployment configs
│   └── telegram-bot.ts          # Telegram polling bot
└── docs/
    └── API_DOCUMENTATION.md
```

## API Reference

### Canonical Markets API (NEW)

```http
# List canonical markets with UUIDs
GET /api/markets/canonical?exchange=polymarket&limit=50

# Response includes canonical headers:
# X-Canonical-UUID: d4551ab8-b0d7-5444-ab99-915c1a29308e
# X-Cache-Status: HIT
# X-RateLimit-Remaining: 97
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `exchange` | string | polymarket | Exchange: polymarket, kalshi, manifold, bitmex, sports |
| `limit` | number | 50 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |
| `type` | string | - | Filter by market type: binary, scalar, categorical |
| `category` | string | - | Filter: crypto, prediction, sports, politics |
| `search` | string | - | Search in displayName/description |

**Response:**
```json
{
  "markets": [
    {
      "uuid": "904ab02a-c673-5bc3-a5b3-30f24ec5be21",
      "nativeId": "516706",
      "exchange": "polymarket",
      "displayName": "Fed rate hike in 2025?",
      "category": "prediction",
      "type": "binary",
      "tags": ["polymarket", "binary", "v265099557"],
      "salt": "9b546571766655be",
      "cacheKey": "polymarket:15b558b432976cb49ff885cab53991b7",
      "odds": { "yes": 65, "no": 35 },
      "volume": "941832.52"
    }
  ],
  "pagination": { "total": 100, "offset": 0, "limit": 50, "hasMore": true },
  "cacheStats": { "hits": 42, "misses": 3, "hitRate": 0.93 },
  "meta": { "exchange": "polymarket", "responseTimeMs": 4.2 }
}
```

### Canonicalize Single Market (POST)

```http
POST /api/markets/canonical
Content-Type: application/json

{
  "exchange": "polymarket",
  "nativeId": "btc-100k-2025",
  "type": "binary"
}
```

### Markets API

```http
GET /api/markets
GET /api/markets/{id}
GET /api/markets/{id}/ohlcv?timeframe=1d&limit=100
```

### Trading Data API

```http
GET /api/trades?type=stats
GET /api/trades?type=equity&days=30
GET /api/trades?type=sessions&page=1&limit=20
GET /api/trades?sessionId=session-123
```

### Health Check

```http
GET /api/health
GET /api/health/blueprint
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                          │
│                     (React 19 + TypeScript)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼───┐ ┌─────▼─────┐ ┌───▼────────┐
            │ /api/     │ │ /api/     │ │ /api/      │
            │ markets/  │ │ trades    │ │ markets/   │
            │ canonical │ │           │ │ canonical  │
            └───────────┘ └───────────┘ └────────────┘
                    │           │           │
            ┌───────▼───────────▼───────────▼───────┐
            │           lib/canonical/               │
            │    UUIDv5 Canonicalizer (Bun native)  │
            │    + crypto fallback for Next.js      │
            └───────────────────────────────────────┘
                                │
            ┌───────────────────▼───────────────────┐
            │           lib/api/cache-manager       │
            │   SQLite WAL (Bun) │ Map (Next.js)   │
            └───────────────────────────────────────┘
                                │
            ┌───────────────────▼───────────────────┐
            │           lib/exchanges/              │
            │  Polymarket │ Kalshi │ BitMEX │ Sports │
            └───────────────────────────────────────┘
                                │
            ┌───────────────────▼───────────────────┐
            │         Cloudflare Workers            │
            │      (Global Edge - 200+ DCs)         │
            └───────────────────────────────────────┘
```

## Testing

### Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| canonical/uuidv5 | 15 | 72% |
| api/cache-manager | 8 | 94% |
| markets/fetcher | 6 | 25% |
| **Total** | **68** | **53%** |

### Running Tests

```bash
# All unit tests
bun test

# Specific test file
bun test tests/canonical.test.ts

# Watch mode
bun test --watch
```

### Critical Path Tests

The canonical system has comprehensive tests for:
- UUID determinism (same input = same output)
- UUID uniqueness across exchanges/types
- RFC 4122 UUID format validation
- Cache operations (set/get/invalidate)
- Hit count tracking
- End-to-end pipeline validation

## Performance

| Metric | Value |
|--------|-------|
| UUID Generation | <0.1ms |
| Cache Hit | <1ms |
| Cache Miss (Polymarket) | ~500ms |
| API Response (cached) | ~4ms |
| Build Time | ~8s |

## Environment Variables

```bash
# .env.local
BUN_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_WORKERS_API=https://your-worker.workers.dev
POLY_ENABLED=true
DEV=true  # Uses in-memory cache instead of SQLite
```

## Version History

- **v0.1.16** (Current): UUIDv5 Canonical Market System
  - Bun.randomUUIDv5() with crypto fallback
  - Multi-environment cache (SQLite + Memory)
  - Exchange-aware header manager
  - 29 critical path tests
  - `/api/markets/canonical` endpoint

- **v0.1.15**: Cloudflare Workers migration
  - WebSocket DO foundation
  - Full API suite migrated
  - ETag caching

- **v0.1.14**: Trades API with P&L calculations
- **v0.1.13**: OHLCV aggregation
- **v0.1.12**: Markets API with ETag caching

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Run tests: `bun test`
4. Commit changes: `git commit -m 'feat: add your feature'`
5. Push to branch: `git push origin feat/your-feature`
6. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with Bun + Next.js + Cloudflare Workers**
