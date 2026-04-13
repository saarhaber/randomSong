/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional; defaults to the app’s public Spotify client ID baked into the build. */
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
