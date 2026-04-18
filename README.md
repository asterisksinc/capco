# Capco Supervisor Dashboard

This project contains the Capco supervisor dashboard UI built with Next.js App Router and Tailwind CSS.

## Routes

- `/supervisor/workorder`: work order overview list with summary cards and status table.
- `/supervisor/workorder/[detailpage]`: work order detail view with stage tabs and material table.
- `/supervisor/overview`: operations overview dashboard.
- `/supervisor/stock`: inventory snapshot dashboard.
- `/supervisor/pipeline`: production pipeline and bottleneck tracking.

The root route (`/`) redirects to `/supervisor/workorder`.

## Run Locally

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run lint
npm run build
```

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- TypeScript
- Lucide React icons
