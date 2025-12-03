import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../lib/api-headers';

// Map display symbols to BitMEX symbols
const SYMBOL_MAP: Record<string, string> = {
  BTCUSD: 'XBTUSD',
  ETHUSD: 'ETHUSD',
  XBTUSD: 'XBTUSD',
};

// Timeframe in minutes
const TIMEFRAME_MINUTES: Record<string, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080,
};

// Map timeframe to the source file we should read
const TIMEFRAME_SOURCE: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '5m',
  '30m': '5m',
  '1h': '1h',
  '4h': '1h',
  '1d': '1d',
  '1w': '1d',
};

interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CSVRecord {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

// Cache for loaded data
const dataCache = new Map<string, { candles: OHLCVCandle[]; loadedAt: number; etag: string }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Generate ETag for candles
function generateCandlesETag(candles: OHLCVCandle[]): string {
  if (candles.length === 0) return '"empty"';
  const first = candles[0];
  const last = candles[candles.length - 1];
  return `"${candles.length}-${first.time}-${last.time}-${last.close}"`;
}

// Stream-read large CSV files efficiently
function loadLocalOHLCV(
  symbol: string,
  sourceTimeframe: string
): { candles: OHLCVCandle[]; etag: string } | null {
  const cacheKey = `${symbol}_${sourceTimeframe}`;
  const cached = dataCache.get(cacheKey);

  // Return cached data if fresh
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
    console.log(`Using cached data for ${cacheKey}: ${cached.candles.length} candles`);
    return { candles: cached.candles, etag: cached.etag };
  }

  const dataDir = path.join(process.cwd(), 'data', 'ohlcv');
  const filename = path.join(dataDir, `${symbol}_${sourceTimeframe}.csv`);

  if (!fs.existsSync(filename)) {
    console.log(`Local OHLCV file not found: ${filename}`);
    return null;
  }

  console.log(`Loading OHLCV from: ${filename}`);
  const startTime = Date.now();

  try {
    const content = fs.readFileSync(filename, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
    });

    const candles: OHLCVCandle[] = [];

    for (const r of records as CSVRecord[]) {
      const time = Math.floor(new Date(r.timestamp).getTime() / 1000);
      const open = parseFloat(r.open);
      const high = parseFloat(r.high);
      const low = parseFloat(r.low);
      const close = parseFloat(r.close);
      const volume = parseFloat(r.volume) || 0;

      if (!isNaN(open) && !isNaN(close) && !isNaN(time)) {
        candles.push({ time, open, high, low, close, volume });
      }
    }

    // Sort by time
    candles.sort((a, b) => a.time - b.time);

    const loadTime = Date.now() - startTime;
    console.log(`Loaded ${candles.length} candles in ${loadTime}ms`);

    const etag = generateCandlesETag(candles);

    // Cache the data
    dataCache.set(cacheKey, { candles, loadedAt: Date.now(), etag });

    return { candles, etag };
  } catch (error) {
    console.error(`Error loading local OHLCV: ${error}`);
    return null;
  }
}

// Aggregate candles to larger timeframes
function aggregateCandles(
  candles: OHLCVCandle[],
  targetMinutes: number,
  sourceMinutes: number
): OHLCVCandle[] {
  if (candles.length === 0) return [];

  const ratio = Math.round(targetMinutes / sourceMinutes);
  if (ratio <= 1) return candles;

  const bucketSeconds = targetMinutes * 60;
  const buckets = new Map<number, OHLCVCandle[]>();

  // Group candles by bucket
  for (const candle of candles) {
    const bucketTime = Math.floor(candle.time / bucketSeconds) * bucketSeconds;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, []);
    }
    buckets.get(bucketTime)!.push(candle);
  }

  // Aggregate each bucket
  const result: OHLCVCandle[] = [];

  for (const [bucketTime, candlesInBucket] of buckets) {
    if (candlesInBucket.length === 0) continue;

    // Sort by time
    candlesInBucket.sort((a, b) => a.time - b.time);

    result.push({
      time: bucketTime,
      open: candlesInBucket[0].open,
      high: Math.max(...candlesInBucket.map(c => c.high)),
      low: Math.min(...candlesInBucket.map(c => c.low)),
      close: candlesInBucket[candlesInBucket.length - 1].close,
      volume: candlesInBucket.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  // Sort by time
  result.sort((a, b) => a.time - b.time);

  return result;
}

// Maximum candles to return based on timeframe
const MAX_CANDLES: Record<string, number> = {
  '1m': 10000,
  '5m': 10000,
  '15m': 10000,
  '30m': 10000,
  '1h': 50000,
  '4h': 50000,
  '1d': 50000,
  '1w': 50000,
};

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const displaySymbol = searchParams.get('symbol') || 'BTCUSD';
  const timeframe = searchParams.get('timeframe') || '1d';
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  try {
    const bitmexSymbol = SYMBOL_MAP[displaySymbol] || displaySymbol;
    const sourceTimeframe = TIMEFRAME_SOURCE[timeframe] || timeframe;
    const targetMinutes = TIMEFRAME_MINUTES[timeframe] || 1440;
    const sourceMinutes = TIMEFRAME_MINUTES[sourceTimeframe] || targetMinutes;

    // Load from local file
    const loaded = loadLocalOHLCV(bitmexSymbol, sourceTimeframe);

    if (!loaded || loaded.candles.length === 0) {
      const { body, init } = createErrorResponse(
        `No OHLCV data found for ${displaySymbol} ${timeframe}`,
        404,
        undefined,
        request
      );
      return NextResponse.json(body, init);
    }

    let { candles, etag } = loaded;

    // Check If-None-Match for 304 response
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      });
    }

    // Aggregate if needed
    if (targetMinutes !== sourceMinutes) {
      console.log(`Aggregating from ${sourceMinutes}m to ${targetMinutes}m...`);
      candles = aggregateCandles(candles, targetMinutes, sourceMinutes);
      etag = generateCandlesETag(candles);
    }

    // Apply time range filter if provided
    if (startParam || endParam) {
      const startTime = startParam ? parseInt(startParam) : 0;
      const endTime = endParam ? parseInt(endParam) : Infinity;
      candles = candles.filter(c => c.time >= startTime && c.time <= endTime);
    }

    // Limit the number of candles
    const maxCandles = MAX_CANDLES[timeframe] || 10000;
    const totalCandles = candles.length;

    if (candles.length > maxCandles) {
      candles = candles.slice(-maxCandles);
      console.log(`Limited from ${totalCandles} to ${candles.length} candles for ${timeframe}`);
    }

    console.log(`Returning ${candles.length} candles for ${displaySymbol} ${timeframe}`);

    const result = {
      candles,
      symbol: displaySymbol,
      timeframe,
      count: candles.length,
      totalAvailable: totalCandles,
      limited: totalCandles > maxCandles,
      range:
        candles.length > 0
          ? {
              start: new Date(candles[0].time * 1000).toISOString(),
              end: new Date(candles[candles.length - 1].time * 1000).toISOString(),
            }
          : null,
    };

    const headers = buildApiHeaders({
      cache: 'medium',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        ETag: etag,
        'X-Data-Type': 'ohlcv',
        'X-Symbol': displaySymbol,
        'X-Timeframe': timeframe,
        'X-Candle-Count': String(candles.length),
        'X-Total-Available': String(totalCandles),
        'X-Data-Limited': String(totalCandles > maxCandles),
        'X-Cache-Status': loaded ? 'HIT' : 'MISS',
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('OHLCV API Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to fetch OHLCV data',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
