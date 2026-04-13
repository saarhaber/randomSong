# Random Song

React + Vite SPA that picks a random Spotify catalog search and starts playback on your active device — **Authorization Code with PKCE** (no backend, no client secret in the browser).

**Live:** [https://saarhaber.github.io/randomSong/](https://saarhaber.github.io/randomSong/) (after enabling GitHub Actions → Pages; see below.)

## Spotify Developer Dashboard

1. Open [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and select your app (or create one).
2. **Redirect URIs** — add exactly (must match character-for-character):
   - `http://localhost:8888/callback` — local dev (`npm run dev`; Vite uses port **8888**)
   - `https://saarhaber.github.io/randomSong/callback` — production (GitHub Pages)
3. The **Client ID** is embedded in the app for public use (OAuth public clients are not secret). **Do not** put the **Client Secret** in frontend code; PKCE does not use it. If you fork the repo, set `VITE_SPOTIFY_CLIENT_ID` in `.env` or in GitHub Actions to use your own app.
4. If login fails with **`redirect_uri` not matching**, the two URIs in step 2 are missing or typo’d — Spotify compares strings exactly (including `https`, path, and no trailing slash after `callback`).

## Local development

```bash
npm install
npm run dev
```

Opens **http://localhost:8888** — add `http://localhost:8888/callback` to your Spotify app (see above).

## Deploy (GitHub Pages)

1. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions** and save.  
   If this stays on “Deploy from a branch”, the deploy job fails with **HTTP 404** when creating a Pages deployment (`actions/deploy-pages` cannot provision the site).
2. *(Optional)* **Settings → Secrets and variables → Actions** — `VITE_SPOTIFY_CLIENT_ID` only if you want the CI build to override the baked-in client ID (e.g. a fork).
3. Push to `master` (or run the workflow manually). The build uploads `dist/`; the deploy job publishes it.

The workflow gives **`pages: write`** and **`id-token: write`** only to the **deploy** job, as required by [`actions/deploy-pages`](https://github.com/actions/deploy-pages#usage).

## Requirements

- **Spotify Premium** for Web API playback control on connected devices.
- An active Spotify app / web / desktop session so the API can target a device.

## Legacy

Older commits used Create React App and a Heroku OAuth helper; that flow is removed in favor of PKCE.
