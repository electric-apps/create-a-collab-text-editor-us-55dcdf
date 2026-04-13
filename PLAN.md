# PLAN.md — Collaborative Text Editor (y-durable-streams)

## App Description

A real-time collaborative rich-text editor where multiple users can simultaneously edit the same document with automatic conflict resolution powered by Yjs CRDTs synced over Durable Streams. Users can browse a list of documents, create new ones, and open any document for live collaborative editing with presence indicators showing who else is currently in the document.

---

## User Flows

### 1. Document List Page (`/`)
1. User lands on the home page and sees a list of all documents (title, created date, last updated).
2. User clicks **"New Document"** to create a document; a new untitled document is created and the user is redirected to the editor.
3. User clicks any document in the list to open its editor.
4. Document list updates in real-time as other users create new documents.

### 2. Document Editor Page (`/doc/$docId`)
1. User arrives at the editor page for a specific document.
2. The rich-text editor loads with the current document content (synced via Yjs over Durable Streams).
3. User can type, format text (bold, italic, headings, bullet lists), and see changes instantly.
4. Other users editing the same document have their cursors/selections shown with their name and a distinct color.
5. An online presence bar at the top shows avatars/names of all currently-editing users.
6. Document title is inline-editable at the top of the page; editing the title updates it in Postgres via an API route.
7. User can navigate back to the document list via a breadcrumb/back button.

### 3. User Identity
- No authentication required. On first visit a random display name and color is generated and stored in `localStorage`.
- The name can be edited inline in the presence bar.

---

## Data Model

