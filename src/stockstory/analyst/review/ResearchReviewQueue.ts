/**
 * ResearchReviewQueue — in-memory review queue (internal-only).
 */

import { stableHash } from '../../utils/hash';
import type { ResearchReviewItem, ReviewStatus, ReviewTrigger } from './ResearchReviewTypes';

export class ResearchReviewQueue {
  private items = new Map<string, ResearchReviewItem>();

  enqueue(params: {
    outputId: string;
    symbol?: string;
    sector?: string;
    triggers: ReviewTrigger[];
    confidenceScore: number;
  }): ResearchReviewItem {
    const id = `review_${stableHash(`${params.outputId}_${Date.now()}`)}`;
    const now = new Date().toISOString();
    const item: ResearchReviewItem = {
      id,
      outputId: params.outputId,
      symbol: params.symbol,
      sector: params.sector,
      triggers: params.triggers,
      status: 'pending_review',
      confidenceScore: params.confidenceScore,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(id, item);
    return item;
  }

  get(id: string): ResearchReviewItem | null {
    return this.items.get(id) ?? null;
  }

  list(status?: ReviewStatus): ResearchReviewItem[] {
    let items = [...this.items.values()];
    if (status) items = items.filter((i) => i.status === status);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  approve(id: string, note?: string): ResearchReviewItem | null {
    return this.updateStatus(id, 'approved', note);
  }

  reject(id: string, note?: string): ResearchReviewItem | null {
    return this.updateStatus(id, 'rejected', note);
  }

  private updateStatus(id: string, status: ReviewStatus, note?: string): ResearchReviewItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    const updated: ResearchReviewItem = {
      ...item,
      status,
      reviewerNote: note,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }

  clear(): void {
    this.items.clear();
  }
}

export const defaultResearchReviewQueue = new ResearchReviewQueue();
