/**
 * Conversation Context Manager
 * Builds context from conversation history for better AI responses
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

class ConversationContext {
  private history: ConversationMessage[] = [];
  private maxHistoryLength = 10; // Keep last 10 messages

  /**
   * Add message to history
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    this.history.push({ role, content });

    // Trim history if too long
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Build context string for AI prompt
   */
  buildContext(): string {
    if (this.history.length === 0) {
      return '';
    }

    const recentHistory = this.history
      .map((msg) => {
        if (msg.role === 'user') {
          return `User: ${msg.content}`;
        } else {
          return `Assistant: ${msg.content.substring(0, 150)}...`; // Truncate long responses
        }
      })
      .join('\n');

    return `Previous conversation context:\n${recentHistory}\n\n`;
  }

  /**
   * Build enhanced prompt with context
   */
  buildEnhancedPrompt(currentQuestion: string): string {
    const context = this.buildContext();
    return context
      ? `${context}User is now asking: ${currentQuestion}`
      : currentQuestion;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.history];
  }

  /**
   * Clear conversation history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Get last message from assistant
   */
  getLastAssistantMessage(): string | null {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === 'assistant') {
        return this.history[i].content;
      }
    }
    return null;
  }

  /**
   * Check if question seems to be a follow-up
   */
  isFollowUp(question: string): boolean {
    const followUpPatterns = [
      'elaborate',
      'explain more',
      'tell me more',
      'go deeper',
      'more details',
      'can you',
      'what about',
      'how about',
      'versus',
      'compare',
      'difference',
      'summary',
    ];

    const lowerQuestion = question.toLowerCase();
    return followUpPatterns.some((pattern) => lowerQuestion.includes(pattern));
  }
}

// Export singleton
export const conversationContext = new ConversationContext();