```ts
// src/db/schema.ts

import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id:         uuid("id").primaryKey().defaultRandom(),
  title:      text("title").notNull().default("Untitled"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

> The document **content** (rich text) lives entirely in the Yjs Y.Doc synced via `@durable-streams/y-durable-streams` — it is NOT stored in Postgres as a column.

---

## Key Technical Decisions

### Product Selection

| Problem | Product | Package |
|---|---|---|
| Document list (current state, live-synced) | Electric SQL shapes + TanStack DB | `@electric-sql/client` + `@tanstack/db` + `@tanstack/react-db` |
| Concurrent rich-text editing with CRDT merge | Y-Durable-Streams | `@durable-streams/y-durable-streams` |
| Presence (cursors, who's online per document) | Yjs Awareness (built into Y-Durable-Streams provider) | `@durable-streams/y-durable-streams` |
| Schema + migrations | Drizzle ORM | `drizzle-orm` + `drizzle-kit` |
| Rich-text editor UI | TipTap | `@tiptap/react` + `@tiptap/starter-kit` + TipTap Yjs collaboration extensions |
| Full-stack routing + API routes | TanStack Start | `@tanstack/react-start` |
| UI components | shadcn/ui + Tailwind CSS | `@/components/ui/*` |

### Why This Stack
- **Electric shapes for the document list**: Documents are entities with mutable metadata (title, timestamps) that all clients need to see live. Electric + TanStack DB is the right fit.
- **Y-Durable-Streams for content**: Rich-text editing requires CRDT-based conflict resolution — multiple users can type simultaneously and Yjs merges edits without last-write-wins data loss.
- **Yjs Awareness for presence**: Cursors and "who's online" are ephemeral and per-session; Yjs Awareness (piggy-backed on the Y-Durable-Streams provider) is the correct product — not StreamDB, not Postgres.
- **No Durable Streams event log**: A revision history / audit trail is out of scope for the MVP.

### Credential Note
Before the first stream operation, the coder must follow the Electric CLI flow in the `room-messaging` skill and store the resulting Yjs service URL + secret via `set_secret`.

---

## Routes & API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Document list page |
| GET | `/doc/$docId` | Editor page for a specific document |
| GET | `/api/shape/documents` | Electric shape proxy for the `documents` table |
| POST | `/api/documents` | Create a new document (server mutation) |
| PATCH | `/api/documents/$docId` | Update document title + `updated_at` |
| GET/POST | `/api/yjs/$docId` | Yjs service proxy (forwards to Durable Streams Yjs backend) |

---

## UI Components

### Home Page (`/`)
- **Toolbar**: App title ("Collab Editor") + "New Document" button (with `Plus` icon from lucide-react)
- **Document list**: shadcn/ui `Card` per document showing title, relative `created_at` / `updated_at` timestamps; cards are clickable and navigate to `/doc/$docId`
- **Empty state**: Centered illustration + "No documents yet. Create your first one." message

### Editor Page (`/doc/$docId`)
- **Header**: Back arrow (`ArrowLeft` icon) → home, inline-editable document title (click to edit, blur/enter to save via PATCH)
- **Presence bar**: Horizontal strip showing colored avatar circles for each connected user (name from Yjs Awareness); current user shown first
- **TipTap editor**: Full-height, full-width rich-text editor with:
  - Collaboration extension (synced to Y.Doc via `@durable-streams/y-durable-streams`)
  - Collaboration Cursor extension (renders remote cursors/selections using Yjs Awareness)
  - Starter-kit extensions: Bold, Italic, Headings (H1–H3), BulletList, OrderedList, Blockquote, HorizontalRule
  - Floating or bubble menu for inline formatting
- **Loading skeleton**: Shown while the Yjs provider connects

### Shared
- **User identity modal / popover**: If the auto-generated username hasn't been confirmed, show a small popover on first editor load prompting the user to set a display name. Store in `localStorage`.

---

## Implementation Tasks

### Phase 0 — Scaffold & Infrastructure
- [ ] Verify Drizzle schema file exists at `src/db/schema.ts`; add the `documents` table definition
- [ ] Generate and run the initial migration for the `documents` table
- [ ] Wire up the Electric shape proxy route at `/api/shape/documents` using the scaffold's `src/lib/electric-proxy.ts`
- [ ] Follow the Electric CLI provisioning flow (room-messaging skill) to create a Yjs service for this app; store the service URL and secret via `set_secret`
- [ ] Add the Yjs service proxy route at `/api/yjs/$docId` (server-side; injects `Authorization: Bearer <secret>` header; follows the block-list forwarding rules from `create-app` skill)

### Phase 1 — TipTap + Yjs Dependencies
- [ ] Install TipTap packages: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`
- [ ] Install `@durable-streams/y-durable-streams` (if not already in package.json)
- [ ] Install `yjs` (peer dependency)

### Phase 2 — Document List (Home Page)
- [ ] Create a TanStack DB collection for `documents` backed by the Electric shape proxy (`/api/shape/documents`); include `timestamptz` parser for `created_at` / `updated_at`
- [ ] Build the `/` route with `ssr: false` (or `<ClientOnly>` wrapper) since it uses a live-query hook
- [ ] Render the document list with shadcn/ui Cards; sort by `updated_at` descending
- [ ] Implement "New Document" button: POST to `/api/documents`, then navigate to `/doc/$newId`
- [ ] Add empty-state UI

### Phase 3 — Document Mutation API Routes
- [ ] Implement `POST /api/documents`: insert a new row into `documents` using Drizzle, return the new doc `id`
- [ ] Implement `PATCH /api/documents/$docId`: update `title` and `updated_at` in Postgres using Drizzle; validate with Zod

### Phase 4 — Editor Page & Yjs Integration
- [ ] Build the `/doc/$docId` route with `ssr: false` (Yjs provider is browser-only)
- [ ] On mount, create a `Y.Doc` and wire it up to `@durable-streams/y-durable-streams` pointing at `/api/yjs/$docId`
- [ ] Set up Yjs Awareness with the current user's display name and a random persistent color (loaded from / saved to `localStorage`)
- [ ] Initialize TipTap `useEditor` with `StarterKit`, `Collaboration` (using the shared `Y.Doc`), and `CollaborationCursor` (using the Awareness instance)
- [ ] Render TipTap `<EditorContent>` in a full-height container; add basic toolbar buttons (Bold, Italic, H1/H2/H3, BulletList) using shadcn/ui `Button` + lucide-react icons
- [ ] Add floating/bubble menu for inline formatting
- [ ] Build the presence bar: subscribe to Awareness state changes; render a colored circle per connected user (current user highlighted)
- [ ] Implement inline title editing in the header (click-to-edit `<input>`; on blur/Enter call PATCH `/api/documents/$docId`); optimistically update the local collection

### Phase 5 — User Identity
- [ ] On app init, check `localStorage` for `collab_user_name` and `collab_user_color`; generate defaults if absent (random adjective-noun name, random hue)
- [ ] Add a small popover/dialog on first editor load that prompts the user to confirm or change their display name; save back to `localStorage`

### Phase 6 — Polish & UX
- [ ] Add loading skeleton for the editor while Yjs provider is connecting
- [ ] Style the TipTap editor with Tailwind typography prose classes
- [ ] Ensure remote cursors render with correct user colors and name labels
- [ ] Add a page `<title>` that reflects the document title
- [ ] Test concurrent editing in two browser tabs / windows
- [ ] Write `README.md` (coder responsibility — document local dev, env vars, and feature overview)
