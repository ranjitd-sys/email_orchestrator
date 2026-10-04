import type { SendPayload } from "@email/shared";

export interface QueuePublisher {
  push(payload: SendPayload): Promise<void>;
}

export class LocalQueue implements QueuePublisher {
  readonly messages: SendPayload[] = [];

  async push(payload: SendPayload): Promise<void> {
    this.messages.push(payload);
  }

  drain(): SendPayload[] {
    return this.messages.splice(0);
  }
}

export interface CloudflareQueueConfig {
  accountId: string;
  queueId: string;
  apiToken: string;
}

export function cloudflareQueue(config: CloudflareQueueConfig): QueuePublisher {
  return {
    async push(payload) {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/queues/${config.queueId}/messages/push`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: [{ body: payload }] }),
        },
      );
      if (!response.ok) {
        throw new Error(`cloudflare queue push failed: HTTP ${response.status}`);
      }
    },
  };
}

export interface PublisherSelection {
  publisher: QueuePublisher;
  local: LocalQueue | null;
}

export function createPublisher(env: Record<string, string | undefined>): PublisherSelection {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const queueId = env.CLOUDFLARE_QUEUE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (accountId && queueId && apiToken) {
    return { publisher: cloudflareQueue({ accountId, queueId, apiToken }), local: null };
  }
  const local = new LocalQueue();
  return { publisher: local, local };
}