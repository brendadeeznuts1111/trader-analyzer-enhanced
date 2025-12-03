/**
 * Exchange Integration Test Suite
 * Comprehensive testing for multi-exchange functionality
 */

const { exchangeManager } = require('../lib/exchanges/exchange_manager');
const { BitmexExchange } = require('../lib/exchanges/bitmex_exchange');
const { PolymarketExchange } = require('../lib/exchanges/polymarket_exchange');
const { KalishiExchange } = require('../lib/exchanges/kalishi_exchange');
const { SportsTradingExchange } = require('../lib/exchanges/sports_exchange');

/**
 * Main test function
 */
async function runExchangeIntegrationTests() {
    console.log('=== Exchange Integration Test Suite ===\n');

    try {
        // Initialize exchange manager
        console.log('1. Initializing Exchange Manager...');
        exchangeManager.initialize();
        console.log('✅ Exchange Manager initialized successfully\n');

        // Test available exchanges
        console.log('2. Testing Available Exchanges...');
        const availableExchanges = exchangeManager.getAvailableExchanges();
        console.log('Available exchanges:', availableExchanges);
        console.log('✅ Available exchanges retrieved successfully\n');

        // Test exchange configurations
        console.log('3. Testing Exchange Configurations...');
        const exchangeConfigs = exchangeManager.getAllExchangeConfigs();
        console.log('Exchange configurations:');
        exchangeConfigs.forEach((config, name) => {
            console.log(`- ${name}: ${config.name} (${config.type})`);
        });
        console.log('✅ Exchange configurations retrieved successfully\n');

        // Test each exchange type
        console.log('4. Testing Individual Exchange Adapters...');

        // Test BitMEX Exchange
        console.log('   Testing BitMEX Exchange...');
        await testBitmexExchange();

        // Test Polymarket Exchange
        console.log('   Testing Polymarket Exchange...');
        await testPolymarketExchange();

        // Test Kalishi Exchange
        console.log('   Testing Kalishi Exchange...');
        await testKalishiExchange();

        // Test Sports Trading Exchange
        console.log('   Testing Sports Trading Exchange...');
        await testSportsExchange();

        console.log('✅ All exchange adapters tested successfully\n');

        // Test exchange switching
        console.log('5. Testing Exchange Switching...');
        await testExchangeSwitching();
        console.log('✅ Exchange switching tested successfully\n');

        // Test multi-exchange operations
        console.log('6. Testing Multi-Exchange Operations...');
        await testMultiExchangeOperations();
        console.log('✅ Multi-exchange operations tested successfully\n');

        console.log('🎉 All Exchange Integration Tests Passed!');

    } catch (error) {
        console.error('❌ Test Suite Failed:', error);
        process.exit(1);
    }
}

/**
 * Test BitMEX Exchange
 */
async function testBitmexExchange() {
    const bitmex = new BitmexExchange();
    await bitmex.initialize({ apiKey: 'test_key', apiSecret: 'test_secret' });

    // Test market data
    const marketData = await bitmex.fetchMarketData('XBTUSD');
    console.log(`   - Market Data: ${marketData.symbol} @ $${marketData.lastPrice}`);

    // Test balance
    const balance = await bitmex.fetchBalance();
    console.log(`   - Balance: $${balance.total} (${Object.keys(balance.currencies).join(', ')})`);

    // Test order placement
    const order = await bitmex.placeOrder({
        symbol: 'XBTUSD',
        side: 'buy',
        type: 'limit',
        amount: 0.1,
        price: 50000
    });
    console.log(`   - Order Placed: ${order.id} - ${order.side} ${order.amount} ${order.symbol}`);

    // Test configuration
    const config = bitmex.getConfig();
    console.log(`   - Config: ${config.name} (${config.type})`);
}

/**
 * Test Polymarket Exchange
 */
