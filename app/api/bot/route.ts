import { NextResponse } from 'next/server';

// Mock bot state (in-memory, will reset on server restart)
let botState = {
  running: false,
  startedAt: null as number | null,
};

export async function GET() {
  const now = Date.now();
  const uptime = botState.startedAt ? Math.floor((now - botState.startedAt) / 1000) : 0;
  return NextResponse.json({
    running: botState.running,
    uptime,
  });
}

export async function POST(request: Request) {
  const { action } = await request.json();
  if (action === 'start') {
    if (botState.running) {
      return NextResponse.json({ error: 'Bot already running' }, { status: 400 });
    }
    botState.running = true;
    botState.startedAt = Date.now();
    return NextResponse.json({ success: true, running: true });
  } else if (action === 'stop') {
    if (!botState.running) {
      return NextResponse.json({ error: 'Bot not running' }, { status: 400 });
    }
    botState.running = false;
    botState.startedAt = null;
    return NextResponse.json({ success: true, running: false });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
