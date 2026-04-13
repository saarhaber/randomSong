import type { HistoryEntry, NowPlaying } from "./trackUtils";

const KEY = "rs-history-v1";
const MAX = 120;

function loadRaw(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is HistoryEntry =>
        row &&
        typeof row === "object" &&
        "id" in row &&
        typeof (row as HistoryEntry).id === "string" &&
        "playedAt" in row,
    );
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota */
  }
}

export function getHistory(): HistoryEntry[] {
  return loadRaw();
}

/** IDs from the most recent `max` plays (for avoiding immediate repeats). */
export function getRecentTrackIds(max: number): string[] {
  if (max <= 0) return [];
  return loadRaw()
    .slice(0, max)
    .map((e) => e.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function appendHistory(track: NowPlaying): void {
  if (!track.id) return;
  const prev = loadRaw();
  const entry: HistoryEntry = {
    ...track,
    playedAt: new Date().toISOString(),
  };
  const withoutDup = prev.filter((e) => e.id !== track.id);
  const next = [entry, ...withoutDup].slice(0, MAX);
  save(next);
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
