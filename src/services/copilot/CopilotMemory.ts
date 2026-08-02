// src/services/copilot/CopilotMemory.ts

export interface ChatMessage {
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
}

export class CopilotMemory {
  private static chatHistory: ChatMessage[] = [
    { sender: "copilot", text: "Hello! I am your AI Market Copilot. Ask me anything about your holdings or sector trends.", timestamp: "Just now" },
  ];

  public static getHistory(): ChatMessage[] {
    return this.chatHistory;
  }

  public static addMessage(sender: "user" | "copilot", text: string): void {
    this.chatHistory.push({
      sender,
      text,
      timestamp: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  public static clearHistory(): void {
    this.chatHistory = [
      { sender: "copilot", text: "Hello! History cleared. Ask me anything about your watchlists or holdings.", timestamp: "Just now" },
    ];
  }
}
