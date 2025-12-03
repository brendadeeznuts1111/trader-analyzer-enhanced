/**
 * Exchange Management API
 * Handles exchange configuration, selection, and operations
 */

import { NextResponse } from 'next/server';
import { exchangeManager } from '../../../lib/exchanges/exchange_manager';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../lib/api-headers';

/**
 * Initialize exchange manager on first request
 */
function initializeExchangeManager() {
  if (!exchangeManager.isInitialized()) {
    exchangeManager.initialize();
  }
}

/**
 * GET /api/exchanges - Get available exchanges and configurations
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    initializeExchangeManager();

    const availableExchanges = exchangeManager.getAvailableExchanges();
    const exchangeConfigs = exchangeManager.getAllExchangeConfigs();

    const result = {
      success: true,
      availableExchanges,
      exchangeConfigs: Object.fromEntries(exchangeConfigs),
    };

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: result,
      custom: {
        'X-Data-Type': 'exchanges',
        'X-Exchange-Count': String(availableExchanges.length),
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    console.error('Exchange GET API Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to get exchange information',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}

/**
 * POST /api/exchanges - Set active exchange and perform operations
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    initializeExchangeManager();

    const body = await request.json();

    // Validate request
    if (!body || typeof body !== 'object') {
      const { body: errBody, init } = createErrorResponse(
        'Invalid request body',
        400,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    // Handle different operation types
    if (body.operation === 'set_active_exchange') {
      return await handleSetActiveExchange(body, request, startTime);
    } else if (body.operation === 'get_market_data') {
      return await handleGetMarketData(body, request, startTime);
    } else if (body.operation === 'place_order') {
      return await handlePlaceOrder(body, request, startTime);
    } else if (body.operation === 'get_balance') {
      return await handleGetBalance(request, startTime);
    } else if (body.operation === 'check_health') {
      return await handleCheckHealth(request, startTime);
    } else if (body.operation === 'get_statistics') {
      return await handleGetStatistics(request, startTime);
    } else {
      const { body: errBody, init } = createErrorResponse(
        'Invalid operation type',
        400,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }
  } catch (error) {
    console.error('Exchange POST API Error:', error);
    const { body, init } = createErrorResponse(
      'Failed to process exchange request',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}

/**
 * Handle setting active exchange
 */
async function handleSetActiveExchange(body: any, request: Request, startTime: number) {
  try {
    if (!body.exchange || !body.credentials) {
      const { body: errBody, init } = createErrorResponse(
        'Exchange name and credentials are required',
        400,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    await exchangeManager.setActiveExchange(body.exchange, body.credentials);

    const result = {
      success: true,
      message: `Exchange ${body.exchange} set as active`,
      activeExchange: body.exchange,
    };

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Operation': 'set_active_exchange',
        'X-Exchange': body.exchange,
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    const { body: errBody, init } = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to set active exchange',
      400,
      undefined,
      request
    );
    return NextResponse.json(errBody, init);
  }
}

/**
 * Handle getting market data
 */
async function handleGetMarketData(body: any, request: Request, startTime: number) {
  try {
    if (!body.symbol) {
      const { body: errBody, init } = createErrorResponse(
        'Symbol is required',
        400,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    const marketData = await exchangeManager.fetchMarketData(body.symbol);

    const result = {
      success: true,
      marketData,
    };

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: marketData,
      custom: {
        'X-Operation': 'get_market_data',
        'X-Symbol': body.symbol,
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    const { body: errBody, init } = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get market data',
      400,
      undefined,
      request
    );
    return NextResponse.json(errBody, init);
  }
}

/**
 * Handle placing an order
 */
async function handlePlaceOrder(body: any, request: Request, startTime: number) {
  try {
    if (!body.orderParams) {
      const { body: errBody, init } = createErrorResponse(
        'Order parameters are required',
        400,
        undefined,
        request
      );
      return NextResponse.json(errBody, init);
    }

    const orderResult = await exchangeManager.placeOrder(body.orderParams);

    const result = {
      success: true,
      orderResult,
    };

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Operation': 'place_order',
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    const { body: errBody, init } = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to place order',
      400,
      undefined,
      request
    );
    return NextResponse.json(errBody, init);
  }
}

/**
 * Handle getting account balance
 */
async function handleGetBalance(request: Request, startTime: number) {
  try {
    const balance = await exchangeManager.fetchBalance();

    const result = {
      success: true,
      balance,
    };

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: balance,
      custom: {
        'X-Operation': 'get_balance',
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    const { body: errBody, init } = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get balance',
      400,
      undefined,
      request
    );
    return NextResponse.json(errBody, init);
  }
}

/**
 * Handle checking exchange health
 */
async function handleCheckHealth(request: Request, startTime: number) {
  try {
    const healthStatus = await exchangeManager.checkAllExchangeHealth();

    const result = {
      success: true,
      healthStatus: Object.fromEntries(healthStatus),
    };

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Operation': 'check_health',
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    const { body: errBody, init } = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to check exchange health',
      400,
      undefined,
      request
    );
    return NextResponse.json(errBody, init);
  }
}

/**
 * Handle getting exchange statistics
 */
async function handleGetStatistics(request: Request, startTime: number) {
  try {
    const statistics = await exchangeManager.getAllExchangeStatistics();

    const result = {
      success: true,
      statistics: Object.fromEntries(statistics),
    };

    const headers = buildApiHeaders({
      cache: 'short',
      request,
      responseTime: Date.now() - startTime,
      etagContent: Object.fromEntries(statistics),
      custom: {
        'X-Operation': 'get_statistics',
      },
    });

    return NextResponse.json(result, {
      headers: headersToObject(headers),
    });
  } catch (error) {
    const { body: errBody, init } = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get exchange statistics',
      400,
      undefined,
      request
    );
    return NextResponse.json(errBody, init);
  }
}
