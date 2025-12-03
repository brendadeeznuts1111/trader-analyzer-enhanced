/**
 * Market Mapping System Test
 * Tests the UUID-based market identification and data normalization
 */

import { marketMapper } from '../lib/market_mapping';
import { exchangeManager } from '../lib/exchanges/exchange_manager';

// Test the market mapping system
async function testMarketMapping() {
    console.log('🧪 Testing Market Mapping System...');

    try {
        // Initialize exchange manager
        exchangeManager.initialize();
        console.log('✅ Exchange Manager initialized');

        // Test market identifier generation
        const marketId1 = marketMapper.getMarketIdentifier({
            exchange: 'bitmex',
            symbol: 'XBTUSD',
            displaySymbol: 'BTCUSD',
            marketType: 'crypto'
        });

        console.log('📋 Market Identifier 1:', {
            marketId: marketId1.marketId,
            exchange: marketId1.exchange,
            symbol: marketId1.symbol,
            displaySymbol: marketId1.displaySymbol,
            marketType: marketId1.marketType
        });

        // Test that the same market gets the same UUID (deterministic)
        const marketId2 = marketMapper.getMarketIdentifier({
            exchange: 'bitmex',
            symbol: 'XBTUSD',
            displaySymbol: 'BTCUSD',
            marketType: 'crypto'
        });

        if (marketId1.marketId === marketId2.marketId) {
            console.log('✅ UUID generation is deterministic (same input → same UUID)');
        } else {
            console.log('❌ UUID generation failed - different UUIDs for same market');
        }

        // Test different markets get different UUIDs
        const marketId3 = marketMapper.getMarketIdentifier({
            exchange: 'polymarket',
            symbol: 'BTC-50K-DEC-2024',
            displaySymbol: 'BTC > $50K by Dec 2024',
            marketType: 'prediction'
        });

        console.log('📋 Market Identifier 2:', {
            marketId: marketId3.marketId,
            exchange: marketId3.exchange,
            symbol: marketId3.symbol,
            displaySymbol: marketId3.displaySymbol,
            marketType: marketId3.marketType
        });

        if (marketId1.marketId !== marketId3.marketId) {
            console.log('✅ Different markets get different UUIDs');
        } else {
            console.log('❌ UUID generation failed - same UUID for different markets');
        }

        // Test market data normalization
        const mockMarketData = {
            symbol: 'XBTUSD',
            lastPrice: 50000,
            bid: 49950,
            ask: 50050,
            volume: 1000000,
            timestamp: new Date().toISOString(),
            fundingRate: 0.0001,
            openInterest: 500000000
        };

        const normalizedData = marketMapper.normalizeMarketData(
            mockMarketData,
            'bitmex',
            'crypto'
        );

        console.log('📊 Normalized Market Data:', {
            marketId: normalizedData.marketId,
            exchange: normalizedData.exchange,
            symbol: normalizedData.symbol,
            displaySymbol: normalizedData.displaySymbol,
            marketType: normalizedData.marketType,
            lastPrice: normalizedData.lastPrice,
            bid: normalizedData.bid,
            ask: normalizedData.ask,
            volume: normalizedData.volume,
            exchangeSpecific: normalizedData.exchangeSpecific
        });

        // Test getting all market identifiers
        const allMarkets = marketMapper.getAllMarketIdentifiers();
        console.log(`🗂️ Total markets in cache: ${allMarkets.length}`);

        // Test exchange statistics
        const exchangeStats = await exchangeManager.getAllExchangeStatistics();
        console.log(`📈 Exchange statistics loaded for ${exchangeStats.size} exchanges`);

        console.log('✅ Market Mapping System test completed successfully!');

    } catch (error) {
        console.error('❌ Market Mapping System test failed:', error);
        process.exit(1);
    }
}

// Run the test
testMarketMapping();
