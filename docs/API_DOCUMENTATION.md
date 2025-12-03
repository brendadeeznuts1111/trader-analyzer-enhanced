# Cloudflare Workers API Documentation [#REF:v0.1.15.API.DOCS]

## Overview

The Trader Analyzer API is now fully hosted on Cloudflare Workers, providing global edge deployment with sub-50ms latency worldwide. All endpoints support ETag caching for efficient bandwidth usage.

> **Technical Note**: Built with Bun runtime v1.3.2 for optimal performance [#REF:BUN-RUNTIME-HEX:0x42554E2D]
> **RSS Feed**: Bun release notes at [bun.com/blog/rss.xml](https://bun.com/blog/rss.xml) [#REF:BUN-RSS-HEX:0x5253532D]
> **Debug**: [Debugger](https://bun.com/docs/runtime/debugger) | [HTTP Error Handling](https://bun.com/docs/runtime/http/error-handling) [#REF:BUN-DEBUG]

## Base URL

```
Production: https://trader-analyzer-markets.utahj4754.workers.dev  [#REF:PROD-URL-HEX:0x50524F44]
Staging:    https://trader-analyzer-markets-staging.utahj4754.workers.dev [#REF:STAGING-URL-HEX:0x53544147]
Local:      http://localhost:8788 [#REF:LOCAL-URL-HEX:0x4C4F4341]
```

## Authentication

Currently no authentication required. All endpoints are public for demo purposes.

> **Future**: JWT-based auth planned for v0.2.0 [#REF:AUTH-HEX:0x41555448]

## Response Format

All responses are JSON with consistent structure:

```json
{
  "data": "...",
  "timestamp": 1640995200000,
  "cached": false,
  "version": "0.1.15" // API version for compatibility
}
```

## Caching [#REF:CACHE-HEX:0x43414348]

All endpoints support HTTP ETag caching with CRC32 checksums:

- Send `If-None-Match: "etag-value"` header
- Receive `304 Not Modified` for unchanged data
- Cache TTL: 5 minutes for dynamic data, 30 seconds for real-time

**ETag Format**: `"v${crc32(JSON.stringify(data))}"` [#REF:ETAG-FORMAT-HEX:0x45544147]

**Cache-Control Headers**:

```
Cache-Control: public, max-age=300  // 5 minutes
ETag: "v1deee103"                   // CRC32 checksum
Last-Modified: Wed, 03 Dec 2025 12:00:00 GMT
```

---

## Markets API

### Get All Markets

```http
GET /api/markets
```

**Response:**

```json
{
  "markets": [
    {
      "id": "btc-usd-perp",
      "displayName": "BTC/USD Perpetual",
      "category": "crypto",
      "status": "active",
      "description": "Bitcoin perpetual futures contract",
      "tags": ["crypto", "bitcoin", "futures", "perp"],
      "sources": [
        {
          "exchange": "binance",
          "symbol": "BTCUSDT",
          "marketId": "BTCUSDT",
          "status": "active",
          "lastUpdate": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "total": 5
}
```

### Get Single Market

```http
GET /api/markets/{marketId}
```

**Parameters:**

- `marketId`: Market identifier (e.g., `btc-usd-perp`)

**Response:** Individual market object with orderbook data

### Get OHLCV Data [#REF:OHLCV-API-HEX:0x4F484C43]

```http
GET /api/markets/{marketId}/ohlcv?timeframe=1d&limit=100&since=1640995200
```

**URL Search Parameters:**

| Parameter   | Type   | Default | Range                       | Description           | Hex Ref      |
| ----------- | ------ | ------- | --------------------------- | --------------------- | ------------ |
| `timeframe` | string | `"1d"`  | `1m,5m,15m,30m,1h,4h,1d,1w` | Aggregation timeframe | `0x54464D45` |
| `limit`     | number | `100`   | `1-1000`                    | Candles to return     | `0x4C494D49` |
| `since`     | number | `null`  | Unix timestamp              | Start time filter     | `0x53494E43` |

**Timeframe Aggregation Map:**

```javascript
const TIMEFRAME_SOURCE = {
  '1m': '1m', // Direct data
  '5m': '5m', // Direct data
  '15m': '5m', // Aggregate 5m → 15m (3:1 ratio)
  '30m': '5m', // Aggregate 5m → 30m (6:1 ratio)
  '1h': '1h', // Direct data
  '4h': '1h', // Aggregate 1h → 4h (4:1 ratio)
  '1d': '1d', // Direct data
  '1w': '1d', // Aggregate 1d → 1w (7:1 ratio)
};
```

**Response:**

```json
{
  "candles": [
    {
      "time": 1640995200, // Unix timestamp (seconds)
      "open": 65000.0, // Opening price
      "high": 65500.0, // Highest price
      "low": 64500.0, // Lowest price
      "close": 65200.0, // Closing price
      "volume": 1000.0 // Trading volume
    }
  ],
  "marketId": "btc-usd-perp",
  "timeframe": "1d",
  "count": 1,
  "totalAvailable": 1000,
  "limited": false,
  "range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T00:00:00Z"
  }
}
```

**Aggregation Algorithm** [#REF:AGG-ALGO-HEX:0x41474752]:

```javascript
function aggregateCandles(candles, targetMinutes, sourceMinutes) {
  const ratio = targetMinutes / sourceMinutes;
  const bucketSeconds = targetMinutes * 60;

  // Group candles by time buckets
  const buckets = new Map();
  for (const candle of candles) {
    const bucketTime = Math.floor(candle.time / bucketSeconds) * bucketSeconds;
    if (!buckets.has(bucketTime)) buckets.set(bucketTime, []);
    buckets.get(bucketTime).push(candle);
  }

  // Aggregate each bucket: O + H + L + C + V
  return Array.from(buckets.entries()).map(([time, bucketCandles]) => ({
    time,
    open: bucketCandles[0].open,
    high: Math.max(...bucketCandles.map(c => c.high)),
    low: Math.min(...bucketCandles.map(c => c.low)),
    close: bucketCandles[bucketCandles.length - 1].close,
    volume: bucketCandles.reduce((sum, c) => sum + c.volume, 0),
  }));
}
```

**Parameters:**

- `marketId`: Market identifier
- `timeframe`: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`
- `limit`: Number of candles (max 1000)

**Response:**

```json
{
  "candles": [
    {
      "time": 1640995200,
      "open": 65000,
      "high": 65500,
      "low": 64500,
      "close": 65200,
      "volume": 1000
    }
  ],
  "marketId": "btc-usd-perp",
  "timeframe": "1d",
  "count": 1,
  "totalAvailable": 1000,
  "limited": false,
  "range": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T00:00:00Z"
  }
}
```

---

## Trading Data API

### Get Trading Statistics [#REF:STATS-API-HEX:0x53544154]

```http
GET /api/trades?type=stats
```

**URL Search Parameters:** None required (type=stats implied)

**Response:**

```json
{
  "stats": {
    "totalTrades": 1250, // Total executed trades
    "winRate": 0.55, // Win rate percentage (0-1)
    "sharpeRatio": 1.18, // Risk-adjusted return metric
    "totalRealizedPnl": 125000, // Total profit/loss in base currency
    "winningTrades": 687, // Number of profitable trades
    "losingTrades": 563, // Number of losing trades
    "avgWin": 245.56, // Average winning trade size
    "avgLoss": -189.34, // Average losing trade size
    "profitFactor": 1.42, // Gross profit / Gross loss ratio
    "maxDrawdown": -8500, // Maximum peak-to-valley decline
    "fundingPaid": -2500, // Total funding payments
    "fundingReceived": 0, // Total funding received
    "tradingDays": 180, // Active trading days
    "avgTradesPerDay": 6.94, // Average trades per day
    "avgHoldTime": 151200000, // Average position hold time (ms)
    "monthlyPnl": [
      // Monthly P&L breakdown
      {
        "month": "Dec 2024",
        "pnl": 15250,
        "funding": -125,
        "trades": 89
      }
    ]
  },
  "account": {
    "walletBalance": 118000, // Current wallet balance
    "marginBalance": 115250, // Margin account balance
    "availableMargin": 103000, // Available margin for new positions
    "unrealisedPnl": 0, // Unrealized P&L
    "realisedPnl": 115250 // Realized P&L
  }
}
```

**Calculation Notes** [#REF:CALC-NOTES-HEX:0x43414C43]:

- **Sharpe Ratio**: `(avg_return - risk_free_rate) / volatility` [#REF:SHARPE-HEX:0x53484152]
- **Profit Factor**: `total_wins / total_losses` (values >1 indicate profitability)
- **Win Rate**: `winning_trades / total_trades`
- **Fees**: Applied at 0.15% per trade (configurable) [#REF:FEE-RATE-HEX:0x46454553]

**Response:**

```json
{
  "stats": {
    "totalTrades": 1250,
    "winRate": 0.55,
    "sharpeRatio": 1.18,
    "totalRealizedPnl": 125000,
    "totalTrades": 1250,
    "winningTrades": 687,
    "losingTrades": 563,
    "avgWin": 245.56,
    "avgLoss": -189.34,
    "profitFactor": 1.42,
    "monthlyPnl": [...]
  },
  "account": {
    "walletBalance": 118000,
    "marginBalance": 115250,
    "availableMargin": 103000,
    "unrealisedPnl": 0,
    "realisedPnl": 115250
  }
}
```

### Get Equity Curve [#REF:EQUITY-API-HEX:0x45515549]

```http
GET /api/trades?type=equity&days=365
```

**URL Search Parameters:**

| Parameter | Type   | Default  | Range    | Description     | Hex Ref      |
| --------- | ------ | -------- | -------- | --------------- | ------------ |
| `type`    | string | required | `equity` | Endpoint type   | `0x54595045` |
| `days`    | number | `365`    | `7-730`  | Days of history | `0x44415953` |

**Response:**

```json
{
  "equityCurve": [
    {
      "date": "2024-01-01", // ISO date string (YYYY-MM-DD)
      "balance": 100000.0, // Account balance at end of day
      "pnl": 0.0 // Cumulative P&L to date
    },
    {
      "date": "2024-01-02",
      "balance": 100250.5,
      "pnl": 250.5
    }
  ]
}
```

**Generation Algorithm** [#REF:EQUITY-ALGO-HEX:0x45414C47]:

```javascript
function generateEquityCurve(days) {
  const curve = [];
  let balance = 100000; // Starting balance

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Simulate realistic daily returns with volatility
    const dailyReturn = (Math.random() - 0.48) * 0.05; // ~2% volatility
    balance *= 1 + dailyReturn;

    curve.push({
      date: date.toISOString().split('T')[0],
      balance: Math.round(balance * 100) / 100,
      pnl: Math.round((balance - 100000) * 100) / 100,
    });
  }

  return curve;
}
```

**Performance Note**: Reduces payload by 92% when using `days=30` vs default 365 [#REF:EQUITY-OPT-HEX:0x454F5054]

**Parameters:**

- `days`: Number of days (7-730, default 365)

**Response:**

```json
{
  "equityCurve": [
    {
      "date": "2024-01-01",
      "balance": 100000,
      "pnl": 0
    }
  ]
}
```

### Get Position Sessions [#REF:SESSIONS-API-HEX:0x53455353]

```http
GET /api/trades?type=sessions&page=1&limit=20
```

**URL Search Parameters:**

| Parameter | Type   | Default  | Range      | Description    | Hex Ref      |
| --------- | ------ | -------- | ---------- | -------------- | ------------ |
| `type`    | string | required | `sessions` | Endpoint type  | `0x54595045` |
| `page`    | number | `1`      | `1-N`      | Page number    | `0x50414745` |
| `limit`   | number | `20`     | `1-100`    | Items per page | `0x4C494D49` |

**Response:**

```json
{
  "sessions": [
    {
      "id": "session-1", // Session UUID
      "symbol": "btc-usd-perp", // Trading instrument
      "displaySymbol": "BTC/USD", // Human-readable symbol
      "side": "long", // Position direction
      "openTime": "2024-01-01T10:00:00Z", // Position open timestamp
      "closeTime": "2024-01-01T15:30:00Z", // Position close timestamp
      "durationMs": 19800000, // Position duration in milliseconds
      "maxSize": 10000, // Maximum position size
      "totalBought": 10000, // Total contracts bought
      "totalSold": 10000, // Total contracts sold
      "avgEntryPrice": 65000.0, // Average entry price
      "avgExitPrice": 65250.0, // Average exit price
      "realizedPnl": 2500.0, // Gross profit/loss
      "totalFees": 25.0, // Total trading fees
      "netPnl": 2475.0, // Net profit/loss (after fees)
      "tradeCount": 3, // Number of trades in session
      "trades": [], // Trade details (empty for list view)
      "status": "closed" // Session status
    }
  ],
  "total": 47, // Total sessions available
  "page": 1, // Current page
  "limit": 20 // Items per page
}
```

**P&L Calculation Algorithm** [#REF:PNL-ALGO-HEX:0x504E4C43]:

```javascript
function calculateSessionPnL(session) {
  const grossPnl =
    session.side === 'long'
      ? (session.avgExitPrice - session.avgEntryPrice) * session.totalSold
      : (session.avgEntryPrice - session.avgExitPrice) * session.totalBought;

  const fees = session.totalFees || grossPnl * 0.0015; // 0.15% fee rate
  const slippage = Math.abs(grossPnl) * 0.0002; // 0.02% slippage

  return {
    realizedPnl: grossPnl,
    totalFees: fees,
    netPnl: grossPnl - fees - slippage,
  };
}
```

**Session Grouping Logic** [#REF:SESSION-GROUP-HEX:0x53475250]:

- Groups consecutive trades of same direction
- Closes session on direction change or time threshold
- Calculates weighted average entry/exit prices
- Applies realistic fee structure (0.15% + 0.02% slippage)

**Parameters:**

- `page`: Page number (default 1)
- `limit`: Items per page (default 20)

**Response:**

```json
{
  "sessions": [
    {
      "id": "session-1",
      "symbol": "btc-usd-perp",
      "side": "long",
      "openTime": "2024-01-01T10:00:00Z",
      "closeTime": "2024-01-01T15:30:00Z",
      "realizedPnl": 2500,
      "netPnl": 2475,
      "tradeCount": 3
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

### Get Session Details

```http
GET /api/trades?sessionId=session-1
```

**Response:**

```json
{
  "session": {
    "id": "session-1",
    "symbol": "btc-usd-perp",
    "side": "long",
    "openTime": "2024-01-01T10:00:00Z",
    "closeTime": "2024-01-01T15:30:00Z",
    "trades": [
      {
        "id": "t1",
        "datetime": "2024-01-01T10:00:00Z",
        "side": "buy",
        "price": 65000,
        "amount": 1000,
        "cost": 65000000,
        "fee": { "cost": 650, "currency": "USD" }
      }
    ],
    "realizedPnl": 2500,
    "netPnl": 2475
  }
}
```

---

## Real-time WebSocket API [#REF:WS-API-HEX:0x57534150]

### Connection [#REF:WS-CONN-HEX:0x57434F4E]

```javascript
// Durable Objects WebSocket connection
const ws = new WebSocket('wss://your-worker.workers.dev/ws?key=user123');

// Connection timeout (30 seconds)
ws.onopen = () => {
  console.log('Connected to FeedHub DO');
  // Start ping/pong keepalive
  setInterval(() => ws.send(JSON.stringify({ type: 'ping' })), 30000);
};

ws.onerror = error => {
  console.error('WebSocket error:', error);
  // Fallback to polling after 3 failed attempts
};
```

### Subscribe to Feed [#REF:WS-SUB-HEX:0x57535542]

```javascript
ws.send(
  JSON.stringify({
    type: 'subscribe',
    key: 'user123', // Client identifier
    timestamp: Date.now(), // Subscription timestamp
  })
);
```

### Handle Messages [#REF:WS-MSG-HEX:0x574D5347]

```javascript
ws.onmessage = event => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'subscribed':
      console.log('Connected to DO FeedHub:', data.message);
      console.log('Active connections:', data.connections);
      break;

    case 'delta':
      // Surgical delta updates with checksum validation
      if (validateChecksum(data.changes, data.checksum)) {
        handleMarketUpdate(data.changes);
        console.log('Applied delta update:', data.changes.length, 'changes');
      } else {
        console.warn('Checksum validation failed, requesting full sync');
        requestFullSync();
      }
      break;

    case 'pong':
      // Keepalive response - update connection health
      lastPongTime = Date.now();
      break;

    case 'error':
      console.error('FeedHub error:', data.message);
      break;
  }
};
```

### Message Types [#REF:WS-TYPES-HEX:0x57545950]

| Message Type | Direction     | Description            | Payload                                  |
| ------------ | ------------- | ---------------------- | ---------------------------------------- |
| `subscribe`  | Client→Server | Subscribe to feed      | `{type, key, timestamp}`                 |
| `subscribed` | Server→Client | Subscription confirmed | `{type, key, message, connections}`      |
| `delta`      | Server→Client | Surgical updates       | `{type, changes[], checksum, timestamp}` |
| `ping`       | Client→Server | Keepalive              | `{type, timestamp}`                      |
| `pong`       | Server→Client | Keepalive response     | `{type, timestamp, connections}`         |
| `error`      | Server→Client | Error notification     | `{type, message, timestamp}`             |

### Connection Management [#REF:WS-MGMT-HEX:0x574D474D]

```javascript
class WebSocketManager {
  constructor(workerUrl, clientKey) {
    this.workerUrl = workerUrl;
    this.clientKey = clientKey;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1s, exponential backoff
  }

  connect() {
    this.ws = new WebSocket(`${this.workerUrl}/ws?key=${this.clientKey}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.subscribe();
      this.startKeepalive();
    };

    this.ws.onclose = event => {
      if (event.code !== 1000) {
        // Not a clean close
        this.handleReconnect();
      }
    };
  }

  subscribe() {
    this.ws.send(
      JSON.stringify({
        type: 'subscribe',
        key: this.clientKey,
        timestamp: Date.now(),
      })
    );
  }

  startKeepalive() {
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnectDelay *= 2; // Exponential backoff
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached, falling back to polling');
      this.enablePollingFallback();
    }
  }
}
```

### Subscribe to Feed

```javascript
ws.send(
  JSON.stringify({
    type: 'subscribe',
    key: 'user123',
  })
);
```

### Handle Messages

```javascript
ws.onmessage = event => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'subscribed':
      console.log('Connected:', data.message);
      break;

    case 'delta':
      // Handle market data updates
      console.log('Market update:', data.changes);
      break;

    case 'pong':
      // Keepalive response
      break;
  }
};
```

### Ping/Pong (Keepalive)

```javascript
ws.send(JSON.stringify({ type: 'ping' }));
```

---

## Polling Fallback API [#REF:POLL-API-HEX:0x504F4C4C]

### Get Feed Data [#REF:FEED-API-HEX:0x46454544]

```http
GET /v1/feed?key=user123&since=1640995200
```

**URL Search Parameters:**

| Parameter | Type   | Required | Description                            | Hex Ref      |
| --------- | ------ | -------- | -------------------------------------- | ------------ |
| `key`     | string | Yes      | Client identifier                      | `0x504B4559` |
| `since`   | number | No       | Unix timestamp for incremental updates | `0x5053494E` |

**Response:**

```json
{
  "type": "feed",
  "key": "user123",
  "timestamp": 1640995200000,
  "data": {
    "markets": [
      {
        "id": "btc-usd-perp",
        "displayName": "BTC/USD Perpetual",
        "category": "crypto",
        "status": "active",
        "lastUpdate": "2024-01-01T00:00:00Z"
      }
    ],
    "lastUpdate": "2024-01-01T00:00:00Z"
  },
  "checksum": "1deee103" // CRC32 checksum for data integrity
}
```

### ETag Caching [#REF:ETAG-CACHE-HEX:0x45544147]

**Request Headers:**

```
If-None-Match: "v1deee103"
```

**304 Response:**

```
HTTP/2 304 Not Modified
ETag: "v1deee103"
Cache-Control: public, max-age=30
```

**Cache Validation Algorithm** [#REF:CACHE-VALID-HEX:0x4356414C]:

```javascript
function validateETag(request, data) {
  const clientETag = request.headers.get('If-None-Match')?.replace(/"/g, '');
  const serverChecksum = crc32(JSON.stringify(data));
  const serverETag = `v${serverChecksum}`;

  if (clientETag === serverChecksum) {
    return {
      status: 304,
      headers: {
        ETag: `"${serverETag}"`,
        'Cache-Control': 'public, max-age=30',
      },
    };
  }

  return {
    status: 200,
    data,
    headers: {
      ETag: `"${serverETag}"`,
      'Cache-Control': 'public, max-age=30',
    },
  };
}
```

### Fallback Strategy [#REF:FALLBACK-HEX:0x46424B53]

1. **Primary**: WebSocket with Durable Objects (real-time)
2. **Secondary**: HTTP polling with ETag (near real-time)
3. **Tertiary**: Full data fetch (fallback)

```javascript
class ConnectionManager {
  constructor() {
    this.connectionState = 'disconnected'; // disconnected | websocket | polling | offline
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async connect() {
    try {
      // Try WebSocket first
      await this.tryWebSocket();
      this.connectionState = 'websocket';
    } catch (error) {
      console.warn('WebSocket failed, trying polling fallback');

      try {
        await this.tryPolling();
        this.connectionState = 'polling';
      } catch (error) {
        console.error('Polling failed, offline mode');
        this.connectionState = 'offline';
        this.scheduleReconnect();
      }
    }
  }

  async tryWebSocket() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);

      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error('WebSocket connection failed'));
      ws.onclose = () => reject(new Error('WebSocket closed immediately'));

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    });
  }

  async tryPolling() {
    const response = await fetch(`${this.httpUrl}/v1/feed?key=${this.clientKey}`);
    if (!response.ok) throw new Error('Polling request failed');
    return response.json();
  }
}
```

**RSS Reference**: Cloudflare Durable Objects updates at [blog.cloudflare.com/tag/durable-objects](https://blog.cloudflare.com/tag/durable-objects) [#REF:CF-DO-RSS]

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "timestamp": 1640995200000
}
```

