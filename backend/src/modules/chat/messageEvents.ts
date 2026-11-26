import { EventEmitter } from 'events';

export interface MessageChangeEvent {
  organizationId: string;
  conversationId: string;
  messageId?: string;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);
const latestEventVersions = new Map<string, number>();

const channelFor = (organizationId: string) => `messages:${organizationId}`;
const versionKeyFor = (organizationId: string, conversationId: string) => `${organizationId}:${conversationId}`;

export const publishMessageChange = (event: MessageChangeEvent): void => {
  if (!event.organizationId || !event.conversationId) return;
  const key = versionKeyFor(event.organizationId, event.conversationId);
  latestEventVersions.set(key, (latestEventVersions.get(key) || 0) + 1);
  if (latestEventVersions.size > 10000) {
    const oldestKey = latestEventVersions.keys().next().value;
    if (oldestKey) latestEventVersions.delete(oldestKey);
  }
  emitter.emit(channelFor(event.organizationId), event);
};

export const getMessageChangeVersion = (organizationId: string, conversationId: string): number =>
  latestEventVersions.get(versionKeyFor(organizationId, conversationId)) || 0;

export const waitForMessageChange = (
  organizationId: string,
  conversationId: string,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<'event' | 'timeout' | 'aborted'> => {
  if (signal?.aborted) return Promise.resolve('aborted');

  return new Promise((resolve) => {
    const channel = channelFor(organizationId);
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      emitter.removeListener(channel, onChange);
      signal?.removeEventListener('abort', onAbort);
    };

    const finish = (reason: 'event' | 'timeout' | 'aborted') => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(reason);
    };

    const onChange = (event: MessageChangeEvent) => {
      if (event.conversationId === conversationId) finish('event');
    };
    const onAbort = () => finish('aborted');
    const timer = setTimeout(() => finish('timeout'), timeoutMs);

    emitter.on(channel, onChange);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
};
