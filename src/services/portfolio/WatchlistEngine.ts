// src/services/portfolio/WatchlistEngine.ts
import {
  CustomWatchlist,
  getWatchlists,
  createWatchlist,
  renameWatchlist,
  archiveWatchlist,
  toggleFavourite,
  updateWatchlistOrder,
  addTickerToWatchlist,
  removeTickerFromWatchlist
} from "./watchlistStore";

export type { CustomWatchlist };

export class WatchlistEngine {
  public static getWatchlists(): CustomWatchlist[] {
    return getWatchlists();
  }

  public static createWatchlist(name: string): CustomWatchlist {
    return createWatchlist(name);
  }

  public static renameWatchlist(id: string, name: string): void {
    renameWatchlist(id, name);
  }

  public static archiveWatchlist(id: string): void {
    archiveWatchlist(id);
  }

  // Alias for pinning – uses favourite flag
  public static pinWatchlist(id: string): void {
    toggleFavourite(id);
  }

  public static toggleFavourite(id: string): void {
    toggleFavourite(id);
  }

  public static reorderWatchlists(orderedIds: string[]): void {
    updateWatchlistOrder(orderedIds);
  }

  public static addTicker(listId: string, ticker: string): void {
    addTickerToWatchlist(listId, ticker);
  }

  public static removeTicker(listId: string, ticker: string): void {
    removeTickerFromWatchlist(listId, ticker);
  }
}
export default WatchlistEngine;
