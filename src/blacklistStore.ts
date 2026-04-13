const KEY = "rs-blacklist-v1";

function loadIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function getBlacklist(): Set<string> {
  return new Set(loadIds());
}

export function addToBlacklist(trackId: string): void {
  if (!trackId) return;
  const ids = loadIds();
  if (ids.includes(trackId)) return;
  save([trackId, ...ids].slice(0, 500));
}

export function removeFromBlacklist(trackId: string): void {
  const ids = loadIds().filter((id) => id !== trackId);
  save(ids);
}
