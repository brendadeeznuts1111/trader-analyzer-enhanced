/**
 * Telegram Logger Service
 * Automated logging to forum threads for:
 * - Git commits
 * - Error logs
 * - Trade alerts
 * - System status
 */

import { sendToThread, sendAndPin, sendMessage, TelegramResponse, MessageResult } from './telegram';

// ═══════════════════════════════════════════════════════════════
// THREAD CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Thread IDs for the polymark-alerts group
// Update these after creating topics or use existing ones
export const THREADS = {
  GENERAL: undefined, // General topic (no thread_id needed)
  GIT_LOG: 6, // Git-log thread - commits, branches, PRs
  TESTING: 2, // Testing-thread - errors, debug, dev logs
  ERROR_LOG: parseInt(process.env.TELEGRAM_ERROR_THREAD || '2'), // Errors (fallback to Testing)
  TRADE_ALERTS: parseInt(process.env.TELEGRAM_TRADE_THREAD || '0') || undefined,
  SYSTEM_STATUS: parseInt(process.env.TELEGRAM_SYSTEM_THREAD || '0') || undefined,
  PIPELINE: parseInt(process.env.TELEGRAM_PIPELINE_THREAD || '0') || undefined,
  COMMANDS: parseInt(process.env.TELEGRAM_COMMANDS_THREAD || '6'), // Commands (fallback to Git-log)
  FEEDBACK: parseInt(process.env.TELEGRAM_FEEDBACK_THREAD || '0') || undefined,
} as const;

// ═══════════════════════════════════════════════════════════════
// GIT COMMIT LOGGING
// ═══════════════════════════════════════════════════════════════

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  branch?: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
}

/**
 * Log a single git commit to the Git-log thread
 */
export async function logGitCommit(commit: GitCommit): Promise<TelegramResponse<MessageResult>> {
  const statsLine =
    commit.filesChanged !== undefined
      ? `\n📊 <code>${commit.filesChanged} files | +${commit.insertions || 0} | -${commit.deletions || 0}</code>`
      : '';

  const branchLine = commit.branch ? `\n🌿 <code>${commit.branch}</code>` : '';

  const text = `
🔨 <b>New Commit</b>

<code>${commit.shortHash}</code> ${commit.message}

👤 ${commit.author}
📅 ${commit.date}${branchLine}${statsLine}
`.trim();

  return sendToThread(THREADS.GIT_LOG!, text);
}

/**
 * Log multiple commits (e.g., after a push)
 */
export async function logGitPush(
  commits: GitCommit[],
  branch: string,
  remote: string = 'origin'
): Promise<TelegramResponse<MessageResult>> {
  const commitList = commits
    .slice(0, 10) // Limit to 10 commits
    .map(c => `• <code>${c.shortHash}</code> ${c.message}`)
    .join('\n');

  const moreText = commits.length > 10 ? `\n<i>...and ${commits.length - 10} more commits</i>` : '';

  const text = `
🚀 <b>Pushed to ${remote}/${branch}</b>

${commitList}${moreText}

📊 <b>${commits.length}</b> commit${commits.length > 1 ? 's' : ''}
`.trim();

  return sendToThread(THREADS.GIT_LOG!, text);
}

/**
 * Log a git tag
 */
export async function logGitTag(
  tag: string,
  message?: string,
  commit?: string
): Promise<TelegramResponse<MessageResult>> {
  const text = `
🏷️ <b>New Tag: ${tag}</b>

${message ? `📝 ${message}\n` : ''}${commit ? `🔗 <code>${commit}</code>` : ''}
`.trim();

  return sendToThread(THREADS.GIT_LOG!, text);
}

/**
 * Log a branch creation/deletion
 */
