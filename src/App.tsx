import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Spotify from "spotify-web-api-js";
import "./App.css";
import { HistoryPanel } from "./components/HistoryPanel";
import { Logo } from "./components/Logo";
import { ThemeToggle } from "./components/ThemeToggle";
import { addToBlacklist, getBlacklist } from "./blacklistStore";
import { appendHistory, clearHistory, getHistory, getRecentTrackIds } from "./historyStore";
import {
  beginLogin,
  clearStoredTokens,
  ensureValidAccessToken,
  exchangeCodeForTokens,
  getClientId,
  androidUsesSpotifyAppIntentForLogin,
  beginLoginTrySpotifyAppIntent,
  isAndroidMobile,
  isIosMobile,
  parseOAuthCallback,
  SPOTIFY_ACCOUNTS_LOGIN_URL,
  validateOAuthState,
} from "./spotifyPkce";
import { formatSpotifyApiError } from "./spotifyErrors";
import {
  addTrackUrisToPlaylist,
  fetchMyPlaylists,
  fetchTracksSavedState,
  removeSavedTracksForUser,
  saveTracksForUser,
  type PlaylistSummary,
} from "./spotifyLibraryApi";
import { applyTheme, type ThemeMode, toggleTheme } from "./theme";
import { randomInt } from "./random";
import { randomSearchQuery } from "./randomSearchQuery";
import {
  appBaseUrl,
  emptyNowPlaying,
  trackToNowPlaying,
  type HistoryEntry,
  type NowPlaying,
} from "./trackUtils";

const spotify = new Spotify();

const SEARCH_ATTEMPTS_MAX = 5;
/** Prefer a new search slice if the filtered pool is this small (when attempts remain). */
const MIN_POOL_BEFORE_RETRY = 3;
/** Exclude these many most recent plays when building the candidate pool. */
const HISTORY_EXCLUDE_RECENT = 15;

function truncatePlaylistName(name: string, max = 72): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function buildTrackPool<T extends { id: string }>(
  items: T[],
  blacklist: Set<string>,
  recentIds: Set<string>,
): T[] {
  let pool = items.filter((t) => !blacklist.has(t.id) && !recentIds.has(t.id));
  if (pool.length === 0) {
    pool = items.filter((t) => !blacklist.has(t.id));
  }
  if (pool.length === 0) {
    pool = items.slice();
  }
  return pool;
}

const MARKETS = [
  "AD",
  "AR",
  "AT",
  "AU",
  "BE",
  "BG",
  "BO",
  "BR",
  "CA",
  "CH",
  "CL",
  "CO",
  "CR",
  "CY",
  "CZ",
  "DE",
  "DK",
  "DO",
  "EC",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "GT",
  "HK",
  "HN",
  "HU",
  "ID",
  "IE",
  "IL",
  "IS",
  "IT",
  "JP",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MT",
  "MX",
  "MY",
  "NI",
  "NL",
  "NO",
  "NZ",
  "PA",
  "PE",
  "PH",
  "PL",
  "PT",
  "PY",
  "RO",
  "SE",
  "SG",
  "SK",
  "SV",
  "TH",
  "TR",
  "TW",
  "US",
  "UY",
  "VN",
  "ZA",
] as const;

function initialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem("rs-theme");
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sharedTrackId = searchParams.get("track");

  const [ready, setReady] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userImg, setUserImg] = useState("");
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(() => emptyNowPlaying());
  const [playing, setPlaying] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => getHistory());
  const [sharedPreview, setSharedPreview] = useState<NowPlaying | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [librarySaved, setLibrarySaved] = useState<boolean | null>(null);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);
  const [playlistSelectKey, setPlaylistSelectKey] = useState(0);
  const playInFlight = useRef(false);
  const shareInFlight = useRef(false);
  const playNowRef = useRef<() => Promise<void>>(async () => {});
  /** Last polled playback snapshot for the same track (detect end-of-track). */
  const playbackSnapRef = useRef<{
    trackId: string;
    isPlaying: boolean;
    progress: number;
    duration: number;
  } | null>(null);
  /** Avoid double-firing auto-chain for the same track id. */
  const autoChainedFromTrackRef = useRef<string | null>(null);

  const refreshHistory = useCallback(() => {
    setHistoryEntries(getHistory());
  }, []);

  const applyToken = useCallback(async (token: string) => {
    spotify.setAccessToken(token);
    const me = await spotify.getMe();
    setDisplayName(me.display_name ?? "Spotify user");
    const img = me.images?.[0]?.url;
    setUserImg(img ?? "");
    setLoggedIn(true);

    const playback = await spotify.getMyCurrentPlaybackState();
    if (playback?.is_playing && playback.item && "name" in playback.item) {
      const t = playback.item;
      setNowPlaying(trackToNowPlaying(t));
    } else {
      const recent = await spotify.getMyRecentlyPlayedTracks({ limit: 1 });
      const first = recent.items[0]?.track;
      if (first) {
        setNowPlaying(trackToNowPlaying(first));
      }
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!loggedIn || !nowPlaying.id) {
      setLibrarySaved(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await ensureValidAccessToken();
        if (!token || cancelled) return;
        const [saved] = await fetchTracksSavedState(token, [nowPlaying.id]);
        if (!cancelled) setLibrarySaved(!!saved);
      } catch {
        if (!cancelled) setLibrarySaved(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn, nowPlaying.id]);

  useEffect(() => {
    if (!sharedTrackId) {
      setSharedPreview(null);
      return;
    }
    let cancelled = false;

    async function loadShared() {
      const id = sharedTrackId;
      if (!id) return;
      const token = await ensureValidAccessToken();
      if (!token) {
        setSharedPreview(null);
        return;
      }
      try {
        spotify.setAccessToken(token);
        const t = await spotify.getTrack(id);
        if (!cancelled && t) {
          setSharedPreview(trackToNowPlaying(t));
        }
      } catch {
        if (!cancelled) setSharedPreview(null);
      }
    }

    void loadShared();
    return () => {
      cancelled = true;
    };
  }, [sharedTrackId, loggedIn]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setOauthBusy(true);
      setError(null);

      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      if (oauthError) {
        setError(`Spotify login: ${oauthError}`);
        navigate("/", { replace: true });
        setOauthBusy(false);
        setReady(true);
        return;
      }

      const callback = parseOAuthCallback();
      if (callback) {
        try {
          getClientId();
          if (!validateOAuthState(callback.state)) {
            throw new Error("Invalid OAuth state — try logging in again.");
          }
          await exchangeCodeForTokens(callback.code);
          navigate("/", { replace: true });
        } catch (e) {
          const msg = formatSpotifyApiError(e);
          if (!cancelled) setError(msg);
          navigate("/", { replace: true });
          setOauthBusy(false);
          setReady(true);
          return;
        }
      }

      try {
        getClientId();
      } catch (e) {
        const msg = formatSpotifyApiError(e);
        if (!cancelled) setError(msg);
        setOauthBusy(false);
        setReady(true);
        return;
      }

      const token = await ensureValidAccessToken();
      if (cancelled) return;
      if (token) {
        try {
          await applyToken(token);
        } catch (e) {
          const msg = formatSpotifyApiError(e);
          setError(msg);
          clearStoredTokens();
          setLoggedIn(false);
        }
      }
      refreshHistory();
      setOauthBusy(false);
      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyToken, navigate, refreshHistory]);

  const getNowPlaying = useCallback(async () => {
    const playback = await spotify.getMyCurrentPlaybackState();
    if (playback?.is_playing && playback.item && "name" in playback.item) {
      const t = playback.item;
      setNowPlaying(trackToNowPlaying(t));
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!nowPlaying.id || shareInFlight.current) return;
    shareInFlight.current = true;
    const base = appBaseUrl().replace(/\/$/, "");
    const appWithTrack = `${base}/?track=${encodeURIComponent(nowPlaying.id)}`;
    const text = `I found "${nowPlaying.name}" by ${nowPlaying.artist} on Random Song — ${appWithTrack}\n${nowPlaying.externalUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Random Song",
          text,
          url: appWithTrack,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setToast("Copied to clipboard");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(text);
          setToast("Copied to clipboard");
        } catch {
          setToast("Could not share — copy the link manually");
        }
      }
    } finally {
      shareInFlight.current = false;
    }
  }, [nowPlaying]);

  const playNow = useCallback(async () => {
    if (playInFlight.current) {
      return;
    }
    playInFlight.current = true;
    setError(null);
    setPlaying(true);
    try {
      const token = await ensureValidAccessToken();
      if (!token) {
        setError("Not logged in.");
        return;
      }
      spotify.setAccessToken(token);

      const devices = await spotify.getMyDevices();
      const hasActive = devices.devices.some((d) => d.is_active);
      if (!hasActive) {
        setError(
          "Open Spotify on a phone, desktop, or web player and start playback once so this app can control a device.",
        );
        return;
      }

      /** Spotify search: limit + offset must not exceed 1000. */
      const searchLimit = 50;
      const maxOffset = 1000 - searchLimit;
      const blacklist = getBlacklist();
      const recentIds = new Set(getRecentTrackIds(HISTORY_EXCLUDE_RECENT));

      let pick:
        | NonNullable<
            NonNullable<Awaited<ReturnType<typeof spotify.search>>["tracks"]>["items"]
          >[number]
        | undefined;
      for (let attempt = 0; attempt < SEARCH_ATTEMPTS_MAX; attempt++) {
        const market = MARKETS[randomInt(MARKETS.length)]!;
        const search = randomSearchQuery();
        const offset = randomInt(maxOffset + 1);
        const response = await spotify.search(search, ["track"], {
          market,
          limit: searchLimit,
          offset,
        });
        const items = response.tracks?.items ?? [];
        if (items.length === 0) {
          continue;
        }
        const pool = buildTrackPool(items, blacklist, recentIds);
        const tooSmall =
          pool.length < MIN_POOL_BEFORE_RETRY && attempt < SEARCH_ATTEMPTS_MAX - 1;
        if (tooSmall) {
          continue;
        }
        pick = pool[randomInt(pool.length)]!;
        break;
      }

      if (!pick) {
        setError("No tracks returned — try again.");
        return;
      }
      await spotify.play({ uris: [pick.uri] });
      const played = trackToNowPlaying(pick);
      setNowPlaying(played);
      appendHistory(played);
      refreshHistory();
      await new Promise((r) => setTimeout(r, 800));
      await getNowPlaying();
    } catch (e) {
      setError(formatSpotifyApiError(e));
    } finally {
      playInFlight.current = false;
      setPlaying(false);
    }
  }, [getNowPlaying, refreshHistory]);

  playNowRef.current = playNow;

  /** When the active Spotify track ends (near end, then stops), queue another random song. */
  useEffect(() => {
    if (!loggedIn || !ready) {
      playbackSnapRef.current = null;
      autoChainedFromTrackRef.current = null;
      return;
    }

    const NEAR_END_MS = 4000;
    const STUCK_NEAR_END_MS = 3000;
    const POLL_MS = 2000;

    const tick = async () => {
      if (playInFlight.current) return;
      try {
        const token = await ensureValidAccessToken();
        if (!token) return;
        spotify.setAccessToken(token);
        const playback = await spotify.getMyCurrentPlaybackState();
        const raw = playback?.item;
        if (!raw || !("album" in raw)) {
          playbackSnapRef.current = null;
          return;
        }
        const track = raw as { id: string; duration_ms: number };
        const duration = track.duration_ms ?? 0;
        const progress = playback.progress_ms ?? 0;
        const isPlaying = playback.is_playing ?? false;
        const trackId = track.id;

        const prev = playbackSnapRef.current;
        const next = { trackId, isPlaying, progress, duration };

        const transitionEnded =
          prev &&
          prev.trackId === trackId &&
          prev.isPlaying &&
          !isPlaying &&
          duration > 0 &&
          prev.progress >= duration - NEAR_END_MS;

        const stuckEnded =
          prev &&
          prev.trackId === trackId &&
          !isPlaying &&
          duration > 0 &&
          progress >= duration - STUCK_NEAR_END_MS;

        if (
          (transitionEnded || stuckEnded) &&
          autoChainedFromTrackRef.current !== trackId
        ) {
          autoChainedFromTrackRef.current = trackId;
          void playNowRef.current();
        }

        playbackSnapRef.current = next;
      } catch {
        /* ignore network / rate limits */
      }
    };

    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [loggedIn, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (loggedIn && !playing) {
          void playNow();
        }
      }
      if (e.key === "s" || e.key === "S") {
        if (nowPlaying.id) {
          void handleShare();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loggedIn, playing, playNow, nowPlaying.id, handleShare]);

  const onLogin = () => {
    setError(null);
    void beginLogin().catch((e) => {
      setError(formatSpotifyApiError(e));
    });
  };

  const onLoginTrySpotifyApp = () => {
    setError(null);
    void beginLoginTrySpotifyAppIntent().catch((e) => {
      setError(formatSpotifyApiError(e));
    });
  };

  const onLogout = () => {
    clearStoredTokens();
    setLoggedIn(false);
    setDisplayName("");
    setUserImg("");
    setNowPlaying(emptyNowPlaying());
    setError(null);
    setSharedPreview(null);
    setLibrarySaved(null);
    setPlaylists([]);
    setPlaylistsLoaded(false);
    setPlaylistSelectKey((k) => k + 1);
    playbackSnapRef.current = null;
    autoChainedFromTrackRef.current = null;
  };

  const onClearHistory = () => {
    clearHistory();
    refreshHistory();
  };

  const onThemeToggle = () => {
    setTheme((prev) => toggleTheme(prev));
  };

  const onBlacklistCurrent = () => {
    if (!nowPlaying.id) return;
    addToBlacklist(nowPlaying.id);
    setToast("Track won’t be picked again (unless no alternatives)");
  };

  const ensurePlaylistsLoaded = useCallback(async () => {
    if (playlistsLoaded || playlistsLoading) return;
    setPlaylistsLoading(true);
    try {
      const token = await ensureValidAccessToken();
      if (!token) return;
      const list = await fetchMyPlaylists(token);
      setPlaylists(list);
      setPlaylistsLoaded(true);
    } catch (e) {
      setError(formatSpotifyApiError(e));
    } finally {
      setPlaylistsLoading(false);
    }
  }, [playlistsLoaded, playlistsLoading]);

  const onToggleLibrary = useCallback(async () => {
    if (!nowPlaying.id || libraryBusy) return;
    const wantSave = librarySaved !== true;
    setLibraryBusy(true);
    setError(null);
    try {
      const token = await ensureValidAccessToken();
      if (!token) {
        setError("Not logged in.");
        return;
      }
      if (wantSave) {
        await saveTracksForUser(token, [nowPlaying.id]);
        setLibrarySaved(true);
        setToast("Saved to Liked Songs");
      } else {
        await removeSavedTracksForUser(token, [nowPlaying.id]);
        setLibrarySaved(false);
        setToast("Removed from Liked Songs");
      }
    } catch (e) {
      setError(formatSpotifyApiError(e));
    } finally {
      setLibraryBusy(false);
    }
  }, [libraryBusy, librarySaved, nowPlaying.id]);

  const onAddToPlaylist = useCallback(
    async (playlistId: string) => {
      if (!playlistId || !nowPlaying.uri) return;
      setError(null);
      try {
        const token = await ensureValidAccessToken();
        if (!token) {
          setError("Not logged in.");
          return;
        }
        await addTrackUrisToPlaylist(token, playlistId, [nowPlaying.uri]);
        const name = playlists.find((p) => p.id === playlistId)?.name ?? "playlist";
        setToast(`Added to “${truncatePlaylistName(name)}”`);
      } catch (e) {
        setError(formatSpotifyApiError(e));
      } finally {
        setPlaylistSelectKey((k) => k + 1);
      }
    },
    [nowPlaying.uri, playlists],
  );

  if (!ready || oauthBusy) {
    return (
      <div className="shell shell--center">
        <div className="brand brand--hero">
          <Logo className="logo-lg" />
          <h1 className="app-title">Random Song</h1>
        </div>
        <p className="meta">Loading…</p>
      </div>
    );
  }

  const sharedOpenUrl = sharedTrackId
    ? `https://open.spotify.com/track/${sharedTrackId}`
    : "";

  return (
    <div className="shell">
      <header className="top-bar">
        <div className="brand">
          <Logo />
          <h1 className="brand__name">Random Song</h1>
        </div>
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </header>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}

      <div className="layout">
        <main className="main">
          {sharedTrackId ? (
            <section className="shared-banner" aria-label="Shared track">
              {sharedPreview ? (
                <div className="shared-banner__inner">
                  <img
                    className="shared-banner__cover"
                    src={sharedPreview.image}
                    alt=""
                    width={56}
                    height={56}
                  />
                  <div>
                    <div className="shared-banner__label">Shared track</div>
                    <div className="shared-banner__title">{sharedPreview.name}</div>
                    <div className="shared-banner__artist">{sharedPreview.artist}</div>
                  </div>
                  <a
                    className="btn btn-secondary btn-sm"
                    href={sharedPreview.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Spotify
                  </a>
                </div>
              ) : (
                <div className="shared-banner__inner shared-banner__inner--compact">
                  <span className="shared-banner__label">Shared track</span>
                  <a
                    className="link-inline"
                    href={sharedOpenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Spotify
                  </a>
                  {loggedIn ? <span className="meta">Loading details…</span> : null}
                </div>
              )}
            </section>
          ) : null}

          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}

          {!loggedIn ? (
            <div className="card card--auth">
              <p className="login-lead">
                Connect once so Random Song can control playback on your Spotify devices.{" "}
                <strong>Premium</strong> is required.
              </p>
              <button type="button" className="btn btn-lg" onClick={onLogin}>
                Connect Spotify
              </button>
              {isAndroidMobile() ? (
                androidUsesSpotifyAppIntentForLogin() ? (
                  <p className="hint hint--tight">
                    On Android, this opens the <strong>Spotify app</strong> if it’s installed (you stay
                    logged in there). Otherwise your browser completes sign-in.
                  </p>
                ) : (
                  <>
                    <p className="hint hint--tight">
                      On Android with this browser, Spotify sign-in opens <strong>in the browser</strong>.
                      Use the same account you use in the Spotify app.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm login-app-try"
                      onClick={onLoginTrySpotifyApp}
                    >
                      Try opening in Spotify app
                    </button>
                    <p className="hint hint--tight">
                      Sites can’t force Android to open another app—only the browser and OS can. This
                      uses the same app link as Chrome; if nothing happens, allow app links for Spotify
                      in Brave’s settings or complete connect in{" "}
                      <strong>Chrome</strong> for a reliable handoff.
                    </p>
                  </>
                )
              ) : isIosMobile() ? (
                <p className="hint hint--tight">
                  On iPhone, sign-in happens in Safari. If you only use Spotify in the app, use the{" "}
                  <strong>same email</strong> or tap <strong>Continue with Apple / Google</strong> on
                  Spotify’s page — that matches many app accounts.
                </p>
              ) : (
                <p className="hint hint--tight">
                  Use the same Spotify account you use in the app. If the browser asks for a password
                  but the app logs you in automatically, you may need to set a Spotify password or use
                  Google/Apple on the web.
                </p>
              )}
              <p className="login-warmup">
                <span className="login-warmup__label">Having trouble?</span>{" "}
                <a
                  href={SPOTIFY_ACCOUNTS_LOGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="login-warmup__link"
                >
                  Log in to Spotify in the browser first
                </a>{" "}
                (cookies are shared with Connect in this browser), then tap{" "}
                <strong>Connect Spotify</strong> again.
              </p>
              <p className="hint">
                Open the Spotify app on a phone or desktop first if playback does not start after you
                connect.
              </p>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="user-row">
                  <span className="meta">
                    Logged in as <strong>{displayName}</strong>
                  </span>
                  {userImg ? <img className="avatar" src={userImg} alt="" /> : null}
                </div>
                <div className="actions-row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void playNow()}
                    disabled={playing}
                  >
                    {playing ? "Playing…" : "Play random song"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void handleShare()}
                    disabled={!nowPlaying.id}
                    title="Share (S)"
                  >
                    Share
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={onLogout}>
                    Log out
                  </button>
                </div>
                <p className="kbd-hint">
                  <kbd>Space</kbd> random play · <kbd>S</kbd> share · When a track ends, another random
                  song starts automatically.
                </p>
              </div>

              {(nowPlaying.name || nowPlaying.artist) && (
                <div className="now-playing card card--now">
                  <div className="now-playing__text">
                    <div className="now-playing__title">{nowPlaying.name}</div>
                    <div className="now-playing__artist">{nowPlaying.artist}</div>
                    {nowPlaying.album ? (
                      <div className="now-playing__album">{nowPlaying.album}</div>
                    ) : null}
                    <div className="now-playing__links">
                      {nowPlaying.externalUrl ? (
                        <a
                          className="link-inline"
                          href={nowPlaying.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in Spotify
                        </a>
                      ) : null}
                      {nowPlaying.id ? (
                        <button type="button" className="btn-text" onClick={onBlacklistCurrent}>
                          Don’t suggest again
                        </button>
                      ) : null}
                    </div>
                    <div className="now-playing__actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn--heart"
                        aria-label={
                          librarySaved ? "Remove from Liked Songs" : "Save to Liked Songs"
                        }
                        aria-pressed={librarySaved === true}
                        disabled={!nowPlaying.id || libraryBusy}
                        onClick={() => void onToggleLibrary()}
                        title="Liked Songs"
                      >
                        ♥
                      </button>
                      <div className="playlist-add">
                        <label htmlFor={`playlist-pick-${playlistSelectKey}`} className="sr-only">
                          Add to playlist
                        </label>
                        <select
                          key={playlistSelectKey}
                          id={`playlist-pick-${playlistSelectKey}`}
                          className="playlist-add__select"
                          defaultValue=""
                          disabled={!nowPlaying.uri}
                          onFocus={() => void ensurePlaylistsLoaded()}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) void onAddToPlaylist(v);
                          }}
                        >
                          <option value="">
                            {playlistsLoading ? "Loading playlists…" : "Add to playlist…"}
                          </option>
                          {playlists.map((p) => (
                            <option key={p.id} value={p.id}>
                              {truncatePlaylistName(p.name)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <img className="cover" src={nowPlaying.image} alt="" />
                </div>
              )}
            </>
          )}
        </main>

        <aside className="sidebar">
          <HistoryPanel entries={historyEntries} onClear={onClearHistory} />
        </aside>
      </div>
    </div>
  );
}
