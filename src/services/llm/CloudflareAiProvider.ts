import { DiscordNotifier } from '../../stockstory/gateway/monitoring/DiscordNotifier';

export class CloudflareAiProvider {
  private static accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  private static apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  private static targetModel = '@cf/meta/llama-3-8b-instruct';

  public static async generateResponseFallback(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!this.accountId || !this.apiToken) {
      throw new Error(
        'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in environment',
      );
    }

    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.targetModel}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Cloudflare Serverless Edge API returned status: ${response.status}`,
        );
      }

      const data = (await response.json()) as any;
      return (data.result?.response || '').trim();
    } catch (edgeError: any) {
      await DiscordNotifier.sendErrorAlert(
        'CLOUDFLARE_SERVERLESS_EDGE_FALLOVER_CRASH',
        edgeError,
      );
      throw edgeError;
    }
  }
}
