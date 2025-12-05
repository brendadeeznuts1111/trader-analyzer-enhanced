/**
 * Dashboard API Routes
 * Provides real-time dashboard data and HTML generation for enhanced Telegram bot monitoring
 *
 * GET /api/dashboard - Returns HTML dashboard for monitoring system status
 * POST /api/dashboard - API endpoints for dashboard data operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedBot } from '../../../lib/enhanced-telegram-bot';

/**
 * GET /api/dashboard
 * Returns the HTML dashboard for real-time system monitoring
 *
 * @param request - The incoming HTTP request
 * @returns Response containing HTML dashboard or error response
 */
export async function GET(_request: NextRequest) {
  try {
    const dashboard = enhancedBot.getDashboard();
    const html = await dashboard.generateDashboard();

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to generate dashboard' }, { status: 500 });
  }
}

/**
 * POST /api/dashboard
 * Handles API operations for dashboard data retrieval
 *
 * Supported actions:
 * - metrics: Get comprehensive system metrics
 * - health: Get health check data
 * - topic_details: Get detailed information about a specific topic
 *
 * @param request - The incoming HTTP request with JSON body containing action
 * @returns Response with requested data or error response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const dashboard = enhancedBot.getDashboard();

    switch (action) {
      case 'metrics': {
        const metrics = await dashboard.getMetrics();
        return NextResponse.json(metrics);
      }

      case 'health': {
        const health = await dashboard.getHealthCheck();
        return NextResponse.json(health);
      }

      case 'topic_details': {
        const { threadId } = body;
        if (!threadId) {
          return NextResponse.json({ error: 'threadId required' }, { status: 400 });
        }
        const details = await dashboard.getTopicDetails(threadId);
        return NextResponse.json(details);
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'API error' }, { status: 500 });
  }
}
