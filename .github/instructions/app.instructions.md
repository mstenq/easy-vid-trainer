---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
```
---
applyTo: '**'
---

# Easy Vid Trainer – Project Context & AI Contribution Guidelines

This document tells the AI how this repository is structured, how the application works, and the conventions to follow when generating or modifying code. Treat this as the authoritative style & architecture guide for automated changes.

## 1. High-Level Purpose
An internal tool for preparing video datasets. Users:
1. Create a dataset.
2. Upload raw videos (drag & drop UI).
3. Configure per‑video metadata: start time, target resolution, crop rectangle.
4. Trigger processing (FFMPEG) to produce standardized, trimmed/cropped outputs.
5. Outputs stored under `output/<datasetName>/` with sequential filenames.

## 2. Critical Architectural Note (Easy to Get Wrong)
The entire backend AND the static React SPA are served by ONE Bun server defined in `src/index.tsx` using `serve({ ... routes ... })`. There is NOT a separate Node/Express server, nor a Next.js/Vite dev server in production. All API endpoints and the SPA HTML fallback route are registered inside the single `routes` object. A catch‑all route (`"/*": index`) returns `index.html` for client-side routing. Do NOT propose spinning up additional servers unless explicitly requested. Keep new API routes inside the existing `serve` call.

## 3. Key Technologies
- Runtime: Bun (TypeScript). Single process.
- Frontend: React SPA + Tailwind CSS + shadcn/ui components (fully implemented).
- Database: SQLite via Drizzle ORM (schema in `src/db/schema.ts`).
- Media: FFMPEG (invoked from Bun for processing pipeline).
- Routing: React Router DOM for client-side navigation.
- State Management: Custom React hooks for complex state logic.
- Storage layout:
	- Raw uploads: `uploads/<datasetId>/<timestamp_random>.<ext>` (current behavior).
	- (Intended logical model) Raw canonical dataset path: `datasets/<datasetName>/vid_0001.mp4` etc.
	- Processed: `output/<datasetName>/vid_0001.mp4`.

## 4. Directory Outline (Relevant Only)
Root files:
- `src/index.tsx` – Bun server (API + static HTML + video file serving). CENTRAL.
- `src/frontend.tsx` – React app entry point with HMR support.
- `src/App.tsx` – Main React app with React Router setup.
- `src/api/` – Endpoint helper modules (`datasets.ts`, `videos.ts`). Keep business logic here; routes call thin wrappers.
- `src/db/` – DB setup + Drizzle schema.
- `src/lib/` – Utility helpers (`video-metadata.ts`, `utils.ts`, `video-utils.ts`). Add reusable logic here instead of bloating route handlers.
- `src/components/` – React UI building blocks including shadcn/ui components.
- `src/components/ui/` – Fully implemented shadcn/ui component library (button, card, dialog, input, label, progress, select).
- `src/pages/` – Page-level components (`DatasetListPage.tsx`, `DatasetDetailPage.tsx`).
- `src/hooks/` – Custom React hooks for complex state management (`useCropManagement.ts`, `useProcessing.ts`, `useVideoPlayer.ts`, etc.).
- `src/services/` – API client layer (`api.ts`).
- `src/types/` – TypeScript type definitions.
- `output/` – Processed video artifacts (FFMPEG results). Never commit large binaries intentionally.
- `uploads/` – Raw uploaded videos grouped by dataset ID directory.
- `drizzle/` – Migration snapshots/journal (auto‑managed by Drizzle tooling).
- `components.json` – shadcn/ui configuration file.

## 5. Data Model (Conceptual)
Tables (see `schema.ts` for exact shape):
- datasets: id, name, createdAt.
- videos: id, datasetId, filename, filepath, duration, originalWidth, originalHeight, startTime, resolution enum ('1280x720' | '720x1280' | '768x768'), cropX, cropY, cropWidth, cropHeight, fps, frameCount, status.
Status lifecycle: `pending` -> (`processed` | `error`).

## 6. API Contract (Current/Planned)
All routes are mounted under `/api` (except static /uploads and catch‑all):
- `GET  /api/datasets` – list datasets.
- `POST /api/datasets` – create dataset.
- `GET  /api/datasets/:id` – dataset detail incl. videos.
- `DELETE /api/datasets/:id` – delete dataset + cascade videos (ensure file cleanup when implemented).
- `POST /api/datasets/:id/videos` – multipart upload (possibly multiple files). Returns created video metadata.
- `POST /api/datasets/:id/process` – trigger processing job (synchronous for now; may become async queue later).
- `GET  /api/videos/:id` – single video metadata.
- `PATCH /api/videos/:id` – update startTime, resolution, crop, etc.
- `DELETE /api/videos/:id` – remove a video (and optionally physical file – confirm before implementing destructive ops).
Testing helpers present: `/api/hello` & `/api/hello/:name` – keep or remove based on future needs.

Static file/video serving:
- Route prefix `/uploads/*` streams original uploads using `Bun.file()` with range-friendly headers.
	- When adding new media-serving endpoints, preserve ordering: specific binary/static routes MUST come before the catch‑all `"/*"` route.

## 7. Processing Flow (FFMPEG – Implementation Guidance)
Intended command template per video (illustrative):
```
ffmpeg -y -ss <startTime> -i <input> -vf "crop=<cropWidth>:<cropHeight>:<cropX>:<cropY>,scale=<W>:<H>" -r <fps> -frames:v <frameCount> <output>
```
Notes:
- Apply `-ss` before `-i` for faster seeking (keyframe accuracy trade-offs acceptable).
- Validate crop fits inside original dimensions; clamp if needed.
- Provide meaningful error capture: store `status='error'` and maybe an `errorMessage` column (add if needed) instead of throwing only.
- Consider future async processing (queue + status polling) – structure code modularly now.

## 8. Conventions & Style
TypeScript:
- Use explicit types for API request payloads / responses (`types/index.ts`).
- Narrow unknown/any – avoid leaking `any` to UI layer.
- Prefer pure functions in `src/lib/` for transformation logic.

React:
- Components under `src/components/` should be small & focused.
- Page-level composition in `src/pages/` – client-side routing handled by React Router DOM in `App.tsx`.
- Use Tailwind utility classes; shadcn/ui components are fully implemented and available.
- Custom hooks in `src/hooks/` manage complex state logic (video player, crop management, processing, etc.).
- API interactions centralized in `src/services/api.ts`.

Backend API helpers:
- Keep route handlers thin; parse/validate input then delegate to service/DB functions.
- Always validate numeric route params with `parseInt` + NaN guard (pattern already in `index.tsx`).
- Respond with `Response.json({ error: string }, { status })` on validation failures.

Error Handling:
- Catch and log unexpected errors; never leak stack traces to clients.
- Standard error JSON shape: `{ error: string }` (avoid mixing shapes).

Naming:
- Dataset folder naming: slugify dataset name (lowercase, alphanumeric + `-`).
- File numbering: zero-padded incremental `vid_0001.mp4` to keep lexical order.

File Paths:
- Store canonical file path in DB for each video (`filepath`).
- If refactoring upload location, write a migration to update existing paths.

## 9. Adding a New API Route (Recipe)
1. Open `src/index.tsx`.
2. Insert new path inside `routes` object BEFORE the final catch‑all.
3. Validate inputs early; return 400 on bad params.
4. Delegate to a new function placed in `src/api/<domain>.ts` or a service module.
5. Add/update types describing request/response.
6. If DB schema changes, update `schema.ts` + generate migration snapshots.

## 10. Database & Migrations
- Drizzle snapshot files live in `drizzle/meta/` – auto-managed; do not hand edit.
- When altering schema: modify `schema.ts`, run Drizzle generation (tooling not yet scripted in repo – if adding, document commands here).
- Keep irreversible destructive changes (column drops) behind explicit PR notes.

## 11. Video Upload Handling
- Large uploads: server sets `maxRequestBodySize` (currently 500 MB). Adjust carefully when adding more resolutions.
- Accept multiple files per POST if implemented; ensure consistent ordering in returned metadata.
- Extract metadata (duration, width, height) via FFMPEG probe step (to be implemented in `video-metadata.ts`). Cache results in DB.

## 12. Performance Considerations
- Avoid reading entire video into memory – rely on streaming / file paths.
- FFMPEG calls should be sequential initially; add concurrency cautiously (I/O & CPU trade-offs).
- When introducing workers, ensure shared SQLite access uses WAL mode if concurrency issues appear.

## 13. Security & Safety
- Sanitize dataset names (no relative path segments, restrict characters).
- Never interpolate unsanitized user input directly into shell commands for FFMPEG – build argument arrays instead.
- Enforce allowed extensions (mp4, webm) when adding validation logic.

## 14. Testing Guidance (Future)
- Add lightweight unit tests for pure helpers (naming: `*.test.ts`).
- Consider integrating Bun's built-in test runner.
- Mock filesystem / FFMPEG where heavy.

## 15. Common Pitfalls (Avoid)
- Creating a separate dev server for API – NOT needed (everything lives in `index.tsx`).
- Forgetting ordering: `/uploads/*` must remain before the catch‑all.
- Returning inconsistent JSON shapes.
- Hard-coding absolute file paths instead of relative project paths.

## 16. Extension / Future Backlog (Optional References Only)
- Async job queue for processing (status polling endpoint).
- WebSocket or Server-Sent Events for progress updates.
- Add `errorMessage` column to videos.
- User auth (multi-tenant) & access control.
- Thumbnail generation & preview sprites.
- Enhanced drag-based crop UI improvements.

## 17. How AI Should Respond to New Requests
When asked to:
- Add an endpoint: modify `src/index.tsx` routes; DO NOT scaffold another server.
- Change schema: update `schema.ts` + mention migration generation steps.
- Add processing logic: create helper in `src/lib/` or `src/services/` and call from route handler.
- Modify UI: use Tailwind + shadcn/ui components; leverage existing custom hooks for state management.
- Add new functionality: consider extracting complex logic into custom hooks in `src/hooks/`.

## 18. Code Quality Principles
- Small, composable functions.
- Pure transformations isolated for easy testing.
- Minimal duplication; extract shared validation.
- Log with clear context (dataset id, video id).

## 19. Custom Hook Architecture
The application uses a sophisticated custom hook system for state management:

### Core Hooks
- `useVideoPlayer` – Manages video playback state, current time, and time updates.
- `useCropManagement` – Handles crop rectangle state, resolution changes, and auto-saving.
- `useProcessing` – Manages processing workflows, progress tracking, and polling.
- `useVideoDisplay` – Handles video display scaling and responsive dimensions.
- `useDrag` – Provides drag-and-drop functionality for crop manipulation.
- `useDebouncedSave` – Provides debounced save functionality to prevent excessive API calls.

### Hook Design Patterns
- Use refs to avoid stale closure issues in callbacks.
- Provide cleanup functions for intervals and timeouts.
- Centralize complex state logic to keep components clean.
- Return both state and actions for maximum flexibility.
- Use TypeScript generics for reusable hooks.

### State Management Guidelines
- Keep component state minimal; delegate complex logic to hooks.
- Use hooks for cross-component state that doesn't need global sharing.
- Prefer custom hooks over context for isolated feature state.
- Always cleanup side effects (intervals, timeouts, event listeners) in useEffect cleanup.

---
If a future change conflicts with this document, update this document FIRST so automated tooling stays aligned.
```
---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.