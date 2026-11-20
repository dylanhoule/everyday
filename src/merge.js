// Per-item last-write-wins merge for cross-device sync.
// Tasks carry `updatedAt` (ms epoch); missing is treated as 0 so any real edit
// beats a stale seeded/legacy record. Deletes are soft (tombstones) so they
// propagate across devices; old tombstones are purged to bound growth.

const ts = (t) => t.updatedAt ?? 0;
const PURGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Union two task lists by id, keeping the newer record for each id.
export function merge(a, b) {
  const byId = new Map();
  for (const t of a) byId.set(t.id, t);
  for (const t of b) {
    const prev = byId.get(t.id);
    if (!prev || ts(t) >= ts(prev)) byId.set(t.id, t);
  }
  return [...byId.values()];
}

// Retire leftovers from the deleted training plan: any undone seeded task not in keepIds.
// Tombstones rather than plain removals so the retirement propagates through merge() to other
// devices and to the sync store. Done tasks are left alone: they're history of what happened,
// and user-added tasks have UUID ids, so the `plan-` prefix check never touches them.
export function retireStale(list, keepIds, now = Date.now()) {
  return list.map((t) =>
    t.id.startsWith('plan-') && !keepIds.has(t.id) && !t.done && !t.deleted
      ? { ...t, deleted: true, updatedAt: now }
      : t
  );
}

// Drop tombstones older than PURGE_MS. `now` is injectable for testing.
export function purge(list, now = Date.now()) {
  return list.filter((t) => !(t.deleted && now - ts(t) > PURGE_MS));
}
