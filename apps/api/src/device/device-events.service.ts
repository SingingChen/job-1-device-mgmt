import { Injectable } from '@nestjs/common';
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
 * NOTE: this is an in-memory bus, so it only reaches clients connected to the
 * SAME instance. To fan out across Cloud Run instances later, swap the
 * internals for GCP Pub/Sub WITHOUT changing callers:
 *   - publish() -> topic.publishMessage(JSON.stringify(event))
 *   - stream()  <- a per-instance subscription pushing into the Subject
 */
@Injectable()
export class DeviceEventsService {
  private readonly events$ = new Subject<DeviceEvent>();

  publish(event: DeviceEvent): void {
    this.events$.next(event);
  }

  stream(): Observable<DeviceEvent> {
    return this.events$.asObservable();
  }
}
