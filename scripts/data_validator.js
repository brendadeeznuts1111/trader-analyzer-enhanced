/**
 * Data Validation Utilities for Trader Analyzer
 * Validates CSV data structure and content before processing
 */

const fs = require('fs');
const path = require('path');

/**
 * Validates trade CSV data
 * @param {string} filePath - Path to CSV file
 * @returns {boolean} Validation result
 */
function validateTradeData(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        // Check header
        const header = lines[0];
        const expectedHeaders = ['id', 'datetime', 'symbol', 'side', 'price', 'amount', 'cost', 'fee_cost', 'fee_currency', 'execID'];
        const actualHeaders = header.split(',');

        if (actualHeaders.length !== expectedHeaders.length) {
            console.error(`❌ Trade data validation failed: Header count mismatch. Expected ${expectedHeaders.length}, got ${actualHeaders.length}`);
            return false;
        }

        // Check required headers
        const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
        if (missingHeaders.length > 0) {
            console.error(`❌ Trade data validation failed: Missing headers: ${missingHeaders.join(', ')}`);
            return false;
        }

        // Sample data validation
        if (lines.length > 1) {
            const sampleLine = lines[1].split(',');
            if (sampleLine.length !== actualHeaders.length) {
                console.error(`❌ Trade data validation failed: Data row length mismatch`);
                return false;
            }

            // Validate numeric fields
            const price = parseFloat(sampleLine[4]);
            const amount = parseFloat(sampleLine[5]);
            const cost = parseFloat(sampleLine[6]);

            if (isNaN(price) || isNaN(amount) || isNaN(cost)) {
                console.error(`❌ Trade data validation failed: Invalid numeric values in sample data`);
                return false;
            }
        }

        console.log(`✅ Trade data validation passed: ${lines.length - 1} records`);
        return true;

    } catch (error) {
        console.error(`❌ Trade data validation error: ${error.message}`);
        return false;
    }
}

/**
 * Validates order CSV data
 * @param {string} filePath - Path to CSV file
 * @returns {boolean} Validation result
 */
function validateOrderData(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        if (lines.length <= 1) {
            console.log(`⚠️  Order data validation: No data found`);
            return true; // Empty file is acceptable
        }

        // Check header
        const header = lines[0];
        const expectedHeaders = ['orderID', 'symbol', 'side', 'ordType', 'orderQty', 'price', 'stopPx', 'avgPx', 'cumQty', 'ordStatus', 'timestamp', 'text'];
        const actualHeaders = header.split(',');

        if (actualHeaders.length !== expectedHeaders.length) {
            console.error(`❌ Order data validation failed: Header count mismatch`);
            return false;
        }

        // Check required headers
        const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
        if (missingHeaders.length > 0) {
            console.error(`❌ Order data validation failed: Missing headers: ${missingHeaders.join(', ')}`);
            return false;
        }

        console.log(`✅ Order data validation passed: ${lines.length - 1} records`);
        return true;

    } catch (error) {
        console.error(`❌ Order data validation error: ${error.message}`);
        return false;
    }
}

/**
 * Validates wallet history CSV data
 * @param {string} filePath - Path to CSV file
 * @returns {boolean} Validation result
 */
function validateWalletData(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        if (lines.length <= 1) {
            console.log(`⚠️  Wallet data validation: No data found`);
            return true; // Empty file is acceptable
        }

        // Check header
        const header = lines[0];
        const expectedHeaders = ['transactID', 'account', 'currency', 'transactType', 'amount', 'fee', 'transactStatus', 'address', 'tx', 'text', 'timestamp', 'walletBalance', 'marginBalance'];
        const actualHeaders = header.split(',');

        if (actualHeaders.length !== expectedHeaders.length) {
            console.error(`❌ Wallet data validation failed: Header count mismatch`);
            return false;
        }

        console.log(`✅ Wallet data validation passed: ${lines.length - 1} records`);
        return true;

    } catch (error) {
        console.error(`❌ Wallet data validation error: ${error.message}`);
        return false;
    }
}

/**
 * Validates execution CSV data
 * @param {string} filePath - Path to CSV file
 * @returns {boolean} Validation result
 */
function validateExecutionData(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        if (lines.length <= 1) {
            console.log(`⚠️  Execution data validation: No data found`);
            return true; // Empty file is acceptable
        }

        // Check header
        const header = lines[0];
        const expectedHeaders = ['execID', 'orderID', 'symbol', 'side', 'lastQty', 'lastPx', 'execType', 'ordType', 'ordStatus', 'execCost', 'execComm', 'timestamp', 'text'];
        const actualHeaders = header.split(',');

        if (actualHeaders.length !== expectedHeaders.length) {
            console.error(`❌ Execution data validation failed: Header count mismatch`);
            return false;
        }

        console.log(`✅ Execution data validation passed: ${lines.length - 1} records`);
        return true;

    } catch (error) {
        console.error(`❌ Execution data validation error: ${error.message}`);
        return false;
    }
}

/**
 * Validates all data files before processing
 * @returns {boolean} Overall validation result
 */
function validateAllData() {
    console.log('🔍 Validating data files...');
    console.log('═'.repeat(50));

    const baseDir = path.dirname(__dirname);
    const results = [];

    // Validate trade data
    const tradeFile = path.join(baseDir, 'bitmex_trades.csv');
    if (fs.existsSync(tradeFile)) {
        results.push(validateTradeData(tradeFile));
    } else {
        console.log(`⚠️  Trade data file not found: ${tradeFile}`);
        results.push(true); // Missing file is acceptable
    }

    // Validate order data
    const orderFile = path.join(baseDir, 'bitmex_orders.csv');
    if (fs.existsSync(orderFile)) {
        results.push(validateOrderData(orderFile));
    } else {
        console.log(`⚠️  Order data file not found: ${orderFile}`);
        results.push(true); // Missing file is acceptable
    }

    // Validate wallet data
    const walletFile = path.join(baseDir, 'bitmex_wallet_history.csv');
    if (fs.existsSync(walletFile)) {
        results.push(validateWalletData(walletFile));
    } else {
        console.log(`⚠️  Wallet data file not found: ${walletFile}`);
        results.push(true); // Missing file is acceptable
    }

    // Validate execution data
    const executionFile = path.join(baseDir, 'bitmex_executions.csv');
    if (fs.existsSync(executionFile)) {
        results.push(validateExecutionData(executionFile));
    } else {
        console.log(`⚠️  Execution data file not found: ${executionFile}`);
        results.push(true); // Missing file is acceptable
    }

    console.log('═'.repeat(50));
    const allValid = results.every(r => r);

    if (allValid) {
        console.log('✅ All data files validated successfully');
    } else {
        console.log('❌ Some data files failed validation');
    }

    return allValid;
}

// Export validation functions
module.exports = {
    validateTradeData,
    validateOrderData,
    validateWalletData,
    validateExecutionData,
    validateAllData
};

// Run validation if called directly
if (require.main === module) {
    validateAllData();
}
