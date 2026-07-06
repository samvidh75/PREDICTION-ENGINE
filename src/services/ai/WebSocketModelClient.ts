/**
 * WebSocket Client for Model Inference
 * Connects to backend model server for real-time AI inference
 */

type MessageCallback = (chunk: string) => void;
type CompleteCallback = (fullResponse: string, tokenCount: number) => void;
type ErrorCallback = (error: string) => void;

interface PendingRequest {
  onMessage: MessageCallback;
  onComplete: CompleteCallback;
  onError: ErrorCallback;
  timeout: NodeJS.Timeout;
  buffer: string;
}

class WebSocketModelClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestIdCounter = 0;

  constructor(url?: string) {
    this.url = url || this.getWebSocketUrl();
  }

  /**
   * Determine WebSocket URL based on environment
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:10000/ws/ai';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    // In development, connect to Vite dev server
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `ws://localhost:10000/ws/ai`;
    }

    // In production
    return `${protocol}//${host}/ws/ai`;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[WebSocket] Connecting to', this.url);

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to model server');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Connection closed');
          this.attemptReconnect();
        };

        // Timeout if connection doesn't establish
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect after disconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[WebSocket] Reconnection failed:', error);
        });
      }, delay);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      const { id, status, token, content, error, totalTokens } = message;

      const pending = this.pendingRequests.get(id);
      if (!pending) return;

      clearTimeout(pending.timeout);

      switch (status) {
        case 'streaming':
          if (token) {
            pending.buffer += token;
            pending.onMessage(token);
          }
          break;

        case 'complete':
          pending.buffer += content || '';
          pending.onComplete(pending.buffer, totalTokens || 0);
          this.pendingRequests.delete(id);
          break;

        case 'error':
          pending.onError(error || 'Unknown error');
          this.pendingRequests.delete(id);
          break;

        case 'start':
          pending.buffer = '';
          break;
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * Send inference request
   */
  async infer(
    prompt: string,
    systemPrompt?: string,
    maxTokens = 256,
    temperature = 0.7
  ): Promise<{
    content: string;
    tokenCount: number;
    onStream?: (chunk: string) => void;
  }> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;
      let fullContent = '';
      let tokenCount = 0;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Inference request timeout'));
      }, 60000); // 60 second timeout

      this.pendingRequests.set(requestId, {
        onMessage: (chunk: string) => {
          fullContent += chunk;
        },
        onComplete: (content: string, tokens: number) => {
          tokenCount = tokens;
          resolve({
            content,
            tokenCount,
          });
        },
        onError: (error: string) => {
          reject(new Error(error));
        },
        timeout,
        buffer: '',
      });

      // Send request
      this.ws!.send(
        JSON.stringify({
          id: requestId,
          prompt,
          systemPrompt,
          maxTokens,
          temperature,
        })
      );
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.onError('Connection closed');
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected(),
      url: this.url,
      pendingRequests: this.pendingRequests.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance
let clientInstance: WebSocketModelClient | null = null;

export function getWebSocketClient(): WebSocketModelClient {
  if (!clientInstance) {
    clientInstance = new WebSocketModelClient();
  }
  return clientInstance;
}

export { WebSocketModelClient };
