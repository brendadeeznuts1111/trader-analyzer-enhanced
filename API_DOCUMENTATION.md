# Cloudflare Workers API Documentation

## Overview

The Trader Analyzer API is now fully hosted on Cloudflare Workers, providing global edge deployment with sub-50ms latency worldwide. All endpoints support ETag caching for efficient bandwidth usage.

## Base URL

```
Production: https://trader-analyzer-markets.utahj4754.workers.dev
Staging:    https://trader-analyzer-markets-staging.utahj4754.workers.dev
Local:      http://localhost:8788
```

## Authentication

Currently no authentication required. All endpoints are public for demo purposes.

## Response Format

All responses are JSON with consistent structure:

```json
{
  "data": "...",
  "timestamp": 1640995200000,
  "cached": false
}
```

## Caching

All endpoints support HTTP ETag caching:

- Send `If-None-Match: "etag-value"` header
- Receive `304 Not Modified` for unchanged data
- Cache TTL: 5 minutes for dynamic data, 30 seconds for real-time

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

### Get OHLCV Data

```http
GET /api/markets/{marketId}/ohlcv?timeframe=1d&limit=100
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

### Get Trading Statistics

```http
GET /api/trades?type=stats
```

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

### Get Equity Curve

```http
GET /api/trades?type=equity&days=365
```

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

### Get Position Sessions

```http
GET /api/trades?type=sessions&page=1&limit=20
```

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

## Real-time WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://your-worker.workers.dev/ws?key=user123');
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

## Polling Fallback API

### Get Feed Data

```http
GET /v1/feed?key=user123&since=1640995200
```

**Parameters:**

- `key`: Client identifier
- `since`: Unix timestamp for incremental updates

**Response:**

```json
{
  "type": "feed",
  "key": "user123",
  "timestamp": 1640995200000,
  "data": {
    "markets": [...],
    "lastUpdate": "2024-01-01T00:00:00Z"
  },
  "checksum": "abc123def456"
}
```

**Caching:** Returns `304 Not Modified` with ETag when no changes.

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
