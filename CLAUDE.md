ИСпра# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — runs the Express API (`tsx watch server/index.ts`, port 3001) and the Vite client (port 5173) together via `concurrently`. Open http://localhost:5173.
- `npm run dev:server` / `npm run dev:client` — run either half alone.
- `npm run build` — `tsc --noEmit` then `vite build` (typecheck is the only static check; there is no linter or test suite).
- `npm start` — runs the API server only (it does not serve the built client).

## Architecture

Single package, two halves sharing one `tsconfig.json` (`src/` = React client, `server/` = Express API). Everything is ESM (`"type": "module"`).

**Server (`server/index.ts`)** — one file. Persistence is a JSON file at `server/data/places.json` (read and fully rewritten on every request; no DB). Photos are uploaded with multer to `server/uploads/` and served from `/uploads`; a place stores photo URLs (`/uploads/<uuid>.<ext>`) in `photos[]`. Deleting a place or photo also removes the files. `Place` is defined in both `server/index.ts` and `src/types.ts` — keep them in sync by hand.

**Client–server wiring** — the client never uses an absolute API URL. Vite proxies `/api` and `/uploads` to `localhost:3001` (`vite.config.ts`), so the API must be running for the UI to work.

**Client state** — `PlacesProvider` (`src/PlacesContext.tsx`) loads all places once and holds them in memory; pages read from `usePlaces()` and mutate through its methods (which call `src/api.ts` and update local state from the server response). There is no per-page fetching.

**Map (`src/components/WorldMap.tsx`)** — rendered as plain SVG with `d3-geo` (`geoNaturalEarth1`) and country geometry from the bundled `world-atlas` package, so it works offline. Clicking the map inverts the projection to lat/lng and uses `geoContains` to pre-fill the country; pan/zoom is done by manipulating the SVG `viewBox`, and markers are scaled by the zoom factor to keep a constant size. Marker pointer events call `stopPropagation` so clicking a marker does not also trigger "add place".

**Place status** — a place is either `visited` or `planned`; the Visited and Planned pages are just filtered views of the same list, and "mark as visited" is a `PUT` that flips `status` (and sets `date`).

UI text is in Russian.
