// src/services/portfolio/ShareEngine.ts

export class ShareEngine {
  public static generateShareLink(type: "stock" | "story" | "watchlist", id: string): string {
    const base = "https://stockstory.in/share";
    return `${base}/${type}/${id}?ref=sec_node`;
  }
}