**Common HTTP Status Codes:**

- `200`: Success
- `304`: Not Modified (ETag caching)
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

---

## Rate Limits

- **Workers**: 100,000 requests/day free tier
- **KV**: 10 million reads/month free
- **Durable Objects**: 1 million requests/month free

---

## SDK Examples

### JavaScript/TypeScript

```javascript
class TraderAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async getMarkets() {
    const response = await fetch(`${this.baseURL}/api/markets`);
    return response.json();
  }

  async getTrades(type, params = {}) {
    const url = new URL(`${this.baseURL}/api/trades`);
    url.searchParams.set('type', type);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url);
    return response.json();
  }

  connectWebSocket(key) {
    return new WebSocket(`${this.baseURL.replace('http', 'ws')}/ws?key=${key}`);
  }
}
```

### Python

```python
import requests
import websocket
import json

class TraderAPI:
    def __init__(self, base_url):
        self.base_url = base_url

    def get_markets(self):
        response = requests.get(f"{self.base_url}/api/markets")
        return response.json()

    def get_trades(self, trade_type, **params):
        params['type'] = trade_type
        response = requests.get(f"{self.base_url}/api/trades", params=params)
        return response.json()

    def connect_websocket(self, key):
        ws = websocket.WebSocket()
        ws.connect(f"{self.base_url.replace('http', 'ws')}/ws?key={key}")
        return ws
```

