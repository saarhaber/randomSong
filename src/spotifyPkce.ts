const SPOTIFY_AUTH = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token";

const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-recently-played",
  "user-read-email",
  "user-read-private",
].join(" ");

const PKCE_VERIFIER_KEY = "spotify_pkce_verifier";
const OAUTH_STATE_KEY = "spotify_oauth_state";
const ACCESS_TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const EXPIRES_AT_KEY = "spotify_expires_at";

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

/** Must match Spotify Dashboard redirect URIs exactly, e.g. http://localhost:8888/callback */
export function redirectUri(): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  return `${window.location.origin}${prefix}/callback`;
}

export function getClientId(): string {
  const id = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim();
  if (!id) {
    throw new Error(
      "Missing VITE_SPOTIFY_CLIENT_ID. Copy .env.example to .env and set your Spotify app Client ID.",
    );
  }
  return id;
}

export async function beginLogin(): Promise<void> {
  const clientId = getClientId();
  const { verifier, challenge } = await generatePkcePair();
  const state = randomString(16);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

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

  window.location.assign(`${SPOTIFY_AUTH}?${params.toString()}`);
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
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
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
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
  const expected = sessionStorage.getItem(OAUTH_STATE_KEY);
  return expected !== null && expected === returnedState;
}
