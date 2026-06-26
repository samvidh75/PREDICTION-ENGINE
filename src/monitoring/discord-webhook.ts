const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

export async function notifyDiscord(alert: string) {
  if (!DISCORD_WEBHOOK) return;

  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `⚠️ **StockStory Alert**: ${alert}`,
      username: 'StockStory Monitor',
    }),
  });
}
