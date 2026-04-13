# Random Song

React + Vite SPA that picks a random Spotify catalog search and starts playback on your active device. Authentication uses **Authorization Code with PKCE** (no backend and no client secret in the browser).

**Live:** [saarhaber.github.io/randomSong](https://saarhaber.github.io/randomSong/) — enable GitHub Pages with **GitHub Actions** as the source ([Deploy](#deploy-github-pages)).

## Spotify Developer Dashboard

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and open your app (or create one).

2. Under **Redirect URIs**, add these exactly (character-for-character):
   - `http://localhost:8888/callback` — local dev (`npm run dev`; Vite uses port **8888**)
   - `https://saarhaber.github.io/randomSong/callback` — production (GitHub Pages)

3. The **Client ID** is embedded; public OAuth clients are not secret. **Do not** put the **Client Secret** in frontend code — PKCE does not use it. If you fork, set `VITE_SPOTIFY_CLIENT_ID` in `.env` or in GitHub Actions for your own app.

4. If login fails with **`redirect_uri` not matching**, the URIs in step 2 are missing or incorrect. Spotify compares the full string (scheme, host, path; no trailing slash after `callback`).

## Local development

```bash
npm install
npm run dev
```

Serves at **http://localhost:8888**. Register `http://localhost:8888/callback` on your Spotify app (step 2).

## Deploy (GitHub Pages)

1. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions** and save.  
   Leaving **Deploy from a branch** selected causes the deploy job to fail with **HTTP 404** when creating a Pages deployment (`actions/deploy-pages` cannot provision the site).

2. *(Optional)* **Settings → Secrets and variables → Actions:** set `VITE_SPOTIFY_CLIENT_ID` if the CI build should override the default client ID (e.g. a fork).

3. Push to `master` or run the workflow manually. The build uploads `dist/`; the deploy job publishes it.

The workflow grants **`pages: write`** and **`id-token: write`** only to the **deploy** job, as required by [`actions/deploy-pages`](https://github.com/actions/deploy-pages#usage).

## Requirements

- **Spotify Premium** — needed for Web API playback control on connected devices.
- An active Spotify session (app, web, or desktop) so the API can target a device.

## History

Older versions used Create React App and a Heroku OAuth helper; that was replaced by PKCE.
