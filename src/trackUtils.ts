export const DEFAULT_IMG =
  "https://images.squarespace-cdn.com/content/v1/585e12abe4fcb5ea1248900e/1521163355433-O0YP7FRVMXHTCHB1O4CU/ke17ZwdGBToddI8pDm48kPx25wW2-RVvoRgxIT6HShBZw-zPPgdn4jUwVcJE1ZvWQUxwkmyExglNqGp0IvTJZUJFbgE-7XRK3dMEBRBhUpx0Qh3eD5PfZ_nDR0M7OIGaTx-0Okj4hzQeRKYKbt7WfTYFScRKDTW78PcnUqBGqX8/Spotify+Square.png";

export type NowPlaying = {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  uri: string;
  externalUrl: string;
};

export type HistoryEntry = NowPlaying & { playedAt: string };

export function emptyNowPlaying(): NowPlaying {
  return {
    id: "",
    name: "",
    artist: "",
    album: "",
    image: DEFAULT_IMG,
    uri: "",
    externalUrl: "",
  };
}

type TrackLike = {
  id: string;
  name: string;
  artists: { name: string }[];
  album?: { name: string; images: { url: string }[] };
  uri: string;
  external_urls?: { spotify?: string };
};

export function trackToNowPlaying(t: TrackLike): NowPlaying {
  return {
    id: t.id,
    name: t.name,
    artist: t.artists[0]?.name ?? "",
    album: t.album?.name ?? "",
    image: t.album?.images[0]?.url ?? DEFAULT_IMG,
    uri: t.uri,
    externalUrl: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
  };
}

export function appBaseUrl(): string {
  if (typeof window === "undefined") {
    return "https://saarhaber.github.io/randomSong/";
  }
  const base = import.meta.env.BASE_URL;
  return new URL(base, window.location.origin).href;
}
