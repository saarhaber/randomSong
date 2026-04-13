/**
 * spotify-web-api-js rejects failed HTTP calls with the raw XMLHttpRequest
 * (see spotify-web-api.js _performRequest → reject(req)). Convert that into a
 * readable message instead of "[object XMLHttpRequest]".
 */
export function formatSpotifyApiError(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }

  if (
    typeof XMLHttpRequest !== "undefined" &&
    e instanceof XMLHttpRequest
  ) {
    const status = e.status;
    let detail = "";
    try {
      const raw = e.responseText;
      if (raw) {
        const j = JSON.parse(raw) as {
          error?: { message?: string; reason?: string };
        };
        detail = j.error?.message ?? j.error?.reason ?? "";
      }
    } catch {
      /* ignore */
    }

    if (detail) {
      return status ? `${status}: ${detail}` : detail;
    }

    if (status === 429) {
      return "Too many requests — wait a moment and try again.";
    }
    if (status === 401) {
      return "Session expired — log in again.";
    }
    if (status === 403) {
      return "Spotify refused this action (Premium or device may be required).";
    }
    if (status === 404) {
      return "Playback device not found — open Spotify on a device.";
    }
    if (status === 204) {
      return "No active device — open Spotify and try again.";
    }
    if (status >= 400) {
      return `Request failed (${status}). Try again in a moment.`;
    }

    return "Request failed. Try again in a moment.";
  }

  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m.length > 0) {
      return m;
    }
  }

  return "Something went wrong. Try again in a moment.";
}
