import { Blueprint } from './types';

export const TRADING_BLUEPRINTS: Blueprint[] = [
  {
    id: 'BP-TRADING-STRATEGY',
    version: '1.0.0',
    root: 'ROOT-STRATEGY-BASE',
    properties: {
      name: { value: '', type: 'string', constraints: 'required' },
      type: { value: 'scalping', type: 'string', constraints: 'required' },
      risk: { value: 'medium', type: 'string', constraints: 'required' },
      leverage: { value: 1, type: 'number', constraints: 'positive' },
      timeframe: { value: '1m', type: 'string' },
      indicators: { value: [], type: 'array' },
      conditions: { value: {}, type: 'object' },
    },
    hierarchy: '1.1.A.1',
  },
  {
    id: 'BP-TRADING-INDICATOR',
    version: '1.0.0',
    root: 'ROOT-INDICATOR-BASE',
    properties: {
      name: { value: '', type: 'string', constraints: 'required' },
      type: { value: 'technical', type: 'string' },
      parameters: { value: {}, type: 'object' },
      timeframe: { value: '1m', type: 'string' },
      source: { value: 'close', type: 'string' },
    },
    hierarchy: '1.2.A.1',
  },
  {
    id: 'BP-TRADING-POSITION',
    version: '1.0.0',
    root: 'ROOT-POSITION-BASE',
    properties: {
      symbol: { value: '', type: 'string', constraints: 'required' },
      side: { value: 'long', type: 'string', constraints: 'required' },
      size: { value: 0, type: 'number', constraints: 'positive' },
      entryPrice: { value: 0, type: 'number', constraints: 'positive' },
      stopLoss: { value: 0, type: 'number', constraints: 'positive' },
      takeProfit: { value: 0, type: 'number', constraints: 'positive' },
      status: { value: 'open', type: 'string' },
    },
    hierarchy: '1.3.A.1',
  },
  {
    id: 'BP-TRADING-PORTFOLIO',
    version: '1.0.0',
    root: 'ROOT-PORTFOLIO-BASE',
    properties: {
      name: { value: '', type: 'string', constraints: 'required' },
      totalValue: { value: 0, type: 'number', constraints: 'positive' },
      positions: { value: [], type: 'array' },
      cash: { value: 0, type: 'number', constraints: 'positive' },
      currency: { value: 'USD', type: 'string' },
      lastUpdated: { value: '', type: 'string' },
    },
    hierarchy: '1.4.A.1',
  },
  {
    id: 'BP-TRADING-RISK-MANAGER',
    version: '1.0.0',
    root: 'ROOT-RISK-BASE',
    properties: {
      maxPositionSize: { value: 1000, type: 'number', constraints: 'positive' },
      maxLeverage: { value: 10, type: 'number', constraints: 'positive' },
      maxDrawdown: { value: 0.2, type: 'number', constraints: 'positive' },
      stopLossPercentage: { value: 0.02, type: 'number', constraints: 'positive' },
      maxPositions: { value: 5, type: 'number', constraints: 'positive' },
    },
    hierarchy: '1.5.A.1',
  },
];

export const UI_BLUEPRINTS: Blueprint[] = [
  {
    id: 'BP-UI-COMPONENT',
    version: '1.0.0',
    root: 'ROOT-COMPONENT-001',
    properties: {
      base: { value: '', type: 'string', constraints: 'required' },
      styles: { value: {}, type: 'object', inherit: 'parent', override: 'merge' },
      behavior: { value: {}, type: 'object', chain: 'default-behavior' },
      layout: { value: 'flex', type: 'string' },
      theme: { value: 'light', type: 'string' },
    },
    hierarchy: '2.1.A.1',
  },
  {
    id: 'BP-UI-CHART',
    version: '1.0.0',
    root: 'ROOT-CHART-BASE',
    properties: {
      type: { value: 'candlestick', type: 'string' },
      timeframe: { value: '1m', type: 'string' },
      indicators: { value: [], type: 'array' },
      colors: { value: {}, type: 'object' },
      interactions: { value: {}, type: 'object' },
    },
    hierarchy: '2.2.A.1',
  },
  {
    id: 'BP-UI-FORM',
    version: '1.0.0',
    root: 'ROOT-FORM-BASE',
    properties: {
      fields: { value: [], type: 'array' },
      validation: { value: {}, type: 'object' },
      submission: { value: {}, type: 'object' },
      layout: { value: 'vertical', type: 'string' },
    },
    hierarchy: '2.3.A.1',
  },
];

