const SPOTIFY_AUTH = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token";

const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-recently-played",
  "user-read-email",
  "user-read-private",
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

const PKCE_VERIFIER_KEY = "spotify_pkce_verifier";
const OAUTH_STATE_KEY = "spotify_oauth_state";
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const EXPIRES_AT_KEY = "spotify_expires_at";

/** Open in a new tab so cookies are shared with the OAuth screen (helps mobile users who only use the Spotify app). */
export const SPOTIFY_ACCOUNTS_LOGIN_URL = "https://accounts.spotify.com/login";

function randomString(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let text = "";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function generatePkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = randomString(64);
  const hashed = await sha256(verifier);
  const challenge = base64urlEncode(hashed);
  return { verifier, challenge };
}

/**
 * Must match Spotify Developer Dashboard → Redirect URIs exactly (same string as authorize + token exchange).
 * Add both of these to your Spotify app:
 * - https://saarhaber.github.io/randomSong/callback
 * - http://localhost:8888/callback
 */
export function redirectUri(): string {
  if (import.meta.env.DEV) {
    return "http://localhost:8888/callback";
  }
  return "https://saarhaber.github.io/randomSong/callback";
}

/** Public OAuth client ID (not secret); optional VITE_SPOTIFY_CLIENT_ID overrides for forks. */
const DEFAULT_CLIENT_ID = "417eb170dcb5467cb5f76a519f5b1bf9";

export function getClientId(): string {
  const fromEnv = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim();
  return fromEnv || DEFAULT_CLIENT_ID;
}

/**
 * Store PKCE verifier + OAuth state in both sessionStorage and localStorage.
 * Mobile flows (Spotify app, or OAuth opening a new browser tab) often lose sessionStorage;
 * localStorage keeps the verifier so the callback can still exchange the code.
 */
function storeOAuthPkceSession(verifier: string, state: string): void {
  try {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    localStorage.setItem(OAUTH_STATE_KEY, state);
  } catch {
    /* ignore */
  }
}

function getPkceVerifier(): string | null {
  try {
    return (
      sessionStorage.getItem(PKCE_VERIFIER_KEY) ?? localStorage.getItem(PKCE_VERIFIER_KEY)
    );
  } catch {
    return null;
  }
}

function getExpectedOAuthState(): string | null {
  try {
    return sessionStorage.getItem(OAUTH_STATE_KEY) ?? localStorage.getItem(OAUTH_STATE_KEY);
  } catch {
    return null;
  }
}

function clearOAuthPkceSession(): void {
  try {
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(PKCE_VERIFIER_KEY);
    localStorage.removeItem(OAUTH_STATE_KEY);
  } catch {
    /* ignore */
  }
}

/** Android Chrome: prefer opening the Spotify app for login (uses in-app session). */
export function isAndroidMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Google Chrome for Android resolves Spotify’s `intent://` OAuth URL to the native app.
 * Browsers such as Brave, Edge, and Samsung Internet often ignore it or fail to fall back,
 * so those users should use the normal HTTPS authorize URL in the same tab.
 */
export function androidUsesSpotifyAppIntentForLogin(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua) || !/Chrome/i.test(ua)) return false;
  if (/Edg|Brave|OPR|SamsungBrowser|Firefox|Vivaldi|YaBrowser/i.test(ua)) return false;
  return true;
}

export function isIosMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Spotify Android: open the native app for authorization when possible.
 * @see https://stackoverflow.com/questions/77659617/integrating-spotify-oauth-on-android-in-app-authentication-for-web-browsers
 */
function androidSpotifyAppIntentUrl(httpsAuthorizeUrl: string): string {
  const u = new URL(httpsAuthorizeUrl);
  const query = u.searchParams.toString();
  const fallback = encodeURIComponent(httpsAuthorizeUrl);
  return `intent://accounts.spotify.com/inapp-authorize?${query};scheme=https;package=com.spotify.music;S.browser_fallback_url=${fallback};end`;
}

async function buildAuthorizeUrl(): Promise<string> {
  const clientId = getClientId();
  const { verifier, challenge } = await generatePkcePair();
  const state = randomString(16);
  clearOAuthPkceSession();
  storeOAuthPkceSession(verifier, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    show_dialog: "false",
  });

  return `${SPOTIFY_AUTH}?${params.toString()}`;
}

export async function beginLogin(): Promise<void> {
  const httpsUrl = await buildAuthorizeUrl();

  if (androidUsesSpotifyAppIntentForLogin()) {
    window.location.assign(androidSpotifyAppIntentUrl(httpsUrl));
    return;
  }

  window.location.assign(httpsUrl);
}

/**
 * Android: always uses Spotify’s `intent://` handoff to the native app (same OAuth request
 * as {@link beginLogin}, but a fresh PKCE session). Browsers may still ignore or block
 * `intent://`; there is no web API to force an app open. Use when the user explicitly
 * wants to try the app path (e.g. Brave default flow uses the browser instead).
 */
export async function beginLoginTrySpotifyAppIntent(): Promise<void> {
  const httpsUrl = await buildAuthorizeUrl();
  if (isAndroidMobile()) {
    window.location.assign(androidSpotifyAppIntentUrl(httpsUrl));
    return;
  }
  window.location.assign(httpsUrl);
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const verifier = getPkceVerifier();
  if (!verifier) {
    throw new Error("PKCE verifier missing — try logging in again.");
  }

  const body = new URLSearchParams({
    client_id: getClientId(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });

  const res = await fetch(SPOTIFY_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = (await res.json()) as TokenResponse;
  persistTokens(data);
  clearOAuthPkceSession();
}

export async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) return false;

  const body = new URLSearchParams({
    client_id: getClientId(),
    grant_type: "refresh_token",
    refresh_token: refresh,
  });

  const res = await fetch(SPOTIFY_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    clearStoredTokens();
    return false;
  }

  const data = (await res.json()) as TokenResponse;
  persistTokens(data);
  return true;
}

function persistTokens(data: TokenResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }
  const expiresAt = Date.now() + data.expires_in * 1000 - 60_000;
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function ensureValidAccessToken(): Promise<string | null> {
  const token = getStoredAccessToken();
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!token) return null;
  if (expiresAt && Date.now() < Number(expiresAt)) {
    return token;
  }
  const ok = await refreshAccessToken();
  return ok ? getStoredAccessToken() : null;
}

export function parseOAuthCallback(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return null;
  return { code, state };
}

export function validateOAuthState(returnedState: string): boolean {
  const expected = getExpectedOAuthState();
  return expected !== null && expected === returnedState;
}
