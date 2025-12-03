/**
 * Telegram Bot API
 * Full-featured endpoint for Telegram integration
 *
 * POST /api/telegram - Send messages, manage topics, pin messages, admin controls
 * GET /api/telegram - Get bot status and chat info
 */

import { NextResponse } from 'next/server';
import {
  // Message sending
  sendMessage,
  sendToThread,
  forwardMessage,
  copyMessage,
  // Pinning
  pinMessage,
  unpinMessage,
  unpinAllMessages,
  sendAndPin,
  // Forum topics
  createForumTopic,
  editForumTopic,
  closeForumTopic,
  reopenForumTopic,
  deleteForumTopic,
  unpinAllForumTopicMessages,
  editGeneralForumTopic,
  closeGeneralForumTopic,
  reopenGeneralForumTopic,
  hideGeneralForumTopic,
  unhideGeneralForumTopic,
  // Group management
  getChat,
  getChatAdministrators,
  getChatMemberCount,
  getChatMember,
  setChatTitle,
  setChatDescription,
  // Admin controls
  banChatMember,
  unbanChatMember,
  restrictChatMember,
  promoteChatMember,
  setChatAdministratorCustomTitle,
  deleteMessage,
  deleteMessages,
  // Trading alerts
  sendTradeAlert,
  sendSystemAlert,
  sendDailySummary,
  sendHealthCheck,
  // Utilities
  getBotInfo,
  getUpdates,
  TOPIC_COLORS,
  // Mini App
  sendWithMiniApp,
  sendWithKeyboard,
  answerCallbackQuery,
  setChatMenuButton,
  getChatMenuButton,
  // Channel
  sendToChannel,
  getChannelInfo,
  getChannelMemberCount,
  // Bot commands
  setMyCommands,
  getMyCommands,
  setMyDescription,
} from '../../../lib/telegram';
import { ThreadManager } from '../../../lib/thread-manager';
import { buildApiHeaders, headersToObject, createErrorResponse } from '../../../lib/api-headers';

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    let result: any;

    switch (action) {
      case 'chat':
        result = await getChat();
        break;
      case 'admins':
        result = await getChatAdministrators();
        break;
      case 'members':
        result = await getChatMemberCount();
        break;
      case 'updates':
        result = await getUpdates();
        break;
      case 'topics': {
        // Get thread manager topics for the configured chat
        const chatId = parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const topics = ThreadManager.getAllTopics(chatId);
        const pinned = ThreadManager.getPinnedTopics(chatId);
        const pinnedObj: Record<string, any> = {};
        Array.from(pinned.entries()).forEach(([purpose, info]) => {
          pinnedObj[purpose] = info;
        });
        result = {
          ok: true,
          chatId,
          topics,
          pinned: pinnedObj,
          alertsThread: ThreadManager.getAlertsThread(chatId),
          errorsThread: ThreadManager.getErrorsThread(chatId),
          tradesThread: ThreadManager.getTradesThread(chatId),
        };
        break;
      }
      default:
        const botInfo = await getBotInfo();
        const chatId = parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        result = {
          configured: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
          bot: botInfo.ok ? botInfo.result : null,
          chatId: process.env.TELEGRAM_CHAT_ID ? '***configured***' : null,
          availableColors: TOPIC_COLORS,
          topics: ThreadManager.getAllTopics(chatId),
        };
    }

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: { 'X-Data-Type': 'telegram-status' },
    });

    return NextResponse.json(result, { headers: headersToObject(headers) });
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

    if (!body.action) {
      const { body: errBody, init } = createErrorResponse(
        'Missing required field: action',
        400,
        'See API documentation for available actions',
        request
      );
      return NextResponse.json(errBody, init);
    }

    let result: any;

    switch (body.action) {
      // ═══════════════════════════════════════════════════════════
      // MESSAGE SENDING
      // ═══════════════════════════════════════════════════════════
      case 'send':
        if (!body.text) {
          return errorResponse('Missing required field: text', request);
        }
        result = await sendMessage({
          text: body.text,
          parse_mode: body.parse_mode || 'HTML',
          disable_notification: body.silent || false,
          message_thread_id: body.threadId,
          reply_to_message_id: body.replyTo,
        });
        break;

      case 'sendToThread':
        if (!body.threadId || !body.text) {
          return errorResponse('Missing required fields: threadId, text', request);
        }
        result = await sendToThread(body.threadId, body.text, {
          parse_mode: body.parse_mode,
          disable_notification: body.silent,
        });
        break;

      case 'forward':
        if (!body.fromChatId || !body.messageId) {
          return errorResponse('Missing required fields: fromChatId, messageId', request);
        }
        result = await forwardMessage(body.fromChatId, body.messageId, body.toChatId);
        break;

      case 'copy':
        if (!body.fromChatId || !body.messageId) {
          return errorResponse('Missing required fields: fromChatId, messageId', request);
        }
        result = await copyMessage(body.fromChatId, body.messageId, body.toChatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // MESSAGE PINNING
      // ═══════════════════════════════════════════════════════════
      case 'pin':
        if (!body.messageId) {
          return errorResponse('Missing required field: messageId', request);
        }
        result = await pinMessage(body.messageId, body.chatId, body.silent);
        break;

      case 'unpin':
        if (!body.messageId) {
          return errorResponse('Missing required field: messageId', request);
        }
        result = await unpinMessage(body.messageId, body.chatId);
        break;

      case 'unpinAll':
        result = await unpinAllMessages(body.chatId);
        break;

      case 'sendAndPin':
        if (!body.text) {
          return errorResponse('Missing required field: text', request);
        }
        result = await sendAndPin(
          {
            text: body.text,
            parse_mode: body.parse_mode || 'HTML',
            message_thread_id: body.threadId,
          },
          body.chatId
        );
        break;

      // ═══════════════════════════════════════════════════════════
      // FORUM TOPIC MANAGEMENT
      // ═══════════════════════════════════════════════════════════
      case 'createTopic':
        if (!body.name) {
          return errorResponse('Missing required field: name', request);
        }
        result = await createForumTopic(
          body.name,
          body.chatId,
          body.iconColor || TOPIC_COLORS.BLUE,
          body.iconCustomEmojiId
        );
        break;

      case 'editTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await editForumTopic(
          body.threadId,
          body.chatId,
          body.name,
          body.iconCustomEmojiId
        );
        break;

      case 'closeTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await closeForumTopic(body.threadId, body.chatId);
        break;

      case 'reopenTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await reopenForumTopic(body.threadId, body.chatId);
        break;

      case 'deleteTopic':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await deleteForumTopic(body.threadId, body.chatId);
        break;

      case 'unpinAllTopicMessages':
        if (!body.threadId) {
          return errorResponse('Missing required field: threadId', request);
        }
        result = await unpinAllForumTopicMessages(body.threadId, body.chatId);
        break;

      case 'editGeneralTopic':
        if (!body.name) {
          return errorResponse('Missing required field: name', request);
        }
        result = await editGeneralForumTopic(body.name, body.chatId);
        break;

      case 'closeGeneralTopic':
        result = await closeGeneralForumTopic(body.chatId);
        break;

      case 'reopenGeneralTopic':
        result = await reopenGeneralForumTopic(body.chatId);
        break;

      case 'hideGeneralTopic':
        result = await hideGeneralForumTopic(body.chatId);
        break;

      case 'unhideGeneralTopic':
        result = await unhideGeneralForumTopic(body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // GROUP MANAGEMENT
      // ═══════════════════════════════════════════════════════════
      case 'getChat':
        result = await getChat(body.chatId);
        break;

      case 'getAdmins':
        result = await getChatAdministrators(body.chatId);
        break;

      case 'getMemberCount':
        result = await getChatMemberCount(body.chatId);
        break;

      case 'getMember':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await getChatMember(body.userId, body.chatId);
        break;

      case 'setTitle':
        if (!body.title) {
          return errorResponse('Missing required field: title', request);
        }
        result = await setChatTitle(body.title, body.chatId);
        break;

      case 'setDescription':
        if (!body.description) {
          return errorResponse('Missing required field: description', request);
        }
        result = await setChatDescription(body.description, body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // ADMIN CONTROLS
      // ═══════════════════════════════════════════════════════════
      case 'ban':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await banChatMember(body.userId, body.chatId, body.untilDate, body.revokeMessages);
        break;

      case 'unban':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await unbanChatMember(body.userId, body.chatId, body.onlyIfBanned);
        break;

      case 'restrict':
        if (!body.userId || !body.permissions) {
          return errorResponse('Missing required fields: userId, permissions', request);
        }
        result = await restrictChatMember(
          body.userId,
          body.permissions,
          body.chatId,
          body.untilDate
        );
        break;

      case 'promote':
        if (!body.userId) {
          return errorResponse('Missing required field: userId', request);
        }
        result = await promoteChatMember(body.userId, body.chatId, body.permissions || {});
        break;

      case 'setAdminTitle':
        if (!body.userId || !body.customTitle) {
          return errorResponse('Missing required fields: userId, customTitle', request);
        }
        result = await setChatAdministratorCustomTitle(body.userId, body.customTitle, body.chatId);
        break;

      case 'deleteMessage':
        if (!body.messageId) {
          return errorResponse('Missing required field: messageId', request);
        }
        result = await deleteMessage(body.messageId, body.chatId);
        break;

      case 'deleteMessages':
        if (!body.messageIds || !Array.isArray(body.messageIds)) {
          return errorResponse('Missing required field: messageIds (array)', request);
        }
        result = await deleteMessages(body.messageIds, body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // TRADING ALERTS (LEGACY SUPPORT)
      // ═══════════════════════════════════════════════════════════
      case 'trade':
        if (!body.alert) {
          return errorResponse('Missing required field: alert', request);
        }
        result = await sendTradeAlert(body.alert);
        break;

      case 'system':
        if (!body.alert) {
          return errorResponse('Missing required field: alert', request);
        }
        result = await sendSystemAlert(body.alert);
        break;

      case 'summary':
        if (!body.stats) {
          return errorResponse('Missing required field: stats', request);
        }
        result = await sendDailySummary(body.stats, body.threadId);
        break;

      case 'health':
        result = await sendHealthCheck(body.threadId);
        break;

      // ═══════════════════════════════════════════════════════════
      // MINI APP
      // ═══════════════════════════════════════════════════════════
      case 'sendMiniApp':
        if (!body.text || !body.webAppUrl) {
          return errorResponse('Missing required fields: text, webAppUrl', request);
        }
        result = await sendWithMiniApp(
          body.text,
          body.webAppUrl,
          body.buttonText || 'Open App',
          body.chatId,
          body.threadId
        );
        break;

      case 'sendKeyboard':
        if (!body.text || !body.keyboard) {
          return errorResponse('Missing required fields: text, keyboard', request);
        }
        result = await sendWithKeyboard(body.text, body.keyboard, body.chatId, {
          threadId: body.threadId,
          parseMode: body.parseMode,
        });
        break;

      case 'answerCallback':
        if (!body.callbackQueryId) {
          return errorResponse('Missing required field: callbackQueryId', request);
        }
        result = await answerCallbackQuery(body.callbackQueryId, {
          text: body.text,
          show_alert: body.showAlert,
          url: body.url,
        });
        break;

      case 'setMenuButton':
        result = await setChatMenuButton(body.chatId, body.menuButton);
        break;

      case 'getMenuButton':
        result = await getChatMenuButton(body.chatId);
        break;

      // ═══════════════════════════════════════════════════════════
      // CHANNEL
      // ═══════════════════════════════════════════════════════════
      case 'sendToChannel':
        if (!body.text) {
          return errorResponse('Missing required field: text', request);
        }
        result = await sendToChannel(body.text, {
          parseMode: body.parseMode,
          disableNotification: body.silent,
          protectContent: body.protectContent,
          keyboard: body.keyboard,
        });
        break;

      case 'getChannel':
        result = await getChannelInfo();
        break;

      case 'getChannelMembers':
        result = await getChannelMemberCount();
        break;

      // ═══════════════════════════════════════════════════════════
      // BOT COMMANDS
      // ═══════════════════════════════════════════════════════════
      case 'setCommands':
        if (!body.commands) {
          return errorResponse('Missing required field: commands', request);
        }
        result = await setMyCommands(body.commands, body.scope, body.languageCode);
        break;

      case 'getCommands':
        result = await getMyCommands(body.scope, body.languageCode);
        break;

      case 'setBotDescription':
        if (!body.description) {
          return errorResponse('Missing required field: description', request);
        }
        result = await setMyDescription(body.description, body.languageCode);
        break;

      // ═══════════════════════════════════════════════════════════
      // THREAD MANAGER (Topic Routing)
      // ═══════════════════════════════════════════════════════════
      case 'getTopics': {
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        result = {
          ok: true,
          topics: ThreadManager.getAllTopics(chatId),
          alertsThread: ThreadManager.getAlertsThread(chatId),
          errorsThread: ThreadManager.getErrorsThread(chatId),
          tradesThread: ThreadManager.getTradesThread(chatId),
        };
        break;
      }

      case 'registerTopic': {
        if (body.threadId === undefined || !body.name || !body.purpose) {
          return errorResponse('Missing required fields: threadId, name, purpose', request);
        }
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const info = ThreadManager.register(chatId, body.threadId, body.name, body.purpose);
        result = { ok: true, topic: info };
        break;
      }

      case 'pinTopic': {
        if (body.threadId === undefined || !body.purpose) {
          return errorResponse('Missing required fields: threadId, purpose', request);
        }
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        ThreadManager.setPinned(chatId, body.threadId, body.purpose);
        result = {
          ok: true,
          message: `Topic ${body.threadId ?? 'General'} pinned for ${body.purpose}`,
          topics: ThreadManager.getAllTopics(chatId),
        };
        break;
      }

      case 'unpinTopic': {
        if (body.threadId === undefined) {
          return errorResponse('Missing required field: threadId', request);
        }
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        ThreadManager.unpin(chatId, body.threadId);
        result = {
          ok: true,
          message: `Topic ${body.threadId ?? 'General'} unpinned`,
          topics: ThreadManager.getAllTopics(chatId),
        };
        break;
      }

      case 'testAlert': {
        // Send a test alert to the pinned alerts topic
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const alertsThread = ThreadManager.getAlertsThread(chatId);
        const testResult = await sendMessage(
          {
            text: `🧪 <b>Test Alert</b>\n\nThis is a test alert sent to the pinned alerts topic.\n\nThread ID: <code>${alertsThread ?? 'null'}</code>\nTime: ${new Date().toISOString()}`,
            parse_mode: 'HTML',
            message_thread_id: alertsThread,
          },
          chatId
        );
        result = {
          ok: testResult.ok,
          message: testResult.ok ? 'Test alert sent!' : testResult.description,
          threadId: alertsThread,
        };
        break;
      }

      case 'syncTopicsFromTelegram': {
        // Fetch actual topics from Telegram and sync them
        const chatId = body.chatId || parseInt(process.env.TELEGRAM_CHAT_ID || '0');
        const updates = await getUpdates(undefined, 100);
        const seenThreads = new Set<number>();

        if (updates.ok && updates.result) {
          for (const update of updates.result as any[]) {
            const threadId = update.message?.message_thread_id;
            if (threadId && !seenThreads.has(threadId)) {
              seenThreads.add(threadId);
              ThreadManager.markUsed(chatId, threadId, `Topic ${threadId}`);
            }
          }
        }

        result = {
          ok: true,
          message: `Synced ${seenThreads.size} topics from recent messages`,
          topics: ThreadManager.getAllTopics(chatId),
        };
        break;
      }

      default:
        return errorResponse(`Unknown action: ${body.action}`, request);
    }

    const headers = buildApiHeaders({
      cache: 'no-cache',
      request,
      responseTime: Date.now() - startTime,
      custom: {
        'X-Telegram-Action': body.action,
        'X-Telegram-Success': String(result?.ok ?? false),
      },
    });

    return NextResponse.json(
      {
        action: body.action,
        ...result,
        timestamp: new Date().toISOString(),
      },
      { headers: headersToObject(headers) }
    );
  } catch (error) {
    console.error('Telegram API error:', error);
    const { body, init } = createErrorResponse(
      'Failed to process Telegram request',
      500,
      error instanceof Error ? error.message : 'Unknown error',
      request
    );
    return NextResponse.json(body, init);
  }
}

function errorResponse(message: string, request: Request) {
  const { body, init } = createErrorResponse(message, 400, undefined, request);
  return NextResponse.json(body, init);
}
