import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Spotify from "spotify-web-api-js";
import "./App.css";
import {
  beginLogin,
  clearStoredTokens,
  ensureValidAccessToken,
  exchangeCodeForTokens,
  getClientId,
  parseOAuthCallback,
  validateOAuthState,
} from "./spotifyPkce";

const spotify = new Spotify();

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

const DEFAULT_IMG =
  "https://images.squarespace-cdn.com/content/v1/585e12abe4fcb5ea1248900e/1521163355433-O0YP7FRVMXHTCHB1O4CU/ke17ZwdGBToddI8pDm48kPx25wW2-RVvoRgxIT6HShBZw-zPPgdn4jUwVcJE1ZvWQUxwkmyExglNqGp0IvTJZUJFbgE-7XRK3dMEBRBhUpx0Qh3eD5PfZ_nDR0M7OIGaTx-0Okj4hzQeRKYKbt7WfTYFScRKDTW78PcnUqBGqX8/Spotify+Square.png";

function getRandomSearch(): string {
  const characters =
    "ﺍﺏﺕﺙﺝﺡﺥﺩﺫﺭﺯﺱﺵﺹﺽﻁﻅﻉﻍﻑﻕﻙﻝﻡﻥهـﻭﻱБВГДЖꙂꙀИЛѠЦЧШЩЪѢꙖѤЮѪѬѦѨѮѰѲѴҀňřšťůýÿžäëðöüăïîāņßķõőàèòùčēļșģìאבגדהוזחטיכלמנסעפצקרשתľơŕçởżğæœøåabcdefghijklmnñopqrstuvwxyz0123456789áéíóúαβγδεζηθικλμνξΟοΠπρςτυφχψωč";
  const randomCharacter = characters.charAt(
    Math.floor(Math.random() * characters.length),
  );
  switch (Math.round(Math.random())) {
    case 0:
      return randomCharacter + "%";
    case 1:
      return "%" + randomCharacter + "%";
    default:
      return randomCharacter;
  }
}

export default function App() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userImg, setUserImg] = useState("");
  const [nowPlaying, setNowPlaying] = useState({
    name: "",
    image: DEFAULT_IMG,
    artist: "",
  });
  const [playing, setPlaying] = useState(false);

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
      setNowPlaying({
        name: t.name,
        image: t.album.images[0]?.url ?? DEFAULT_IMG,
        artist: t.artists[0]?.name ?? "",
      });
    } else {
      const recent = await spotify.getMyRecentlyPlayedTracks({ limit: 1 });
      const first = recent.items[0]?.track;
      if (first) {
        setNowPlaying({
          name: first.name,
          image: first.album.images[0]?.url ?? DEFAULT_IMG,
          artist: first.artists[0]?.name ?? "",
        });
      }
    }
  }, []);

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
          const msg = e instanceof Error ? e.message : String(e);
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
        const msg = e instanceof Error ? e.message : String(e);
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
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          clearStoredTokens();
          setLoggedIn(false);
        }
      }
      setOauthBusy(false);
      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyToken, navigate]);

  const getNowPlaying = useCallback(async () => {
    const playback = await spotify.getMyCurrentPlaybackState();
    if (playback?.is_playing && playback.item && "name" in playback.item) {
      const t = playback.item;
      setNowPlaying({
        name: t.name,
        image: t.album.images[0]?.url ?? DEFAULT_IMG,
        artist: t.artists[0]?.name ?? "",
      });
    }
  }, []);

  const playNow = useCallback(async () => {
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

      const market = MARKETS[Math.floor(Math.random() * MARKETS.length)]!;
      const search = getRandomSearch();
      const offset = Math.floor(Math.random() * 2000);
      const response = await spotify.search(search, ["track"], {
        market,
        limit: 50,
        offset,
      });
      const items = response.tracks?.items ?? [];
      if (items.length === 0) {
        setError("No tracks returned — try again.");
        return;
      }
      const pick = items[Math.floor(Math.random() * items.length)]!;
      await spotify.play({ uris: [pick.uri] });
      await new Promise((r) => setTimeout(r, 800));
      await getNowPlaying();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setPlaying(false);
    }
  }, [getNowPlaying]);

  const onLogin = () => {
    setError(null);
    void beginLogin().catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  };

  const onLogout = () => {
    clearStoredTokens();
    setLoggedIn(false);
    setDisplayName("");
    setUserImg("");
    setNowPlaying({ name: "", image: DEFAULT_IMG, artist: "" });
    setError(null);
  };

  if (!ready || oauthBusy) {
    return (
      <div className="app">
        <h1>Random Song</h1>
        <p className="meta">Loading…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Random Song</h1>

      {error ? <div className="error">{error}</div> : null}

      {!loggedIn ? (
        <>
          <button type="button" className="btn" onClick={onLogin}>
            Log in with Spotify
          </button>
          <p className="hint">
            Uses Spotify’s Web API with PKCE (no client secret in the browser).
            Requires Spotify Premium for playback. Dev server:{" "}
            <code style={{ color: "#aaa" }}>http://localhost:8888</code> — set{" "}
            <code style={{ color: "#aaa" }}>VITE_SPOTIFY_CLIENT_ID</code> in{" "}
            <code style={{ color: "#aaa" }}>.env</code>.
          </p>
        </>
      ) : (
        <>
          <div className="meta">
            Logged in as <strong>{displayName}</strong>
            {userImg ? (
              <img className="avatar" src={userImg} alt="" />
            ) : null}
          </div>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              onClick={() => void playNow()}
              disabled={playing}
            >
              {playing ? "Playing…" : "Play random song"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onLogout}>
              Log out
            </button>
          </div>

          {(nowPlaying.name || nowPlaying.artist) && (
            <div className="now-playing">
              <div className="title">{nowPlaying.name}</div>
              <div className="artist">{nowPlaying.artist}</div>
              <img
                className="cover"
                src={nowPlaying.image}
                alt=""
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