export async function logGitBranch(
  branch: string,
  action: 'created' | 'deleted' | 'merged',
  targetBranch?: string
): Promise<TelegramResponse<MessageResult>> {
  const emoji = {
    created: '🌱',
    deleted: '🗑️',
    merged: '🔀',
  };

  const actionText = {
    created: 'Branch Created',
    deleted: 'Branch Deleted',
    merged: `Merged into ${targetBranch}`,
  };

  const text = `
${emoji[action]} <b>${actionText[action]}</b>

🌿 <code>${branch}</code>
`.trim();

  return sendToThread(THREADS.GIT_LOG!, text);
}

// ═══════════════════════════════════════════════════════════════
// ERROR LOGGING
// ═══════════════════════════════════════════════════════════════

export interface ErrorLog {
  level: 'error' | 'warn' | 'fatal';
  message: string;
  stack?: string;
  source?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an error to the Error-log thread
 */
export async function logError(error: ErrorLog): Promise<TelegramResponse<MessageResult>> {
  const emoji = {
    error: '❌',
    warn: '⚠️',
    fatal: '💀',
  };

  const levelLabel = {
    error: 'ERROR',
    warn: 'WARNING',
    fatal: 'FATAL',
  };

  const stackText = error.stack
    ? `\n<pre>${escapeHtml(error.stack.slice(0, 500))}${error.stack.length > 500 ? '...' : ''}</pre>`
    : '';

  const sourceText = error.source ? `\n📍 <code>${error.source}</code>` : '';

  const metaText = error.metadata
    ? `\n📋 <code>${JSON.stringify(error.metadata, null, 2).slice(0, 200)}</code>`
    : '';

  const text = `
${emoji[error.level]} <b>${levelLabel[error.level]}</b>

${escapeHtml(error.message)}${sourceText}${stackText}${metaText}

⏰ ${error.timestamp || new Date().toISOString()}
`.trim();

  const threadId = THREADS.ERROR_LOG || THREADS.TESTING;
  return sendToThread(threadId!, text);
}

/**
 * Log an exception with full details
 */
export async function logException(
  err: Error,
  context?: string,
  metadata?: Record<string, any>
): Promise<TelegramResponse<MessageResult>> {
  return logError({
    level: 'error',
    message: err.message,
    stack: err.stack,
    source: context,
    metadata,
  });
}

/**
 * Log a warning
 */
export async function logWarning(
  message: string,
  source?: string,
  metadata?: Record<string, any>
): Promise<TelegramResponse<MessageResult>> {
  return logError({
    level: 'warn',
    message,
    source,
    metadata,
  });
}

// ═══════════════════════════════════════════════════════════════
// TRADE ALERT LOGGING
// ═══════════════════════════════════════════════════════════════

export interface TradeLog {
  type: 'entry' | 'exit' | 'stop_loss' | 'take_profit' | 'liquidation';
  symbol: string;
  side: 'long' | 'short';
  price: number;
  size: number;
  pnl?: number;
  leverage?: number;
  orderId?: string;
}

/**
 * Log a trade to the Trade-Alerts thread
 */
export async function logTrade(trade: TradeLog): Promise<TelegramResponse<MessageResult>> {
  const emoji = {
    entry: trade.side === 'long' ? '🟢' : '🔴',
    exit: '⚪',
    stop_loss: '🛑',
    take_profit: '🎯',
    liquidation: '💀',
  };

  const typeLabel = {
    entry: 'ENTRY',
    exit: 'EXIT',
    stop_loss: 'STOP LOSS',
    take_profit: 'TAKE PROFIT',
    liquidation: 'LIQUIDATION',
  };

  const pnlText =
    trade.pnl !== undefined
      ? `\n💰 <b>PnL:</b> ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toLocaleString()} ${trade.pnl >= 0 ? '✅' : '❌'}`
      : '';

  const leverageText = trade.leverage ? `\n⚡ <b>Leverage:</b> ${trade.leverage}x` : '';

  const orderText = trade.orderId ? `\n🔗 <code>${trade.orderId}</code>` : '';

  const text = `
${emoji[trade.type]} <b>${typeLabel[trade.type]}</b> ${emoji[trade.type]}

<b>Symbol:</b> ${trade.symbol}
<b>Side:</b> ${trade.side.toUpperCase()}
<b>Price:</b> $${trade.price.toLocaleString()}
<b>Size:</b> ${trade.size.toLocaleString()}${leverageText}${pnlText}${orderText}

⏰ ${new Date().toISOString()}
`.trim();

  const threadId = THREADS.TRADE_ALERTS || THREADS.GENERAL;

  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

/**
 * Log daily trade summary
 */
export async function logDailySummary(stats: {
  totalTrades: number;
  winRate: number;
  pnl: number;
  bestTrade: { symbol: string; pnl: number };
  worstTrade: { symbol: string; pnl: number };
  volume: number;
}): Promise<TelegramResponse<MessageResult>> {
  const pnlEmoji = stats.pnl >= 0 ? '📈' : '📉';

  const text = `
📊 <b>DAILY TRADING SUMMARY</b>

<b>Total Trades:</b> ${stats.totalTrades}
<b>Win Rate:</b> ${(stats.winRate * 100).toFixed(1)}%
<b>Net PnL:</b> ${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toLocaleString()} ${pnlEmoji}
<b>Volume:</b> $${stats.volume.toLocaleString()}

🏆 <b>Best:</b> ${stats.bestTrade.symbol} +$${stats.bestTrade.pnl.toLocaleString()}
💔 <b>Worst:</b> ${stats.worstTrade.symbol} -$${Math.abs(stats.worstTrade.pnl).toLocaleString()}

📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`.trim();

  const threadId = THREADS.TRADE_ALERTS || THREADS.GENERAL;

  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM STATUS LOGGING
// ═══════════════════════════════════════════════════════════════

export interface SystemStatus {
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  version: string;
  uptime: number;
  memory?: { used: number; total: number };
  cpu?: number;
  connections?: number;
  lastDeploy?: string;
}

/**
 * Log system status to System-Status thread
 */
export async function logSystemStatus(
  status: SystemStatus
): Promise<TelegramResponse<MessageResult>> {
  const emoji = {
    online: '🟢',
    degraded: '🟡',
    offline: '🔴',
    maintenance: '🔧',
  };

  const statusLabel = {
    online: 'ONLINE',
    degraded: 'DEGRADED',
    offline: 'OFFLINE',
    maintenance: 'MAINTENANCE',
  };

  const memoryText = status.memory
    ? `\n💾 <b>Memory:</b> ${(status.memory.used / 1024 / 1024).toFixed(0)}MB / ${(status.memory.total / 1024 / 1024).toFixed(0)}MB`
    : '';

  const cpuText = status.cpu !== undefined ? `\n⚡ <b>CPU:</b> ${status.cpu.toFixed(1)}%` : '';

  const connectionsText =
    status.connections !== undefined ? `\n🔗 <b>Connections:</b> ${status.connections}` : '';

  const deployText = status.lastDeploy ? `\n🚀 <b>Last Deploy:</b> ${status.lastDeploy}` : '';

  const text = `
${emoji[status.status]} <b>SYSTEM STATUS: ${statusLabel[status.status]}</b>

<b>Version:</b> ${status.version}
<b>Uptime:</b> ${formatUptime(status.uptime)}${memoryText}${cpuText}${connectionsText}${deployText}

⏰ ${new Date().toISOString()}
`.trim();

  const threadId = THREADS.SYSTEM_STATUS || THREADS.GENERAL;

  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

/**
 * Log deployment event
 */
export async function logDeployment(
  version: string,
  environment: 'staging' | 'production',
  status: 'started' | 'success' | 'failed',
  details?: string
): Promise<TelegramResponse<MessageResult>> {
  const emoji = {
    started: '🚀',
    success: '✅',
    failed: '❌',
  };

  const statusLabel = {
    started: 'DEPLOYING',
    success: 'DEPLOYED',
    failed: 'FAILED',
  };

  const envEmoji = environment === 'production' ? '🔴' : '🟡';

  const text = `
${emoji[status]} <b>DEPLOYMENT ${statusLabel[status]}</b>

<b>Version:</b> ${version}
<b>Environment:</b> ${envEmoji} ${environment.toUpperCase()}
${details ? `\n📝 ${details}` : ''}

⏰ ${new Date().toISOString()}
`.trim();

  const threadId = THREADS.SYSTEM_STATUS || THREADS.GIT_LOG;

  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

/**
 * Log and pin a status message (for pinned status in topic)
 */
export async function logAndPinStatus(
  title: string,
  content: string,
  threadId?: number
): Promise<{ sent: TelegramResponse<MessageResult>; pinned: TelegramResponse<boolean> | null }> {
  const text = `
📌 <b>${title}</b>

${content}

<i>Last updated: ${new Date().toISOString()}</i>
`.trim();

  return sendAndPin({ text, message_thread_id: threadId });
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE LOGGING
// ═══════════════════════════════════════════════════════════════

export interface PipelineStatus {
  stage: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  duration?: number;
  details?: string;
}

/**
 * Log pipeline stage update
 */
export async function logPipeline(
  pipeline: PipelineStatus
): Promise<TelegramResponse<MessageResult>> {
  const emoji = {
    running: '🔄',
    success: '✅',
    failed: '❌',
    pending: '⏳',
  };

  const durationText = pipeline.duration ? ` (${pipeline.duration}ms)` : '';

  const text = `
${emoji[pipeline.status]} <b>Pipeline: ${pipeline.stage}</b>${durationText}
${pipeline.details ? `\n${pipeline.details}` : ''}
`.trim();

  const threadId = THREADS.PIPELINE || THREADS.GIT_LOG;
  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

/**
 * Log full pipeline run
 */
export async function logPipelineRun(
  stages: PipelineStatus[],
  totalDuration: number,
  success: boolean
): Promise<TelegramResponse<MessageResult>> {
  const stageList = stages
    .map(s => {
      const emoji = s.status === 'success' ? '✅' : s.status === 'failed' ? '❌' : '⏳';
      return `${emoji} ${s.stage}${s.duration ? ` (${s.duration}ms)` : ''}`;
    })
    .join('\n');

  const text = `
${success ? '✅' : '❌'} <b>PIPELINE ${success ? 'PASSED' : 'FAILED'}</b>

${stageList}

⏱️ <b>Total:</b> ${totalDuration}ms
⏰ ${new Date().toISOString()}
`.trim();

  const threadId = THREADS.PIPELINE || THREADS.GIT_LOG;
  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

// ═══════════════════════════════════════════════════════════════
// FEEDBACK & TOOL CALLS
// ═══════════════════════════════════════════════════════════════

export interface ToolCall {
  tool: string;
  action: string;
  params?: Record<string, any>;
  result?: 'success' | 'error';
  duration?: number;
  error?: string;
}

/**
 * Log a tool call for feedback loop
 */
export async function logToolCall(call: ToolCall): Promise<TelegramResponse<MessageResult>> {
  const emoji = call.result === 'success' ? '✅' : call.result === 'error' ? '❌' : '🔧';

  const paramsText = call.params
    ? `\n<code>${JSON.stringify(call.params, null, 2).slice(0, 300)}</code>`
    : '';

  const errorText = call.error ? `\n⚠️ ${escapeHtml(call.error)}` : '';

  const text = `
${emoji} <b>${call.tool}.${call.action}</b>${call.duration ? ` (${call.duration}ms)` : ''}${paramsText}${errorText}
`.trim();

  const threadId = THREADS.FEEDBACK || THREADS.TESTING;
  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

/**
 * Log user feedback
 */
export async function logFeedback(
  type: 'bug' | 'feature' | 'question' | 'praise',
  message: string,
  user?: string
): Promise<TelegramResponse<MessageResult>> {
  const emoji = {
    bug: '🐛',
    feature: '💡',
    question: '❓',
    praise: '⭐',
  };

  const label = {
    bug: 'BUG REPORT',
    feature: 'FEATURE REQUEST',
    question: 'QUESTION',
    praise: 'FEEDBACK',
  };

  const text = `
${emoji[type]} <b>${label[type]}</b>

${escapeHtml(message)}
${user ? `\n👤 ${user}` : ''}

⏰ ${new Date().toISOString()}
`.trim();

  const threadId = THREADS.FEEDBACK || THREADS.TESTING;
  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

/**
 * Log AI/LLM interaction for debugging
 */
export async function logAIInteraction(
  action: string,
  input: string,
  output: string,
  tokens?: { input: number; output: number }
): Promise<TelegramResponse<MessageResult>> {
  const tokensText = tokens ? `\n📊 Tokens: ${tokens.input} in / ${tokens.output} out` : '';

  const text = `
🤖 <b>AI: ${action}</b>

<b>Input:</b>
<code>${escapeHtml(input.slice(0, 200))}${input.length > 200 ? '...' : ''}</code>

<b>Output:</b>
<code>${escapeHtml(output.slice(0, 300))}${output.length > 300 ? '...' : ''}</code>${tokensText}

⏰ ${new Date().toISOString()}
`.trim();

  const threadId = THREADS.FEEDBACK || THREADS.TESTING;
  if (threadId) {
    return sendToThread(threadId, text);
  }
  return sendMessage({ text });
}

// ═══════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize all thread pinned messages
 */
export async function initializeThreadPins(): Promise<void> {
  // Pin status in Git-log
  if (THREADS.GIT_LOG) {
    await logAndPinStatus(
      'Git Log Status',
      `🌿 <b>Repository:</b> trader-analyzer\n📊 <b>Tracking:</b> Commits, branches, tags`,
      THREADS.GIT_LOG
    );
  }

  // Pin status in Error-log if exists
  if (THREADS.ERROR_LOG) {
    await logAndPinStatus(
      'Error Log Status',
      `🔍 <b>Monitoring:</b> Errors, warnings, exceptions\n⚡ <b>Alert Level:</b> All`,
      THREADS.ERROR_LOG
    );
  }

  // Pin status in Trade-Alerts if exists
  if (THREADS.TRADE_ALERTS) {
    await logAndPinStatus(
      'Trade Alerts Status',
      `📈 <b>Tracking:</b> Entries, exits, P&L\n🎯 <b>Symbols:</b> All configured markets`,
      THREADS.TRADE_ALERTS
    );
  }
}

/**
 * Send startup notification
 */
export async function logStartup(version: string): Promise<TelegramResponse<MessageResult>> {
  const text = `
🚀 <b>TRADER ANALYZER STARTED</b>

<b>Version:</b> ${version}
<b>Environment:</b> ${process.env.NODE_ENV || 'development'}
<b>Node:</b> ${process.version}

<b>Threads Active:</b>
• Git-log: #${THREADS.GIT_LOG}
• Testing: #${THREADS.TESTING}
${THREADS.PIPELINE ? `• Pipeline: #${THREADS.PIPELINE}` : ''}
${THREADS.TRADE_ALERTS ? `• Trades: #${THREADS.TRADE_ALERTS}` : ''}

⏰ ${new Date().toISOString()}
`.trim();

  return sendMessage({ text });
}

/**
 * Send shutdown notification
 */
export async function logShutdown(reason?: string): Promise<TelegramResponse<MessageResult>> {
  const text = `
🛑 <b>TRADER ANALYZER STOPPING</b>

${reason ? `<b>Reason:</b> ${reason}\n` : ''}<b>Uptime:</b> ${formatUptime(process.uptime())}

⏰ ${new Date().toISOString()}
`.trim();

  return sendMessage({ text });
}