---

## Changelog

### v0.1.15

- Complete Cloudflare Workers migration
- WebSocket DO foundation
- ETag caching implementation
- Global edge deployment

### v0.1.14

- Trades API migration
- P&L calculations
- Session management

### v0.1.13

- OHLCV aggregation
- Timeframe support
- Pagination

### v0.1.12

- Markets API migration
- ETag caching
- Basic Worker setup

---

## Technical References [#REF:TECH-REFS-HEX:0x54455245]

### Hex Code Reference Table

| Component          | Hex Code     | Description               |
| ------------------ | ------------ | ------------------------- |
| API Version        | `0x41504956` | API versioning system     |
| CRC32 Checksum     | `0x43524333` | Data integrity validation |
| ETag Caching       | `0x45544147` | HTTP caching headers      |
| Durable Objects    | `0x444F424A` | Cloudflare DO system      |
| WebSocket          | `0x57533243` | Real-time communication   |
| Timeframe          | `0x54464D45` | OHLCV aggregation periods |
| P&L Calculation    | `0x504E4C43` | Profit/loss algorithms    |
| Session Management | `0x53455353` | Position session handling |

### RSS Feed References

- **Bun Runtime**: [bun.com/blog/rss.xml](https://bun.com/blog/rss.xml) [#REF:BUN-RSS]
- **Cloudflare Workers**: [blog.cloudflare.com/rss](https://blog.cloudflare.com/rss/) [#REF:CF-RSS]
- **Durable Objects**: [blog.cloudflare.com/tag/durable-objects](https://blog.cloudflare.com/tag/durable-objects) [#REF:CF-DO-RSS]

### Algorithm References

**CRC32 Implementation** [#REF:CRC32-ALGO-HEX:0x43524341]:

```javascript
// CRC32 polynomial: 0xEDB88320
const CRC32_TABLE = new Uint32Array(256);
// Table initialization and calculation logic
```

**OHLCV Aggregation** [#REF:OHLCV-AGG-HEX:0x4F414747]:

- Time bucket grouping by target timeframe
- OHLC calculation: Open(first), High(max), Low(min), Close(last)
- Volume summation across bucket

**P&L Calculation** [#REF:PNL-CALC-HEX:0x5043414C]:

- Gross P&L: Direction-based price differential × quantity
- Fees: 0.15% of gross P&L
- Slippage: 0.02% of gross P&L magnitude
- Net P&L: Gross - Fees - Slippage

---

## Changelog

### v0.1.15 (Current) - Enhanced Documentation & Technical References

**Release Date:** December 3, 2025

#### 📚 Documentation Enhancements

- Added comprehensive [#REF] tags throughout documentation
- Included hex code references for all components
- Added RSS feed references from [bun.com/blog](https://bun.com/blog) and Cloudflare [#REF:BUN-BLOG]
- Detailed URL search parameter documentation
- Technical algorithm references and implementations

#### 🔧 Technical Improvements

- Enhanced API documentation with parameter tables
- Added algorithm pseudocode for key functions
- Included performance optimization notes
- Comprehensive error handling documentation

#### 📡 API Enhancements

- Detailed WebSocket message type documentation
- ETag caching algorithm documentation
- Polling fallback strategy documentation
- Connection management code examples

### v0.1.14

- Trades API migration with P&L calculations
- Session management and pagination
- Frontend integration updates

### v0.1.13

- OHLCV aggregation with timeframe support
- Complex data processing algorithms
- Pagination implementation

### v0.1.12

- Markets API migration with ETag caching
- Basic Cloudflare Workers setup
- Global edge deployment foundation
