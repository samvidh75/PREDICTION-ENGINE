/**
 * Waitlist configuration types for beta access management.
 */

export interface WaitlistEntry {
  id: string;
  email: string;
  name?: string;
  source?: string;
  referredBy?: string;
  status: "pending" | "invited" | "active" | "declined";
  position: number;
  createdAt: string;
  invitedAt?: string;
  activatedAt?: string;
}
