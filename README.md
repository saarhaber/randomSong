# Random Song

React + Vite SPA that picks a random Spotify catalog search and starts playback on your active device — **Authorization Code with PKCE** (no backend, no client secret in the browser).

**Live:** [https://saarhaber.github.io/randomSong/](https://saarhaber.github.io/randomSong/) (after enabling GitHub Actions → Pages; see below.)

## Spotify Developer Dashboard

1. Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and select your app (or create one).
2. **Redirect URIs** — add exactly (must match the app’s `redirect_uri` computation):
   - `http://localhost:5173` — local dev (`npm run dev`)
   - `https://saarhaber.github.io/randomSong` — production (no trailing slash; path is normalized)
3. Copy the app **Client ID** (not the secret).

## Local development

```bash
cp .env.example .env
# Set VITE_SPOTIFY_CLIENT_ID=your_client_id
npm install
npm run dev
```

## Deploy (GitHub Pages)

1. In this repo on GitHub: **Settings → Secrets and variables → Actions → New repository secret**  
   Name: `VITE_SPOTIFY_CLIENT_ID` — value: your Spotify Client ID.
2. **Settings → Pages**: Source = **GitHub Actions** (not “Deploy from a branch”).
3. Push to `master`; the workflow builds with the secret and publishes `dist/` to Pages.

## Requirements

- **Spotify Premium** for Web API playback control on connected devices.
- An active Spotify app / web / desktop session so the API can target a device.

## Legacy

Older commits used Create React App and a Heroku OAuth helper; that flow is removed in favor of PKCE.
