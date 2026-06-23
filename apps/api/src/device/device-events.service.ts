import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PubSub, type Subscription } from '@google-cloud/pubsub';
import { Observable, Subject } from 'rxjs';

/** A device mutation worth pushing to connected clients. */
export interface DeviceEvent {
  type: 'created' | 'updated' | 'deleted';
  id: string;
  ownerId: string;
}

/**
 * Event bus for device changes. The SSE endpoint subscribes via `stream()`;
 * DeviceService calls `publish()` after each mutation.
 *
 * Transport is chosen by env:
 *  - PUBSUB_TOPIC set  -> GCP Pub/Sub. Each instance creates its OWN ephemeral
 *    subscription to the topic, so a change published by ANY backend instance
 *    (or environment) fans out to every instance's SSE listeners.
 *  - PUBSUB_TOPIC unset -> in-memory Subject (single-process; for local dev).
 *
 * Either way, callers (DeviceService / DeviceController) only use publish() and
 * stream() and never need to know which transport is active.
 */
@Injectable()
export class DeviceEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceEventsService.name);
  private readonly events$ = new Subject<DeviceEvent>();
  private readonly topicName = process.env.PUBSUB_TOPIC;

  private pubsub?: PubSub;
  private subscription?: Subscription;

  async onModuleInit(): Promise<void> {
    if (!this.topicName) {
      this.logger.warn('PUBSUB_TOPIC not set — using in-memory event bus');
      return;
    }

    // A per-instance subscription gives every instance a copy of every message
    // (broadcast). expirationPolicy auto-removes orphans left by crashed pods.
    const subName = `${this.topicName}-${randomUUID()}`;
    try {
      this.pubsub = new PubSub();
      const [subscription] = await this.pubsub
        .topic(this.topicName)
        .createSubscription(subName, {
          expirationPolicy: { ttl: { seconds: 86400 } },
          messageRetentionDuration: { seconds: 600 },
        });
      this.subscription = subscription;

      subscription.on('message', (message) => {
        try {
          this.events$.next(JSON.parse(message.data.toString()) as DeviceEvent);
        } catch (e) {
          this.logger.error(`Bad event payload: ${(e as Error).message}`);
        } finally {
          message.ack();
        }
      });
      subscription.on('error', (e: Error) =>
        this.logger.error(`Pub/Sub subscription error: ${e.message}`),
      );

      this.logger.log(`Subscribed to topic ${this.topicName} as ${subName}`);
    } catch (e) {
      // Don't let a Pub/Sub misconfig crash the app — fall back to in-memory
      // (within-instance realtime still works; no cross-instance fan-out).
      this.pubsub = undefined;
      this.subscription = undefined;
      this.logger.error(
        `Pub/Sub init failed, falling back to in-memory: ${(e as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Best-effort cleanup of this instance's subscription on shutdown (SIGTERM).
    await this.subscription?.delete().catch(() => undefined);
    await this.pubsub?.close().catch(() => undefined);
  }

  publish(event: DeviceEvent): void {
    if (this.pubsub && this.topicName) {
      // Our own subscription will deliver this back to us, so we do NOT also
      // push it into events$ here (that would double-emit on this instance).
      this.pubsub
        .topic(this.topicName)
        .publishMessage({ json: event })
        .catch((e: Error) =>
          this.logger.error(`Pub/Sub publish failed: ${e.message}`),
        );
    } else {
      this.events$.next(event);
    }
  }

  stream(): Observable<DeviceEvent> {
    return this.events$.asObservable();
  }
}