export const API_BLUEPRINTS: Blueprint[] = [
  {
    id: 'BP-API-ENDPOINT',
    version: '1.0.0',
    root: 'ROOT-API-BASE',
    properties: {
      method: { value: 'GET', type: 'string', constraints: 'required' },
      path: { value: '', type: 'string', constraints: 'required' },
      authentication: { value: 'none', type: 'string' },
      rateLimit: { value: 100, type: 'number', constraints: 'positive' },
      timeout: { value: 30000, type: 'number', constraints: 'positive' },
      parameters: { value: {}, type: 'object' },
      responses: { value: {}, type: 'object' },
    },
    hierarchy: '3.1.A.1',
  },
  {
    id: 'BP-API-CLIENT',
    version: '1.0.0',
    root: 'ROOT-CLIENT-BASE',
    properties: {
      baseUrl: { value: '', type: 'string', constraints: 'required' },
      apiKey: { value: '', type: 'string' },
      version: { value: 'v1', type: 'string' },
      timeout: { value: 30000, type: 'number', constraints: 'positive' },
      retries: { value: 3, type: 'number', constraints: 'positive' },
    },
    hierarchy: '3.2.A.1',
  },
];

// [[TECH][GLOBAL][BLUEPRINT][META:{blueprint-id=BP-EXCHANGE-POLYMARKET;version=0.1.0;root=ROOT-API-CLIENT;status=active}]]
export const EXCHANGE_BLUEPRINTS: Blueprint[] = [
  {
    id: 'BP-EXCHANGE-POLYMARKET',
    version: '0.1.0',
    root: 'ROOT-API-CLIENT',
    properties: {
      baseUrl: {
        value: 'https://clob.polymarket.com',
        type: 'string',
        constraints: 'required',
        root: 'ROOT-URL-CLOB',
      },
      auth: {
        value: { apiKey: 'ORCA_PM_APIKEY', signer: 'ed25519' },
        type: 'object',
        chain: 'BP-SIGN-REQUEST,BP-RATE-LIMIT',
      },
      endpoints: {
        value: {
          markets: '/markets',
          orders: '/orders',
          trades: '/trades',
          orderbook: '/orderbook/{market}',
        },
        type: 'object',
        root: 'ROOT-ENDPOINT-MAP',
      },
      rateLimit: {
        value: { requests: 10, window: '1s' },
        type: 'object',
        root: 'ROOT-RATE-THROTTLE',
      },
      errorHandling: {
        value: { retry: 3, backoff: 'exp', codes: [429, 502] },
        type: 'object',
        override: 'true',
        root: 'ROOT-ERROR-STRATEGY',
      },
      compression: {
        value: 'gzip',
        type: 'string',
        inherit: 'BP-RUNTIME-BUN/streams',
      },
      marketNormalizer: {
        value: { uuid: 'v5-namespace', format: 'ORCA-canonical' },
        type: 'object',
        chain: 'BP-NORMALIZE-ODDS,BP-MERGE-BOOKS',
        root: 'ROOT-UUID-TAXONOMY',
      },
      dataTypes: {
        value: {
          order: { type: 'limit', fields: ['price', 'size', 'side'] },
          trade: { type: 'fill', fields: ['timestamp', 'volume'] },
        },
        type: 'object',
        root: 'ROOT-SCHEMA-JSON',
      },
    },
    hierarchy: '0.1.0.EXCHANGE.CLIENT.1.0.A.1.1',
    backLinks: {
      root: 'ROOT-API-CLIENT',
      dependencies: ['BP-RUNTIME-BUN@1.3.3', 'BP-UUID-V5'],
    },
  },
  {
    id: 'BP-RUNTIME-BUN',
    version: '1.3.3',
    root: 'ROOT-ENGINE-JSC',
    properties: {
      streams: { value: 'gzip,deflate,brotli,zstd', type: 'string', root: 'ROOT-COMPRESS-001' },
      standalone: { value: 'deterministic', type: 'string', inherit: 'build', override: 'true' },
      test: { value: 'retry,repeats', type: 'string', root: 'ROOT-TEST-FLAKE' },
      env: { value: 'no-auto-load', type: 'string' },
      sqlite: { value: '3.51.0', type: 'string', root: 'ROOT-DB-ENGINE' },
      zig: { value: '0.15.2', type: 'string', root: 'ROOT-BUILD-TREE' },
      bundler: { value: 'panic-free', type: 'string' },
      install: { value: 'stable-peers', type: 'string' },
      windows: {
        value: 'resize-signal,getcompletes,hibernate-safe',
        type: 'string',
        root: 'ROOT-WIN-TERM',
      },
      node: { value: '_handle.fd,n-api', type: 'string' },
      webapi: { value: 'formdata-stringify,blob-stream,leak-free', type: 'string' },
      serve: { value: 'unicode-ctype', type: 'string', root: 'ROOT-SERVE-001' },
      networking: { value: 'leak-free', type: 'string', inherit: 'prior', override: 'true' },
      yaml: { value: 'o-n-parse', type: 'string', chain: 'BP-YAML-1.3.2,FIX-LEADING-ZERO' },
      transpiler: { value: 'crash-proof', type: 'string', root: 'ROOT-TS-TRANSPILE' },
      spawn: { value: 'fd-stable', type: 'string' },
      types: { value: 'extended-loader', type: 'string' },
      security: { value: 'nss-3.117', type: 'string', root: 'ROOT-CERT-CHAIN' },
      upgrade: { value: 'human-sizes', type: 'string' },
    },
    hierarchy: '1.3.3.RUNTIME.ENGINE.1.0.A.1.1',
  },
  {
    id: 'BP-INTEGRATION-POLY',
    version: '0.1.0',
    root: 'ROOT-EXCHANGE-PIPELINE',
    properties: {
      selector: {
        value: 'UUID-dropdown',
        type: 'string',
        chain: 'BP-POLY-MARKETS,BP-NORMALIZE',
        root: 'ROOT-MARKET-UI',
      },
      pipeline: {
        value: 'fetch-sign-throttle-cache',
        type: 'string',
        root: 'ROOT-DATA-FLOW',
      },
      metrics: {
        value: { latency: 'p95<150ms', errors: '<0.1%', cache: 'hit>80%' },
        type: 'object',
      },
    },
    hierarchy: '0.1.0.INTEGRATION.EXCHANGE.1.0.A.1.1',
  },
  {
    id: 'BP-WS-OPTIMIZATION',
    version: '0.1.0',
    root: 'ROOT-WS-OPT',
    properties: {
      websocket: {
        value: 'deflate-pubsub-cork',
        type: 'string',
        chain: 'BP-BACKPRESSURE,BP-BATCH-SEND',
        root: 'ROOT-WS-OPT',
      },
      compression: {
        value: { perMessageDeflate: true, formats: ['gzip', 'deflate', 'brotli', 'zstd'] },
        type: 'object',
        inherit: 'BP-RUNTIME-BUN/streams',
        root: 'ROOT-COMPRESS-001',
      },
      pubsub: {
        value: { topic: 'global', publishToSelf: false },
        type: 'object',
        root: 'ROOT-BROADCAST',
      },
      backpressure: {
        value: { limit: 1048576, closeOnLimit: true, drainCallback: true },
        type: 'object',
        root: 'ROOT-FLOW-CONTROL',
      },
      cork: {
        value: { enabled: true, latencyTarget: 1 },
        type: 'object',
        root: 'ROOT-LATENCY-OPT',
      },
      limits: {
        value: { idleTimeout: 30, maxPayloadLength: 8388608 },
        type: 'object',
      },
      metrics: {
        value: { latencyTarget: 92, throughputMultiplier: 3.2, bandwidthReduction: 0.62 },
        type: 'object',
      },
    },
    hierarchy: '0.1.0.WS.OPTIMIZATION.1.0.A.1.1',
    backLinks: {
      root: 'ROOT-WS-OPT',
      dependencies: ['BP-RUNTIME-BUN@1.3.3', 'BP-BACKPRESSURE', 'BP-BATCH-SEND'],
    },
  },
];

