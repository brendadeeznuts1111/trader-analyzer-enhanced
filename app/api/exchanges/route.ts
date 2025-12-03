/**
 * Exchange Management API
 * Handles exchange configuration, selection, and operations
 */

import { NextResponse } from 'next/server';
import { exchangeManager } from '../../../lib/exchanges/exchange_manager';

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
export async function GET() {
    try {
        initializeExchangeManager();

        const availableExchanges = exchangeManager.getAvailableExchanges();
        const exchangeConfigs = exchangeManager.getAllExchangeConfigs();

        return NextResponse.json({
            success: true,
            availableExchanges,
            exchangeConfigs: Object.fromEntries(exchangeConfigs)
        });
    } catch (error) {
        console.error('Exchange GET API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get exchange information' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/exchanges - Set active exchange and perform operations
 */
export async function POST(request: Request) {
    try {
        initializeExchangeManager();

        const body = await request.json();

        // Validate request
        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 }
            );
        }

        // Handle different operation types
        if (body.operation === 'set_active_exchange') {
            return await handleSetActiveExchange(body);
        } else if (body.operation === 'get_market_data') {
            return await handleGetMarketData(body);
        } else if (body.operation === 'place_order') {
            return await handlePlaceOrder(body);
        } else if (body.operation === 'get_balance') {
            return await handleGetBalance(body);
        } else if (body.operation === 'check_health') {
            return await handleCheckHealth(body);
        } else if (body.operation === 'get_statistics') {
            return await handleGetStatistics(body);
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid operation type' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Exchange POST API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process exchange request' },
            { status: 500 }
        );
    }
}

/**
 * Handle setting active exchange
 */
async function handleSetActiveExchange(body: any) {
    try {
        if (!body.exchange || !body.credentials) {
            return NextResponse.json(
                { success: false, error: 'Exchange name and credentials are required' },
                { status: 400 }
            );
        }

        await exchangeManager.setActiveExchange(body.exchange, body.credentials);

        return NextResponse.json({
            success: true,
            message: `Exchange ${body.exchange} set as active`,
            activeExchange: body.exchange
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to set active exchange' },
            { status: 400 }
        );
    }
}

/**
 * Handle getting market data
 */
async function handleGetMarketData(body: any) {
    try {
        if (!body.symbol) {
            return NextResponse.json(
                { success: false, error: 'Symbol is required' },
                { status: 400 }
            );
        }

        const marketData = await exchangeManager.fetchMarketData(body.symbol);

        return NextResponse.json({
            success: true,
            marketData
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to get market data' },
            { status: 400 }
        );
    }
}

/**
 * Handle placing an order
 */
async function handlePlaceOrder(body: any) {
    try {
        if (!body.orderParams) {
            return NextResponse.json(
                { success: false, error: 'Order parameters are required' },
                { status: 400 }
            );
        }

        const orderResult = await exchangeManager.placeOrder(body.orderParams);

        return NextResponse.json({
            success: true,
            orderResult
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to place order' },
            { status: 400 }
        );
    }
}

/**
 * Handle getting account balance
 */
async function handleGetBalance(body: any) {
    try {
        const balance = await exchangeManager.fetchBalance();

        return NextResponse.json({
            success: true,
            balance
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to get balance' },
            { status: 400 }
        );
    }
}

/**
 * Handle checking exchange health
 */
async function handleCheckHealth(body: any) {
    try {
        const healthStatus = await exchangeManager.checkAllExchangeHealth();

        return NextResponse.json({
            success: true,
            healthStatus: Object.fromEntries(healthStatus)
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to check exchange health' },
            { status: 400 }
        );
    }
}

/**
 * Handle getting exchange statistics
 */
async function handleGetStatistics(body: any) {
    try {
        const statistics = await exchangeManager.getAllExchangeStatistics();

        return NextResponse.json({
            success: true,
            statistics: Object.fromEntries(statistics)
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to get exchange statistics' },
            { status: 400 }
        );
    }
}
