/**
 * Telegram Notification API
 * POST /api/telegram - Send notifications to Telegram
 */

import { NextResponse } from 'next/server';
import {
  sendMessage,
  sendTradeAlert,
  sendSystemAlert,
  sendDailySummary,
  sendHealthCheck,
  getBotInfo,
} from '../../../lib/telegram';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../lib/api-headers';

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const botInfo = await getBotInfo();

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Data-Type': 'telegram-status',
      },
    });

    return NextResponse.json(
      {
        configured: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
        bot: botInfo.ok ? botInfo.result : null,
        chatId: process.env.TELEGRAM_CHAT_ID ? '***configured***' : null,
      },
      { headers: headersToObject(headers) }
    );
  } catch (error) {
    const { body, init } = createErrorResponse(
      'Failed to get Telegram status',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    if (!body.type) {
      const { body: errBody, init } = createErrorResponse(
        'Missing required field: type',
        400,
        'Valid types: message, trade, system, summary, health',
        request
      );
      return NextResponse.json(errBody, init);
    }

    let success = false;

    switch (body.type) {
      case 'message':
        if (!body.text) {
          const { body: errBody, init } = createErrorResponse(
            'Missing required field: text',
            400,
            undefined,
            request
          );
          return NextResponse.json(errBody, init);
        }
        success = await sendMessage({
          text: body.text,
          parse_mode: body.parse_mode || 'HTML',
          disable_notification: body.silent || false,
        });
        break;

      case 'trade':
        if (!body.alert) {
          const { body: errBody, init } = createErrorResponse(
            'Missing required field: alert',
            400,
            'alert should contain: type, symbol, side, price, size',
            request
          );
          return NextResponse.json(errBody, init);
        }
        success = await sendTradeAlert(body.alert);
        break;

      case 'system':
        if (!body.alert) {
          const { body: errBody, init } = createErrorResponse(
            'Missing required field: alert',
            400,
            'alert should contain: type, title, message',
            request
          );
          return NextResponse.json(errBody, init);
        }
        success = await sendSystemAlert(body.alert);
        break;

      case 'summary':
        if (!body.stats) {
          const { body: errBody, init } = createErrorResponse(
            'Missing required field: stats',
            400,
            'stats should contain: totalTrades, winRate, pnl, bestTrade, worstTrade',
            request
          );
          return NextResponse.json(errBody, init);
        }
        success = await sendDailySummary(body.stats);
        break;

      case 'health':
        success = await sendHealthCheck();
        break;

      default:
        const { body: errBody, init } = createErrorResponse(
          `Unknown notification type: ${body.type}`,
          400,
          'Valid types: message, trade, system, summary, health',
          request
        );
        return NextResponse.json(errBody, init);
    }

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Notification-Type': body.type,
        'X-Notification-Sent': String(success),
      },
    });

    return NextResponse.json(
      {
        success,
        type: body.type,
        timestamp: new Date().toISOString(),
      },
      { headers: headersToObject(headers) }
    );
  } catch (error) {
    console.error('Telegram API error:', error);
    const { body, init } = createErrorResponse(
      'Failed to send notification',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}