async function testPolymarketExchange() {
    const polymarket = new PolymarketExchange();
    await polymarket.initialize({ username: 'test_user' });

    // Test market data
    const marketData = await polymarket.fetchMarketData('BTC-50K-DEC-2024');
    console.log(`   - Market Data: ${marketData.symbol} @ ${marketData.lastPrice}%`);

    // Test balance
    const balance = await polymarket.fetchBalance();
    console.log(`   - Balance: $${balance.total} USDC`);

    // Test order placement
    const order = await polymarket.placeOrder({
        symbol: 'BTC-50K-DEC-2024',
        side: 'buy',
        type: 'limit',
        amount: 100,
        price: 45
    });
    console.log(`   - Order Placed: ${order.id} - ${order.side} ${order.amount} shares`);

    // Test configuration
    const config = polymarket.getConfig();
    console.log(`   - Config: ${config.name} (${config.type})`);
}

/**
 * Test Kalishi Exchange
 */
async function testKalishiExchange() {
    const kalishi = new KalishiExchange();
    await kalishi.initialize({ username: 'test_trader' });

    // Test market data
    const marketData = await kalishi.fetchMarketData('BTC/USDT');
    console.log(`   - Market Data: ${marketData.symbol} @ $${marketData.lastPrice}`);

    // Test balance
    const balance = await kalishi.fetchBalance();
    console.log(`   - Balance: $${balance.total} (${Object.keys(balance.currencies).join(', ')})`);

    // Test order placement
    const order = await kalishi.placeOrder({
        symbol: 'BTC/USDT',
        side: 'buy',
        type: 'limit',
        amount: 0.1,
        price: 50000
    });
    console.log(`   - Order Placed: ${order.id} - ${order.side} ${order.amount} ${order.symbol}`);

    // Test configuration
    const config = kalishi.getConfig();
    console.log(`   - Config: ${config.name} (${config.type})`);
}

/**
 * Test Sports Trading Exchange
 */
async function testSportsExchange() {
    const sports = new SportsTradingExchange();
    await sports.initialize({ username: 'sports_trader' });

    // Test market data
    const marketData = await sports.fetchMarketData('NFL-SUPERBOWL-2025');
    console.log(`   - Market Data: ${marketData.symbol} @ ${marketData.lastPrice}x odds`);

    // Test balance
    const balance = await sports.fetchBalance();
    console.log(`   - Balance: $${balance.total} (${Object.keys(balance.currencies).join(', ')})`);

    // Test order placement
    const order = await sports.placeOrder({
        symbol: 'NFL-SUPERBOWL-2025',
        side: 'buy',
        type: 'limit',
        amount: 1000,
        price: 2.5
    });
    console.log(`   - Order Placed: ${order.id} - ${order.side} $${order.amount} on ${order.symbol}`);

    // Test configuration
    const config = sports.getConfig();
    console.log(`   - Config: ${config.name} (${config.type})`);
}

/**
 * Test Exchange Switching
 */
async function testExchangeSwitching() {
    // Set BitMEX as active
    await exchangeManager.setActiveExchange('bitmex', { apiKey: 'test_key' });
    console.log('   - Active Exchange: bitmex');

    // Test operations on active exchange
    const marketData = await exchangeManager.fetchMarketData('XBTUSD');
    console.log(`   - Active Exchange Market Data: ${marketData.symbol} @ $${marketData.lastPrice}`);

    // Switch to Polymarket
    await exchangeManager.setActiveExchange('polymarket', { username: 'test_user' });
    console.log('   - Active Exchange: polymarket');

    // Test operations on new active exchange
    const pmMarketData = await exchangeManager.fetchMarketData('BTC-50K-DEC-2024');
    console.log(`   - Active Exchange Market Data: ${pmMarketData.symbol} @ ${pmMarketData.lastPrice}%`);
}

/**
 * Test Multi-Exchange Operations
 */
async function testMultiExchangeOperations() {
    // Test getting specific exchange configurations
    const bitmexConfig = exchangeManager.getExchangeConfig('bitmex');
    const sportsConfig = exchangeManager.getExchangeConfig('sports');

    console.log(`   - BitMEX Features: Margin=${bitmexConfig.features.marginTrading}, Futures=${bitmexConfig.features.futuresTrading}`);
    console.log(`   - Sports Features: SportsTrading=${sportsConfig.features.sportsTrading}, P2P=${sportsConfig.features.p2pTrading}`);

    // Test error handling
    try {
        await exchangeManager.setActiveExchange('nonexistent', {});
    } catch (error) {
        console.log(`   - Error Handling: ${error.message}`);
    }
}

// Run tests
runExchangeIntegrationTests().catch(console.error);
