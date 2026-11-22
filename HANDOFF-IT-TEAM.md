# Jellyfin Cinematic UI — Deployment Handoff

Branch: `cinematic-ui` on `github.com/malikoliver25/jellyfin-web` (2 commits on top of upstream `master` @ 4a0861b5a0).

## What changed

| Area | File | Change |
|---|---|---|
| Theme tokens | `src/themes/_base/_palette.scss`, `_theme.scss`, `dark/theme.scss`, `src/index.html` | Near-black `#080808` base, `#141414` surfaces, red accent `#e50914`, Inter font, glass tokens |
| Home hero | `src/components/homesections/sections/heroBillboard.ts` + `homesections.js/.scss` | Full-bleed rotating billboard: backdrop art, logo/title, 4K/HDR/rating/year badges, Play + More Info, 12s rotation, respects `prefers-reduced-motion`, skipped on TV layout |
| Cards | `src/components/cardbuilder/card.scss` | Pointer hover scale(1.05) + lift + shadow, mirroring keyboard focus |
| Header | `src/styles/librarybrowser.scss` | Glass `rgba(8,8,8,.65)` + blur; deepens to near-black when content scrolls under (`skinHeader-withBackground`) |
| Detail pages | `src/styles/librarybrowser.scss` | 62vh backdrop with gradient fade into page, bold 800-weight title, misc-info contrast |

## Build

```bash
git checkout cinematic-ui
npm ci
npm run build:production   # outputs dist/
```

NOTE: on this Mac, `sass-embedded`'s bundled binary fails ("Mac OS X 12.0 lower than minimum 14.0") — a local toolchain issue, not a code issue. All SCSS compiles clean under dart-sass; `tsc --noEmit`, eslint, stylelint pass on changed files. On the server/CI (Linux) the normal build works.

## Deploy option A — replace web dir on the Jellyfin server (recommended)

```bash
# back up existing web client
sudo mv /usr/share/jellyfin/web /usr/share/jellyfin/web.bak
sudo cp -r dist /usr/share/jellyfin/web
sudo chown -R jellyfin:jellyfin /usr/share/jellyfin/web   # adjust user to your install
sudo systemctl restart jellyfin
```
Docker: mount/copy `dist/` over `/jellyfin/jellyfin-web` in the container, or use a bind mount of the built files.

## Deploy option B — host separately (CDN / nginx / Cloudflare Pages)

Serve `dist/` as static files from your own domain. Then on the Jellyfin server allow cross-origin API + streaming from that domain:

Dashboard → Networking → CORS: add your frontend origin (e.g. `https://tv.yourdomain.com`). Jellyfin's API is same-origin-agnostic once CORS is set; websockets and image/stream URLs work cross-origin.

## Connect

Open the deployed URL → "Add Server" → enter the Jellyfin server URL (`https://jellyfin.frienddomain.com` or `http://<ip>:8096`) → log in. The custom frontend streams directly from the existing backend; no server data changes needed.

## Recommended server plugins (verified against your Jellyfin 12.4.0)

Add these repository URLs in Dashboard → Plugins → Repositories, then install:

| Plugin | Repo manifest URL | Version to install | Notes |
|---|---|---|---|
| Merge Versions | `https://raw.githubusercontent.com/danieladov/JellyfinPluginManifest/master/manifest.json` | 12.0.1.0 (targetAbi 12.0) | Groups duplicate movie versions (1080p/4K/Remux) into one item with a version picker |
| Jellyfin Enhanced | `https://raw.githubusercontent.com/n00bcodr/jellyfin-enhanced/main/manifest.json` | **12.18.0** — on JF12 the catalog auto-selects the `12.0.0.0` ABI zip (dual 10.11/12.0 manifest; don't install the 10.11 one) | Seerr/TMDB integration, keyboard shortcuts, extra theme palettes |
| Custom Logo (jellyfin-plugin-custom-logo) | from the awesome-jellyfin ✅ JF12 catalog | latest JF12 build | GUI upload for splash + header + admin drawer logo + favicon — preferable to the Custom CSS override if you want dashboard config |
| Jellyscrub | `https://raw.githubusercontent.com/nicknsy/jellyscrub/main/manifest.json` | 2.1.0.0 — targetAbi 10.10.0.0, **catalog will hide it on JF12**; manual zip install only, accept compat risk | Seek-bar hover previews (BIF trickplay) |
| Poster Rotator | `https://raw.githubusercontent.com/jonah-jamesen/jellyfin-plugin-poster-rotator/main/manifest.json` | 1.0.1.2 — also 10.10 ABI, hidden on JF12 | Rotating posters; zip asset verified to exist |

Do NOT install: bvolvy/CustomLogoPlugin (release tag has no zip asset — verified via GitHub API), danieladov Skin Manager (10.7-only, conflicts with this custom frontend).

Custom banner logo without any plugin: Dashboard → Branding → Custom CSS →
```css
.pageTitleWithDefaultLogo { background-image: url("https://your-host/logo.png") !important; }
```
(PNG with transparency or SVG both work; keep it wide ~3:1. Animated GIF/APNG animates; animated SVG does not render as CSS background.)

## Rollback

```bash
sudo mv /usr/share/jellyfin/web.bak /usr/share/jellyfin/web && sudo systemctl restart jellyfin
```
