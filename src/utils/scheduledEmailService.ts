/**
 * Scheduled Email Service
 * Automatically send promotional campaigns on a schedule
 * Runs in the browser using simple scheduling
 */

export class ScheduledEmailService {
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start scheduled campaigns
   * In production, use a cron service or webhook
   */
  startScheduledCampaigns(): void {
    // Weekly digest every Monday at 9 AM
    this.scheduleWeekly('monday', 9, 'weekly_digest', 'all');

    // Premium upgrade offer every Friday at 10 AM (free users only)
    this.scheduleWeekly('friday', 10, 'upgrade_premium', 'free');

    // Re-engagement every Sunday at 8 AM (inactive users)
    this.scheduleWeekly('sunday', 8, 'reengagement', 'free_inactive');

    console.log('[Email Service] Scheduled campaigns initialized');
  }

  private scheduleWeekly(
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
    hour: number,
    campaignId: string,
    audience: string
  ): void {
    const dayIndex = this.getDayIndex(day);
    const now = new Date();
    const nextRun = this.getNextRun(dayIndex, hour);
    const delay = nextRun.getTime() - now.getTime();

    console.log(`[Email Schedule] ${day.toUpperCase()} at ${hour}:00 - ${campaignId} → ${audience}`);

    const timeout = setTimeout(() => {
      this.sendScheduledCampaign(campaignId, audience);
      // Reschedule for next week
      this.scheduleWeekly(day, hour, campaignId, audience);
    }, delay);

    this.schedules.set(`${day}_${hour}`, timeout);
  }

  private async sendScheduledCampaign(campaignId: string, audience: string): Promise<void> {
    try {
      console.log(`[Email Campaign] Sending ${campaignId} to ${audience}...`);

      // Get users
      const usersResponse = await fetch(`/api/get-users-by-tier?tier=${audience}`);
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      const { emails } = await usersResponse.json();

      if (emails.length === 0) {
        console.log('[Email Campaign] No users to send to');
        return;
      }

      // Send campaign
      const sendResponse = await fetch('/api/send-email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, emails }),
      });

      if (!sendResponse.ok) throw new Error('Failed to send campaign');
      const result = await sendResponse.json();

      console.log('[Email Campaign] Success:', {
        campaignId,
        sent: result.sent,
        failed: result.failed,
      });
    } catch (error) {
      console.error('[Email Campaign Error]', error);
    }
  }

  private getDayIndex(day: string): number {
    const days: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return days[day] || 0;
  }

  private getNextRun(dayIndex: number, hour: number): Date {
    const now = new Date();
    const nextRun = new Date();

    // Set to specified hour and minute 0
    nextRun.setHours(hour, 0, 0, 0);

    // Calculate days until target day
    const currentDay = now.getDay();
    let daysUntilTarget = dayIndex - currentDay;

    // If target day is today, check if time has passed
    if (daysUntilTarget === 0 && now.getHours() >= hour) {
      daysUntilTarget = 7;
    } else if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }

    nextRun.setDate(nextRun.getDate() + daysUntilTarget);
    return nextRun;
  }

  stopScheduledCampaigns(): void {
    this.schedules.forEach((timeout) => clearTimeout(timeout));
    this.schedules.clear();
    console.log('[Email Service] Scheduled campaigns stopped');
  }
}

export const scheduledEmailService = new ScheduledEmailService();
