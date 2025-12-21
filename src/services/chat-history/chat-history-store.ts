import type { Message } from "grammy";

/**
 * In-memory storage for chat message history
 * Stores last N messages per chat for context retrieval
 */
class ChatHistoryStore {
  private readonly histories = new Map<number, Message[]>();
  private readonly maxMessagesPerChat = 10;

  /**
   * Add a message to chat history
   */
  addMessage(chatId: number, message: Message): void {
    let history = this.histories.get(chatId);

    if (!history) {
      history = [];
      this.histories.set(chatId, history);
    }

    history.push(message);

    // Keep only last N messages
    if (history.length > this.maxMessagesPerChat) {
      history.shift();
    }
  }

  /**
   * Get last N messages from a chat
   * @param limit Maximum number of messages to return (default: 10)
   */
  getHistory(chatId: number, limit = 10): Message[] {
    const history = this.histories.get(chatId) ?? [];
    return history.slice(-limit);
  }

  /**
   * Clear history for a specific chat
   */
  clearHistory(chatId: number): void {
    this.histories.delete(chatId);
  }

  /**
   * Get number of stored messages for a chat
   */
  getHistorySize(chatId: number): number {
    return this.histories.get(chatId)?.length ?? 0;
  }
}

export const chatHistoryStore = new ChatHistoryStore();
