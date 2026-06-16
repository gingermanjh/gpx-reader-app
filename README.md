# GPX Reader App

Local-first GPX reader for route visualization, activity summaries, and pre-race course analysis.

## Features

- Open local GPX files in the browser
- Render tracks, routes, waypoints, and start/end labels on a Leaflet map
- Show distance, elapsed time, elevation, and GPX structure summaries
- D3 elevation and speed profiles with hover details
- Grade-aware course map coloring
- Climb/descent segment detection
- Grade distribution and race warnings
- Split planner with target finish time and cutoff-time slack
- Aid-station timeline from GPX waypoints
- Manual race context checklist
- PNG report export

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npx playwright test
npm run build
```
