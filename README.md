# Random Song

React + Vite SPA that picks a random Spotify catalog search and starts playback on your active device — **Authorization Code with PKCE** (no backend, no client secret in the browser).

**Live:** [https://saarhaber.github.io/randomSong/](https://saarhaber.github.io/randomSong/) (after enabling GitHub Actions → Pages; see below.)

## Spotify Developer Dashboard

1. Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and select your app (or create one).
2. **Redirect URIs** — add exactly (must match character-for-character):
   - `http://localhost:8888/callback` — local dev (`npm run dev`; Vite uses port **8888**)
   - `https://saarhaber.github.io/randomSong/callback` — production (GitHub Pages)
3. Copy the app **Client ID** for `VITE_SPOTIFY_CLIENT_ID`. **Do not** put the **Client Secret** in this repo or in frontend code; PKCE does not use it. If the secret was ever exposed, **rotate it** in the dashboard and remove old Heroku redirect URIs you no longer need.

## Local development

```bash
cp .env.example .env
# Set VITE_SPOTIFY_CLIENT_ID=your_client_id
npm install
npm run dev
```

## Deploy (GitHub Pages)

1. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions** and save.  
   If this stays on “Deploy from a branch”, the deploy job fails with **HTTP 404** when creating a Pages deployment (`actions/deploy-pages` cannot provision the site).
2. **Settings → Secrets and variables → Actions → New repository secret**  
   Name: `VITE_SPOTIFY_CLIENT_ID` — value: your Spotify Client ID.
3. Push to `master` (or run the workflow manually). The build uploads `dist/`; the deploy job publishes it.

The workflow gives **`pages: write`** and **`id-token: write`** only to the **deploy** job, as required by [`actions/deploy-pages`](https://github.com/actions/deploy-pages#usage).

## Requirements

- **Spotify Premium** for Web API playback control on connected devices.
- An active Spotify app / web / desktop session so the API can target a device.

## Legacy

Older commits used Create React App and a Heroku OAuth helper; that flow is removed in favor of PKCE.
