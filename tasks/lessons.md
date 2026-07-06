
## 2026-07-06 — "It renders" requires eyes, not inference
**What happened:** Board went invisible for hours. All 13 React Flow nodes were
mounted (image requests fired, data flowed) but stuck at `visibility: hidden` —
unstable callback props + wholesale node replacement wiped React Flow's
measurements every rebuild, and a `key` remount hack made it worse. I spent
three rounds blaming caches/stale tabs because my "verification" (server logs,
image fetches, DOM presence) never actually LOOKED at pixels, and my headless
Chrome screenshots were hanging — I shipped "fixed" claims without visual proof.
**Rules:**
1. A UI fix is verified ONLY by a rendered screenshot or a visibility-aware DOM
   probe (`scripts/inspect-board.mjs` / `npm run check:board`), never by log
   inference. If the instrument fails, fix the instrument FIRST.
2. When the user reports the same symptom twice, stop defending the previous
   diagnosis — assume it's my regression and re-derive from raw evidence.
3. React Flow: never remount via `key`, never replace the nodes array wholesale
   (merge by id to preserve `measured`), never let node-rebuild effects depend
   on unstable callback identities (use a ref).
