const API = "https://api.spotify.com/v1";

export type PlaylistSummary = { id: string; name: string };

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return res.statusText || `HTTP ${res.status}`;
    const j = JSON.parse(text) as { error?: { message?: string } };
    return j.error?.message ?? text;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

/** Whether each track id is in the user’s Liked Songs (same order as `ids`). */
export async function fetchTracksSavedState(
  accessToken: string,
  ids: string[],
): Promise<boolean[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({ ids: ids.join(",") });
  const res = await fetch(`${API}/me/tracks/contains?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  return res.json() as Promise<boolean[]>;
}

export async function saveTracksForUser(
  accessToken: string,
  ids: string[],
): Promise<void> {
  const res = await fetch(`${API}/me/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
}

export async function removeSavedTracksForUser(
  accessToken: string,
  ids: string[],
): Promise<void> {
  const res = await fetch(`${API}/me/tracks`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
}

/** Current user’s playlists (paginated, capped for UI). */
export async function fetchMyPlaylists(
  accessToken: string,
  maxTotal = 200,
): Promise<PlaylistSummary[]> {
  const out: PlaylistSummary[] = [];
  let url: string | null = `${API}/me/playlists?limit=50&offset=0`;

  while (url && out.length < maxTotal) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(await parseErrorBody(res));
    }
    const data = (await res.json()) as {
      items: { id: string; name: string }[];
      next: string | null;
    };
    for (const it of data.items) {
      out.push({ id: it.id, name: it.name });
    }
    url = data.next;
  }
  return out;
}

export async function addTrackUrisToPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  const res = await fetch(`${API}/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
}
