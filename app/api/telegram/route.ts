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
      default:
        const botInfo = await getBotInfo();
        result = {
          configured: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
          bot: botInfo.ok ? botInfo.result : null,
          chatId: process.env.TELEGRAM_CHAT_ID ? '***configured***' : null,
          availableColors: TOPIC_COLORS,
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
