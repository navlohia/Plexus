/**
 * src/world/eventLog.ts
 * Append-Only Event Log with LocalStorage, BroadcastChannel Nudges, Idempotency and Undo
 * PORTAL_SPEC.md Section 1.4 & 1.6
 */

import { STORAGE_KEY_EVENTS, CHANNEL_NAME, MAX_EVENTS_CAP, UNDO_WINDOW_MS } from './config';
import type { WorldEvent } from './types';

type EventListener = (events: WorldEvent[]) => void;

class EventLogManager {
  private listeners = new Set<EventListener>();
  private channel: BroadcastChannel | null = null;
  private cachedEvents: WorldEvent[] | null = null;

  constructor() {
    this.initChannel();
    this.initStorageListener();
  }

  private initChannel() {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          // BroadcastChannel nudges only: sender does not receive its own message
          if (event && event.data && event.data.type === 'append') {
            this.invalidateCache();
            this.notifyListeners();
          }
        };
      } catch (err) {
        // Fallback gracefully if BroadcastChannel fails
        this.channel = null;
      }
    }
  }

  private initStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_EVENTS) {
          this.invalidateCache();
          this.notifyListeners();
        }
      });
    }
  }

  private invalidateCache() {
    this.cachedEvents = null;
  }

  private notifyListeners() {
    const events = this.getAllEvents();
    this.listeners.forEach((listener) => {
      try {
        listener(events);
      } catch (err) {
        console.error('[EventLog] Listener error:', err);
      }
    });
  }

  /**
   * Load all events from localStorage (Storage is source of truth)
   */
  public getAllEvents(): WorldEvent[] {
    if (this.cachedEvents !== null) {
      return this.cachedEvents;
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      this.cachedEvents = [];
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (!raw) {
        this.cachedEvents = [];
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.cachedEvents = parsed;
        return parsed;
      }
    } catch (err) {
      console.warn('[EventLog] Failed to read events from storage:', err);
    }

    this.cachedEvents = [];
    return [];
  }

  /**
   * Append an event idempotently
   */
  public appendEvent(event: WorldEvent): boolean {
    const events = this.getAllEvents();

    // Idempotency check: duplicate event.id is a no-op
    if (events.some((e) => e.id === event.id)) {
      return false;
    }

    // Special handling for ResetDemo
    if (event.type === 'ResetDemo') {
      this.clearLog();
      return true;
    }

    // Special handling for UndoApplied: check 8s undo window
    if (event.type === 'UndoApplied') {
      const targetId = event.payload?.targetEventId;
      const targetEvent = events.find((e) => e.id === targetId);
      if (!targetEvent) {
        return false;
      }
      // Must be same actor
      if (targetEvent.actor !== event.actor) {
        return false;
      }
      // Must be within 8s (either sim time or real time window)
      if (Math.abs(event.at - targetEvent.at) > UNDO_WINDOW_MS) {
        return false;
      }
    }

    // Append and enforce cap
    const updated = [...events, event];
    if (updated.length > MAX_EVENTS_CAP) {
      updated.splice(0, updated.length - MAX_EVENTS_CAP);
    }

    this.cachedEvents = updated;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(updated));
      } catch (err) {
        console.error('[EventLog] Storage write failure:', err);
      }
    }

    // Broadcast nudge to other tabs (does not echo to sender)
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'append', id: event.id });
      } catch {
        // channel error ignored
      }
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Clear the event log completely (ResetDemo)
   */
  public clearLog(): void {
    this.cachedEvents = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY_EVENTS);
      } catch {
        // ignore
      }
    }

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'append', id: 'reset' });
      } catch {
        // ignore
      }
    }

    this.notifyListeners();
  }

  /**
   * Subscribe to event additions across tabs
   */
  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const eventLog = new EventLogManager();

export function createEventId(type: string): string {
  return `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function canUndoEvent(targetEvent: WorldEvent, actor: string, atTime: number): boolean {
  if (!targetEvent) return false;
  if (targetEvent.actor !== actor) return false;
  return Math.abs(atTime - targetEvent.at) <= UNDO_WINDOW_MS;
}

export function getEventLog(): WorldEvent[] {
  return eventLog.getAllEvents();
}

export function appendEvent(event: WorldEvent): WorldEvent | null {
  const success = eventLog.appendEvent(event);
  return success ? event : null;
}

export function clearEventLog(): void {
  eventLog.clearLog();
}


