# Collab Editor

A real-time collaborative rich-text editor where multiple users can simultaneously edit the same document with automatic conflict resolution powered by Yjs CRDTs synced over Durable Streams.

Generated with [one-shot-electric-app](https://github.com/anthropics/one-shot-electric-app) — an Electric SQL + TanStack DB + shadcn/ui scaffold.

## Prerequisites

- Node.js 22+
- pnpm 9+

## Setup

```bash
pnpm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Purpose | How to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection | From Electric Cloud claimable or your own Neon/Supabase |
| `ELECTRIC_URL` | Electric shape sync endpoint | `https://api.electric-sql.cloud` |
| `ELECTRIC_SOURCE_ID` | Electric Cloud source | From the Cloud claim or `npx @electric-sql/cli` |
| `ELECTRIC_SECRET` | Electric Cloud auth | Same source as above |
| `ELECTRIC_YJS_SERVICE_ID` | Yjs collaborative editing service | `npx @electric-sql/cli services create yjs` |
| `ELECTRIC_YJS_SECRET` | Yjs service auth | `npx @electric-sql/cli services get-secret <id>` |

## Running

```bash
# Run migrations
pnpm drizzle-kit migrate

# Start the dev server
pnpm dev
```

App runs at `http://localhost:5174`.

> When running inside the agent sandbox, `pnpm dev:start` launches Vite behind a Caddy reverse proxy with HTTP/2 multiplexing. Outside the sandbox, just run `pnpm dev` directly.
>
> **First-time HTTPS setup:** from the `one-shot-electric-app` repo root run `pnpm trust-cert` once. This installs Caddy's local CA into your system keychain for zero-warning HTTPS previews.

## Architecture

- **Document list sync**: Electric SQL shapes + TanStack DB collections + `useLiveQuery`
- **Collaborative editing**: Yjs CRDTs over Durable Streams (`@durable-streams/y-durable-streams`)
- **Rich-text editor**: TipTap v3 with Collaboration + CollaborationCaret extensions
- **Presence**: Yjs Awareness (cursors and who's online per document)
- **Mutations**: Optimistic via `collection.insert/update/delete`, reconciled through API routes
- **UI**: shadcn/ui + Tailwind CSS + lucide-react + Electric design system
- **Validation**: zod/v4

## Features

- Real-time document list with live updates
- Create, rename, and delete documents
- Collaborative rich-text editing with formatting toolbar (bold, italic, headings, lists, blockquote)
- Live presence indicators showing connected users per document
- Remote cursor rendering with user names and colors
- Auto-generated user identity (name + color) stored in localStorage

See [`PLAN.md`](./PLAN.md) for the full implementation plan.
