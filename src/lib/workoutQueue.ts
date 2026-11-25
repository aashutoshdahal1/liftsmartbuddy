import { workoutsApi, type WorkoutPayload } from "./api";

const QUEUE_KEY = "ls_workout_queue";

interface QueuedWorkout {
  id: string; // local UUID for dedup
  payload: WorkoutPayload;
  queuedAt: string;
}

function readQueue(): QueuedWorkout[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedWorkout[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function queueWorkout(payload: WorkoutPayload): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const q = readQueue();
  q.push({ id, payload, queuedAt: new Date().toISOString() });
  writeQueue(q);
  return id;
}

export function pendingCount(): number {
  return readQueue().length;
}

/** Flush all queued workouts to the backend. Returns count synced. */
export async function flushQueue(): Promise<{ synced: number; failed: number; user?: unknown }> {
  const q = readQueue();
  if (q.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  let lastUser: unknown;
  const remaining: QueuedWorkout[] = [];

  for (const item of q) {
    try {
      const result = await workoutsApi.save(item.payload);
      if (result.user) lastUser = result.user;
      synced++;
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return { synced, failed, user: lastUser };
}

/** Call once on app boot — syncs any workouts that were saved while offline. */
export function initOfflineSync(onSync?: (synced: number, user: unknown) => void) {
  const tryFlush = async () => {
    if (!navigator.onLine) return;
    const { synced, user } = await flushQueue();
    if (synced > 0 && onSync) onSync(synced, user);
  };

  // Flush immediately on load (handles browser restart after offline session)
  tryFlush();

  // Flush whenever the tab comes back online
  window.addEventListener("online", tryFlush);
}
