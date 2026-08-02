export type BackgroundState = "foreground" | "hidden";

type Subscriber = (state: BackgroundState) => void;

class BackgroundThrottleController {
  private state: BackgroundState = "foreground";
  private subscribers: Set<Subscriber> = new Set();
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    const compute = (): BackgroundState => {
      if (typeof document === "undefined") return "foreground";
      return document.visibilityState === "hidden" ? "hidden" : "foreground";
    };

    // Initialize immediately
    this.state = compute();

    const onChange = () => {
      const next = compute();
      if (next === this.state) return;
      this.state = next;
      for (const fn of this.subscribers) fn(this.state);
    };

    window.addEventListener("visibilitychange", onChange);
  }

  getState(): BackgroundState {
    return this.state;
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    fn(this.state);
    return () => {
      this.subscribers.delete(fn);
    };
  }
}

export const backgroundThrottleController = new BackgroundThrottleController();

// Auto-start (safe: only listens to visibilitychange)
if (typeof window !== "undefined") {
  backgroundThrottleController.start();
}
