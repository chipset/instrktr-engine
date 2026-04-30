export type WebhookEventName =
  | 'step.pass'
  | 'step.check.failed'
  | 'step.solution.viewed';

export interface WebhookPayload {
  event: WebhookEventName;
  timestamp: string;
  user: { login: string | null };
  course: { id: string; title: string; version: string };
  step: { id: string; title: string; index: number; total: number };
  result?: { status: string; message: string };
}

export class WebhookClient {
  send(url: string, payload: WebhookPayload): void {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => {
      // Best-effort delivery — swallow errors silently
    });
  }
}