export const ALL_BLUEPRINTS: Blueprint[] = [
  ...TRADING_BLUEPRINTS,
  ...UI_BLUEPRINTS,
  ...API_BLUEPRINTS,
  ...EXCHANGE_BLUEPRINTS,
];

// Example usage instances
export const EXAMPLE_INSTANCES = [
  {
    notation:
      '[[TRADING][MODULE][INSTANCE][META:{blueprint=BP-TRADING-STRATEGY@1.0.0;instance-id=STRAT-SCALP-001;version=1.2.1;root=ROOT-STRATEGY-BASE}][PROPERTIES:{name="Quick Scalp";type=scalping;risk=high;leverage=5;timeframe=1m}][CLASS:ScalpingStrategy][#REF:v-1.2.1.TRAD.STRAT.1.0.A.1.1.INST.2.1][@BLUEPRINT:BP-TRADING-STRATEGY@^1.0.0]]',
    description: 'High-frequency scalping strategy',
  },
  {
    notation:
      '[[UI][MODULE][INSTANCE][META:{blueprint=BP-UI-CHART@1.0.0;instance-id=CHART-PRICE-001;version=1.0.0;root=ROOT-CHART-BASE}][PROPERTIES:{type=candlestick;timeframe=5m;indicators=["SMA","RSI"];colors={bullish:"#00ff00";bearish:"#ff0000"}}][CLASS:PriceChart][#REF:v-1.0.0.UI.CHART.1.0.A.1.1.INST.1.0][@BLUEPRINT:BP-UI-CHART@^1.0.0]]',
    description: 'Price chart with technical indicators',
  },
  {
    notation:
      '[[API][GLOBAL][INSTANCE][META:{blueprint=BP-API-CLIENT@1.0.0;instance-id=CLIENT-BITMEX-001;version=1.1.0;root=ROOT-CLIENT-BASE}][PROPERTIES:{baseUrl="https://api.bitmex.com";apiKey="xxx";version=v2;timeout=45000;retries=5}][CLASS:BitmexClient][#REF:v-1.1.0.API.CLIENT.1.0.A.1.1.INST.1.1][@BLUEPRINT:BP-API-CLIENT@^1.0.0]]',
    description: 'BitMEX API client configuration',
  },
];
