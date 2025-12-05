/**
 * Trade/Execution Seed Data Generator
 * Generates realistic trading execution and wallet history data
 */

const SYMBOLS = ['XBTUSD', 'ETHUSD', 'SOLUSD', 'XBTUSDT', 'ETHUSDT'];
const SIDES = ['Buy', 'Sell'] as const;
const ORDER_TYPES = ['Market', 'Limit'] as const;
const EXEC_TYPES = ['Trade'] as const;
const STATUSES = ['Filled', 'PartiallyFilled'] as const;

interface Execution {
  execID: string;
  orderID: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  lastQty: number;
  lastPx: number;
  execType: string;
  ordType: string;
  ordStatus: string;
  execCost: number;
  execComm: number;
  timestamp: string;
  text: string;
}

interface WalletTransaction {
  transactID: string;
  account: number;
  currency: string;
  transactType: 'RealisedPNL' | 'Funding' | 'Deposit' | 'Withdrawal';
  amount: number;
  fee: number;
  transactStatus: string;
  address: string;
  tx: string;
  text: string;
  timestamp: string;
  walletBalance: number;
  marginBalance: number;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBasePrice(symbol: string): number {
  if (symbol.includes('XBT')) return randomFloat(45000, 95000, 1);
  if (symbol.includes('ETH')) return randomFloat(2500, 4500, 2);
  if (symbol.includes('SOL')) return randomFloat(80, 250, 2);
  return randomFloat(10, 100, 2);
}

function generateOrderId(index: number): string {
  return `order-${2000000 + index}`;
}

function generateExecId(index: number): string {
  return `exec-${1000000 + index}`;
}

export function generateExecutions(count: number = 1000): Execution[] {
  const executions: Execution[] = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // 6 months of data

  let orderIndex = 0;
  let execIndex = 0;
  let currentOrderId = generateOrderId(orderIndex);
  let executionsInOrder = randomInt(1, 5);
  let currentSymbol = SYMBOLS[randomInt(0, SYMBOLS.length - 1)];
  let currentSide: 'Buy' | 'Sell' = SIDES[randomInt(0, 1)];
  let basePrice = getBasePrice(currentSymbol);

  for (let i = 0; i < count; i++) {
    // Advance time
    const timestamp = new Date(startDate.getTime() + (i * 6 * 60 * 60 * 1000) / count * 180);

    // Price walk with some volatility
    const priceChange = randomFloat(-0.5, 0.5) / 100;
    basePrice = basePrice * (1 + priceChange);
    const lastPx = parseFloat(basePrice.toFixed(1));

    // Order quantity (in contracts)
    const quantities = [100, 500, 1000, 2000, 5000, 10000];
    const lastQty = quantities[randomInt(0, quantities.length - 1)];

    // Calculate costs (in satoshis for XBT)
    const execCost = Math.floor((lastQty / lastPx) * 100000000);
    const commissionRate = randomFloat(0.0005, 0.00075);
    const execComm = Math.floor(execCost * commissionRate);

    const execution: Execution = {
      execID: generateExecId(execIndex),
      orderID: currentOrderId,
      symbol: currentSymbol,
      side: currentSide,
      lastQty,
      lastPx,
      execType: 'Trade',
      ordType: Math.random() > 0.4 ? 'Market' : 'Limit',
      ordStatus: executionsInOrder === 1 ? 'Filled' : 'PartiallyFilled',
      execCost,
      execComm,
      timestamp: timestamp.toISOString(),
      text: '',
    };

    executions.push(execution);
    execIndex++;

    // Manage order grouping
    executionsInOrder--;
    if (executionsInOrder <= 0) {
      orderIndex++;
      currentOrderId = generateOrderId(orderIndex);
      executionsInOrder = randomInt(1, 5);

      // Maybe change symbol/side
      if (Math.random() > 0.7) {
        currentSymbol = SYMBOLS[randomInt(0, SYMBOLS.length - 1)];
        basePrice = getBasePrice(currentSymbol);
      }
      if (Math.random() > 0.5) {
        currentSide = currentSide === 'Buy' ? 'Sell' : 'Buy';
      }
    }
  }

  return executions;
}

export function generateWalletHistory(days: number = 365): WalletTransaction[] {
  const transactions: WalletTransaction[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let walletBalance = 100000000; // 1 BTC in satoshis
  let transIndex = 0;
  let fundingIndex = 0;

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    date.setHours(21, 16, 1, Math.floor(Math.random() * 1000000));

    // Daily PnL (skewed slightly positive for realistic trading)
    const dailyPnL = Math.floor(randomFloat(-800000, 1000000));
    walletBalance += dailyPnL;

    transactions.push({
      transactID: `trans-${transIndex}`,
      account: 123456,
      currency: 'XBt',
      transactType: 'RealisedPNL',
      amount: dailyPnL,
      fee: 0,
      transactStatus: 'Completed',
      address: '',
      tx: '',
      text: '',
      timestamp: date.toISOString(),
      walletBalance,
      marginBalance: walletBalance,
    });
    transIndex++;

    // Funding payments (every 8 hours, but we'll add 1-3 per day)
    const fundingCount = randomInt(1, 3);
    for (let f = 0; f < fundingCount; f++) {
      const fundingAmount = Math.floor(randomFloat(-15000, 15000));

      transactions.push({
        transactID: `fund-${fundingIndex}`,
        account: 123456,
        currency: 'XBt',
        transactType: 'Funding',
        amount: fundingAmount,
        fee: 0,
        transactStatus: 'Completed',
        address: '',
        tx: '',
        text: 'Funding',
        timestamp: date.toISOString(),
        walletBalance,
        marginBalance: walletBalance,
      });
      fundingIndex++;
    }

    // Occasional deposits/withdrawals
    if (Math.random() < 0.02) { // ~7 deposits/year
      const depositAmount = randomInt(5000000, 50000000);
      walletBalance += depositAmount;

      transactions.push({
        transactID: `dep-${transIndex}`,
        account: 123456,
        currency: 'XBt',
        transactType: 'Deposit',
        amount: depositAmount,
        fee: 0,
        transactStatus: 'Completed',
        address: `bc1q${Array(39).fill(0).map(() => '0123456789abcdef'[randomInt(0, 15)]).join('')}`,
        tx: Array(64).fill(0).map(() => '0123456789abcdef'[randomInt(0, 15)]).join(''),
        text: 'Bitcoin Deposit',
        timestamp: date.toISOString(),
        walletBalance,
        marginBalance: walletBalance,
      });
      transIndex++;
    }

    if (Math.random() < 0.01) { // ~3-4 withdrawals/year
      const withdrawAmount = -randomInt(2000000, 20000000);
      const fee = Math.floor(Math.abs(withdrawAmount) * 0.0005);
      walletBalance += withdrawAmount - fee;

      transactions.push({
        transactID: `wd-${transIndex}`,
        account: 123456,
        currency: 'XBt',
        transactType: 'Withdrawal',
        amount: withdrawAmount,
        fee,
        transactStatus: 'Completed',
        address: `bc1q${Array(39).fill(0).map(() => '0123456789abcdef'[randomInt(0, 15)]).join('')}`,
        tx: Array(64).fill(0).map(() => '0123456789abcdef'[randomInt(0, 15)]).join(''),
        text: 'Bitcoin Withdrawal',
        timestamp: date.toISOString(),
        walletBalance,
        marginBalance: walletBalance,
      });
      transIndex++;
    }
  }

  // Sort by timestamp
  return transactions.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export type { Execution, WalletTransaction };
