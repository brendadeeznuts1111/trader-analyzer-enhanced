import { test, expect } from 'bun:test';

// Basic test to verify Bun test runner is working
test('Bun test runner is working', () => {
  expect(true).toBe(true);
});

// Test basic math operations
test('Basic math operations', () => {
  expect(2 + 2).toBe(4);
  expect(10 - 5).toBe(5);
  expect(3 * 3).toBe(9);
  expect(8 / 2).toBe(4);
});

// Test string operations
test('String operations', () => {
  expect('trader'.toUpperCase()).toBe('TRADER');
  expect('ROLE-PLAY'.toLowerCase()).toBe('role-play');
});

// Test array operations
test('Array operations', () => {
  const trades = ['buy', 'sell', 'hold'];
  expect(trades).toContain('buy');
  expect(trades).toHaveLength(3);
});

// Test object operations
test('Object operations', () => {
  const trade = {
    id: '1',
    side: 'buy',
    price: 50000,
    amount: 100
  };
  
  expect(trade.id).toBe('1');
  expect(trade.side).toBe('buy');
  expect(trade.price).toBe(50000);
  expect(trade.amount).toBe(100);
});