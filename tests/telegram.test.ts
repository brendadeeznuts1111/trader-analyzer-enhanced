import { test, expect, describe } from 'bun:test';
import {
  TelegramError,
  TelegramRateLimitError,
  TelegramAuthError,
  TelegramValidationError,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatTimestamp,
  escapeHtml,
  createInlineKeyboard,
  validateEnvironment,
  validateWebhookRequest,
  generateWebhookSignature,
  normalizeChatId,
  configureTelegram,
  TOPIC_COLORS,
} from '../lib/telegram';

// ═══════════════════════════════════════════════════════════════
// CUSTOM ERROR TESTS
// ═══════════════════════════════════════════════════════════════

describe('Custom Error Classes', () => {
  test('TelegramError has correct properties', () => {
    const error = new TelegramError('Test error', 500, 'Server error');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(500);
    expect(error.description).toBe('Server error');
    expect(error.name).toBe('TelegramError');
    expect(error instanceof Error).toBe(true);
  });

  test('TelegramRateLimitError has correct properties', () => {
    const error = new TelegramRateLimitError('Too many requests', 60);
    expect(error.message).toContain('Rate limit exceeded');
    expect(error.code).toBe(429);
    expect(error.retryAfter).toBe(60);
    expect(error.name).toBe('TelegramRateLimitError');
    expect(error instanceof TelegramError).toBe(true);
  });

  test('TelegramAuthError has correct properties', () => {
    const error = new TelegramAuthError('Invalid token');
    expect(error.message).toContain('Authentication failed');
    expect(error.code).toBe(401);
    expect(error.name).toBe('TelegramAuthError');
    expect(error instanceof TelegramError).toBe(true);
  });

  test('TelegramValidationError has correct properties', () => {
    const error = new TelegramValidationError('Invalid chat ID');
    expect(error.message).toContain('Validation error');
    expect(error.code).toBe(400);
    expect(error.name).toBe('TelegramValidationError');
    expect(error instanceof TelegramError).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// FORMATTING UTILITY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Formatting Utilities', () => {
  describe('formatNumber', () => {
    test('formats numbers with default 2 decimal places', () => {
      expect(formatNumber(1234.567)).toBe('1,234.57');
      expect(formatNumber(1000)).toBe('1,000.00');
      expect(formatNumber(0.5)).toBe('0.50');
    });

    test('formats numbers with custom decimal places', () => {
      expect(formatNumber(1234.5678, 4)).toBe('1,234.5678');
      expect(formatNumber(1234.5, 0)).toBe('1,235');
      expect(formatNumber(100, 3)).toBe('100.000');
    });

    test('handles negative numbers', () => {
      expect(formatNumber(-1234.56)).toBe('-1,234.56');
      expect(formatNumber(-0.5)).toBe('-0.50');
    });

    test('handles zero', () => {
      expect(formatNumber(0)).toBe('0.00');
    });
  });

  describe('formatCurrency', () => {
    test('formats USD by default', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    test('formats other currencies', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('EUR 1,234.56');
      expect(formatCurrency(1234.56, 'BTC')).toBe('BTC 1,234.56');
    });

    test('handles negative amounts', () => {
      expect(formatCurrency(-500)).toBe('$-500.00');
    });
  });

  describe('formatPercent', () => {
    test('formats positive percentages with + sign', () => {
      expect(formatPercent(12.34)).toBe('+12.34%');
      expect(formatPercent(100)).toBe('+100.00%');
    });

    test('formats negative percentages without + sign', () => {
      expect(formatPercent(-5.5)).toBe('-5.50%');
      expect(formatPercent(-100)).toBe('-100.00%');
    });

    test('formats zero', () => {
      expect(formatPercent(0)).toBe('+0.00%');
    });

    test('uses custom decimal places', () => {
      expect(formatPercent(12.3456, 4)).toBe('+12.3456%');
      expect(formatPercent(12.3, 0)).toBe('+12%');
    });
  });

  describe('formatTimestamp', () => {
    test('formats current date when no argument provided', () => {
      const result = formatTimestamp();
      expect(result).toMatch(/\w{3} \d{1,2}, \d{4}/); // e.g., "Dec 3, 2025"
    });

    test('formats Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatTimestamp(date);
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
    });

    test('formats string date', () => {
      const result = formatTimestamp('2024-06-20T15:45:00Z');
      expect(result).toContain('2024');
      expect(result).toContain('Jun');
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('a & b')).toBe('a &amp; b');
      expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
      expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    test('handles text without special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
      expect(escapeHtml('123')).toBe('123');
    });

    test('escapes multiple special characters', () => {
      expect(escapeHtml('<a href="test">')).toBe('&lt;a href=&quot;test&quot;&gt;');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INLINE KEYBOARD TESTS
// ═══════════════════════════════════════════════════════════════

describe('createInlineKeyboard', () => {
  test('creates keyboard with callback data buttons', () => {
    const keyboard = createInlineKeyboard([
      { text: 'Button 1', callbackData: 'action1' },
      { text: 'Button 2', callbackData: 'action2' },
    ]);

    expect(keyboard).toHaveLength(1);
    expect(keyboard[0]).toHaveLength(2);
    expect(keyboard[0][0].text).toBe('Button 1');
    expect(keyboard[0][0].callback_data).toBe('action1');
    expect(keyboard[0][1].text).toBe('Button 2');
    expect(keyboard[0][1].callback_data).toBe('action2');
  });

  test('creates keyboard with URL buttons', () => {
    const keyboard = createInlineKeyboard([{ text: 'Visit', url: 'https://example.com' }]);

    expect(keyboard[0][0].url).toBe('https://example.com');
    expect(keyboard[0][0].callback_data).toBeUndefined();
  });

  test('creates keyboard with mixed button types', () => {
    const keyboard = createInlineKeyboard([
      { text: 'Callback', callbackData: 'cb1' },
      { text: 'URL', url: 'https://test.com' },
    ]);

    expect(keyboard[0][0].callback_data).toBe('cb1');
    expect(keyboard[0][1].url).toBe('https://test.com');
  });

  test('creates empty keyboard for empty array', () => {
    const keyboard = createInlineKeyboard([]);
    expect(keyboard).toEqual([[]]);
  });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('normalizeChatId', () => {
  test('returns string chat ID as-is', () => {
    expect(normalizeChatId('@channelname')).toBe('@channelname');
    expect(normalizeChatId('-1001234567890')).toBe('-1001234567890');
  });

  test('returns number chat ID as-is', () => {
    expect(normalizeChatId(1234567890)).toBe(1234567890);
    expect(normalizeChatId(-1001234567890)).toBe(-1001234567890);
  });
});

describe('validateEnvironment', () => {
  test('returns validation result object', () => {
    const result = validateEnvironment();
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe('validateWebhookRequest', () => {
  test('rejects non-POST requests', () => {
    const result = validateWebhookRequest({
      body: { update_id: 123 },
      headers: { 'content-type': 'application/json' },
      method: 'GET',
      url: '/webhook',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid HTTP method');
  });

  test('rejects invalid content type', () => {
    const result = validateWebhookRequest({
      body: { update_id: 123 },
      headers: { 'content-type': 'text/plain' },
      method: 'POST',
      url: '/webhook',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid content type');
  });

  test('rejects missing update_id', () => {
    const result = validateWebhookRequest({
      body: { message: {} },
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      url: '/webhook',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Missing update_id');
  });

  test('accepts valid webhook request', () => {
    const result = validateWebhookRequest({
      body: { update_id: 123, message: {} },
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      url: '/webhook',
    });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test('validates secret token when provided', () => {
    const result = validateWebhookRequest(
      {
        body: { update_id: 123 },
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': 'wrong-token',
        },
        method: 'POST',
        url: '/webhook',
      },
      { secretToken: 'correct-token' }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid secret token');
  });

  test('accepts matching secret token', () => {
    const result = validateWebhookRequest(
      {
        body: { update_id: 123 },
        headers: {
          'content-type': 'application/json',
          'x-telegram-bot-api-secret-token': 'my-secret',
        },
        method: 'POST',
        url: '/webhook',
      },
      { secretToken: 'my-secret' }
    );
    expect(result.valid).toBe(true);
  });

  test('rejects body exceeding max size', () => {
    const result = validateWebhookRequest(
      {
        body: { update_id: 123, data: 'x'.repeat(1000) },
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        url: '/webhook',
      },
      { maxBodySize: 100 }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Request body too large');
  });
});

describe('generateWebhookSignature', () => {
  test('generates consistent signatures', () => {
    const sig1 = generateWebhookSignature('payload', 'secret');
    const sig2 = generateWebhookSignature('payload', 'secret');
    expect(sig1).toBe(sig2);
  });

  test('generates different signatures for different payloads', () => {
    const sig1 = generateWebhookSignature('payload1', 'secret');
    const sig2 = generateWebhookSignature('payload2', 'secret');
    expect(sig1).not.toBe(sig2);
  });

  test('generates different signatures for different secrets', () => {
    const sig1 = generateWebhookSignature('payload', 'secret1');
    const sig2 = generateWebhookSignature('payload', 'secret2');
    expect(sig1).not.toBe(sig2);
  });

  test('returns hexadecimal string', () => {
    const sig = generateWebhookSignature('test', 'secret');
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });
});

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('configureTelegram', () => {
  test('accepts partial configuration', () => {
    // Should not throw
    expect(() => {
      configureTelegram({ maxRetries: 5 });
    }).not.toThrow();
  });

  test('accepts rate limit configuration', () => {
    expect(() => {
      configureTelegram({
        rateLimit: { maxRequests: 10, windowMs: 2000 },
      });
    }).not.toThrow();
  });

  test('accepts logging configuration', () => {
    expect(() => {
      configureTelegram({
        logging: { enabled: true, level: 'debug' },
      });
    }).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════

describe('TOPIC_COLORS', () => {
  test('contains expected color values', () => {
    expect(TOPIC_COLORS.BLUE).toBe(7322096);
    expect(TOPIC_COLORS.YELLOW).toBe(16766590);
    expect(TOPIC_COLORS.PURPLE).toBe(13338331);
    expect(TOPIC_COLORS.GREEN).toBe(9367192);
    expect(TOPIC_COLORS.PINK).toBe(16749490);
    expect(TOPIC_COLORS.RED).toBe(16478047);
  });

  test('all colors are numbers', () => {
    Object.values(TOPIC_COLORS).forEach(color => {
      expect(typeof color).toBe('number');
    });
  });
});
