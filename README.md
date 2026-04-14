# Workout Logger PWA

Mobile-first Progressive Web App workout logger backed by Notion databases. Built with Vite + React, deployed on Vercel.

---

## Prerequisites

- **Node 20** + npm
- A Vercel account (for deployment)
- A Notion integration with access to the three databases below

---

## Environment Variables

| Variable | Description |
|---|---|
| `NOTION_API_KEY` | Notion internal integration token (keep server-side only) |

The Notion database IDs are hard-coded in the API routes:

| DB | ID |
|---|---|
| Exercise Library | `d2b13aa6657441bfb331da49b9e464bf` |
| Exercise Log | `74478a97f7604058b6f15fb4ce130df6` |
| Master Workout Tracker | `157066192ca843a0836440a9d43a7222` |

Create a `.env.local` file (gitignored) for local development:

```
NOTION_API_KEY=secret_xxxxxxxxxxxx
```

---

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server starts on `http://localhost:5173`. API routes are **not** served locally by Vite — use the [Vercel CLI](#vercel-cli-optional) for full local testing.

### Vercel CLI (optional)

```bash
npm install -g vercel
vercel env pull .env.local   # pull env vars from Vercel project
vercel dev                   # serves both frontend + /api/* routes locally
```

---

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo in [vercel.com](https://vercel.com) — it auto-detects Vite.
3. Add `NOTION_API_KEY` in **Settings → Environment Variables**.
4. Every push to `main` auto-deploys.

Vercel automatically serves `/api/*.js` files as serverless functions.

---

## App Overview

### API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/bootstrap` | GET | Loads Exercise Library and computes weight history from Exercise Log |
| `/api/log` | POST | Creates one Master Workout Tracker entry + one Exercise Log entry per exercise |

### Sessions

| UI Key | Notion Session |
|---|---|
| A | A |
| B | B |
| C | C |
| D-S | D |
| D-H | D |
| Climb | Climb |

---

## Known Caveats

- **`T Weight ` trailing space** — Notion property name has a trailing space. This is intentional and must be preserved exactly in all API calls (`api/log.js` and `api/bootstrap.js`).
- **`C Weight` no trailing space** — Notion property name has no trailing space. Must be used verbatim.
- **Exercise Log pagination** — `GET /api/bootstrap` fetches all pages of the Exercise Log using cursor-based pagination to ensure `tLastMax` / `tAllTimeMax` / `cLastMax` / `cAllTimeMax` history is computed from the full dataset.
- **Exercise Library pagination** — Also handled, though unlikely to exceed 100 entries.
- **Placeholder icons** — `public/icon-192.png` and `public/icon-512.png` are minimal placeholder PNGs. Replace with real artwork before going to production.
- **No authentication** — The app is public. Protect by restricting the Vercel deployment URL if needed.
- **Notion API key** — Never exposed to the client. All Notion calls are server-side via `/api/*` routes only.
- **`reps` field type** — Stored as a number in Notion but some exercises use ranges like `8-12`. The UI accepts text; non-numeric values are not written to the `Reps` number field.
