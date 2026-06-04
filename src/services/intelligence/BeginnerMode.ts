// src/services/intelligence/BeginnerMode.ts

export class BeginnerMode {
  private static isBeginner: boolean = false;
  private static listeners: Array<(val: boolean) => void> = [];

  public static isEnabled(): boolean {
    return this.isBeginner;
  }

  public static setEnabled(val: boolean): void {
    this.isBeginner = val;
    this.listeners.forEach((l) => l(val));
  }

  public static subscribe(listener: (val: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
