/**
 * Simple API client for the trader analyzer
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Simple API call wrapper
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return { data, status: response.status };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * Telegram API client
 */
export class TelegramApiClient {
  private baseUrl = '/api/telegram';

  async sendMessage(
    chatId: string,
    text: string,
    options: { threadId?: number; parseMode?: string } = {}
  ) {
    return apiCall(`${this.baseUrl}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'sendMessage',
        chatId,
        text,
        ...options,
      }),
    });
  }

  async getStatus() {
    return apiCall(`${this.baseUrl}`);
  }
}

export const telegramApi = new TelegramApiClient();
