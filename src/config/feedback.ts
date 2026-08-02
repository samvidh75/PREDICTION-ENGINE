export type FeedbackCategory =
  | "bug"
  | "feature-request"
  | "accuracy"
  | "ux"
  | "data-quality"
  | "content"
  | "other";

export interface FeedbackSubmission {
  category: FeedbackCategory;
  title: string;
  body: string;
  email?: string;
  pageUrl?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackEntry extends FeedbackSubmission {
  id: string;
  status: "new" | "reviewed" | "triaged" | "resolved";
  createdAt: string;
  updatedAt: string;
}
