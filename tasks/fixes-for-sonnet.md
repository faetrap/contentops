# Code Review & Fix List — handoff (2026-07-07)

> Full-codebase logic review by Fable 5, for Sonnet to implement. Work on branch
> `dev/phase-1`. Baseline commit: "Runs consume their wires; truthful outputs;
> card-scoped buttons" (pushed). Fix in priority order; verify per the protocol at
> the bottom **after each priority band**, not just at the end.

## Invariants — do not break these while fixing

- AI runs go through the Claude Code CLI on the owner's subscription
  (`server/src/claude.ts`, `claude -p` subprocess). **Never** introduce
  `ANTHROPIC_API_KEY` or any per-use API.
- Operator prompts are editable notes in the vault (`02 Operators/`), re-read every
  run. System brain (`system/*.md`) is loaded fresh every run. Don't cache either.
- Nothing lands in the vault without the Approve gate, except capture itself.
- Vault writes are atomic (`atomicWrite`); never `rm` user content — archive.
- The paper texture lives on `body` background only — never as an overlay above
  cards/modals (this regressed once; Yen hates specks on windows).
- Sentence case for all UI labels. No shouting caps.
- UI verification = `npm run check:board` (must print nodeCount === visibleCount,
  "CONSOLE ERRORS: none") **plus** a screenshot you actually look at. Log inference
  is not verification (see tasks/lessons.md 2026-07-06).

---

## P1 — Broken UX / data-corruption risk

### 1. `[object Object]` in the review window (Yen's screenshot; the direct ask)
- **Where:** `web/src/components/ReviewModal.tsx` (~line 58), the generic
  array-editor branch: `value={String(item)}`.
- **Cause:** the editor assumes arrays of strings. Carousel Builder's `slides` is an
  array of **objects** `{n, role, text, visual_note}` (and Visual Direction's
  `per_slide_direction` is `{slide, direction}[]`). `String({...})` renders
  `[object Object]`.
- **Worse:** typing in one of those textareas replaces the object with a plain
  string in the payload; approving then fails schema validation with a confusing
  "Edited output is invalid" error. So slides are un-reviewable AND un-editable.
- **Fix:** add an object-array editor branch: when `Array.isArray(value) &&
  typeof value[0] === "object"`, render each item as a bordered mini-card with a
  labeled input per key — `text`/`direction`/long strings → textarea, `role` →
  small input, numbers (`n`, `slide`) → shown as the card's ordinal label, not
  editable. Preserve object shape on edit (spread the item, replace only the edited
  key, keep numbers as numbers). Keep the × remove per item.
- **Verify:** run Build carousel on an idea (real run), confirm slides render as
  readable editable cards; edit one word; approve; note written correctly.

### 2. Feed-wire race can resurrect consumed wires / drop fresh plugs
- **Where:** `web/src/components/Canvas.tsx` — `persistFeeds` POSTs the **entire**
  feeds list from `feedsRef`; the `[notes, ready]` effect refetches `/api/layout`
  and overwrites `feedsRef` when different; server prunes feeds on approve
  (`server/src/routes.ts` approve handler).
- **Cause:** full-list replace + two writers (client drag, server consumption) with
  no ordering. Failure modes: (a) user plugs a wire right after an approve, before
  the client re-sync — the POST includes already-consumed wires and resurrects
  them; (b) the periodic re-sync lands between a local drag and its debounced POST
  and stomps the new wire until the next sync.
- **Fix:** replace full-list replace with **delta endpoints**:
  `POST /api/feeds { noteId, operator }` and
  `DELETE /api/feeds { noteId, operator }` (server mutates the stored list
  atomically and returns the full authoritative list; client always adopts the
  response into `feedsRef`). Remove `feeds` from the `POST /api/layout` body
  (positions only). Keep the periodic re-sync as-is — it becomes safe once all
  writes are deltas.
- **Verify:** plug wire → run → approve → wire disappears and STAYS gone after
  another drag; plug two wires quickly in a row — both survive the next sync.

### 3. Notes created directly in Obsidian get a new id on every scan
- **Where:** `server/src/vault.ts` (~line 122): `id: fm.id ?? nanoid(8)` inside
  `readNote`.
- **Cause:** a note without an `id` in frontmatter (i.e. any note Yen writes by
  hand in Obsidian — an intended workflow, the vault is HER database) gets a fresh
  random id on every `listNotes()` walk. Consequences: canvas position never
  sticks, feeds pointing at it silently die, `findById` fails between scans,
  operator runs on it 404.
- **Fix:** in `readNote`, when frontmatter has no `id`, generate one **and write it
  back to the file** immediately (atomic write, preserve body + other frontmatter).
  One-time self-heal per file. (Alternative — deterministic id from relPath hash —
  breaks when a file is renamed/moved; prefer the write-back.)
- **Verify:** create a note by hand in Obsidian under `01 Inputs/Hooks/` with no
  frontmatter; within one poll it should appear on the board, be draggable with a
  sticky position, and be runnable.

---

## P2 — Logic gaps

### 4. Duplicate "Idea / Idea" badges still in two places
- **Where:** fixed in `NoteDetail.tsx` only. Still duplicated in
  `web/src/components/Library.tsx` (~118–119: status badge + type badge) and
  `web/src/components/NoteNode.tsx` (~53–54: `node-type` label + status badge).
- **Fix:** same rule as NoteDetail — when `pretty(type) === pretty(status)`
  (idea/idea), render only one.

### 5. Unsaved default card positions reshuffle
- **Where:** `Canvas.tsx` `rebuild()` — cards without a saved position get a
  computed default (`colY` stacking), but the default is only persisted after the
  user drags something. Meanwhile the stacking input (notes list) changes after
  every run/classify, so undragged cards jump around between rebuilds.
- **Fix:** after `rebuild()` assigns any **new** default positions, debounce-save
  `positions.current` (reuse the existing 600 ms saver). One flag: only save when
  at least one new default was assigned.

### 6. Lifecycle dead-ends: `approved` / `posted` statuses are unreachable
- **Where:** `Library.tsx` STATUSES offers them; nothing in the codebase ever sets
  them; vault folder `05 Posted` is never written to.
- **Fix (small, closes the loop):** on `carousel_draft` / `design_brief` /
  `reel_draft` notes, add a "Mark as posted" action (note window button is enough):
  sets `status: posted`, moves the file to `05 Posted/`. This is also the future
  input for the Feedback operator (see `system/operators.md`, later operators).

### 7. Classify with several cards plugged only processes one — silently
- **Where:** `classifier.ts` `buildUserPrompt`/`apply` use the first raw note;
  consumption correctly eats only that card's wire. But the machine shows
  "Run · 3 plugged in", implying a batch.
- **Fix (pick one):**
  a) Honest label: when the operator is `input-classifier` and feeds > 1, make the
     Run button say "Run next (3 waiting)"; or
  b) Real batch: client-side queue — run, review, approve, auto-run the next wired
     card until none remain. (b) is the better UX and matches Yen's earlier
     "batch review queue" wish; do (a) if time-boxed.

### 8. "Keep" on a trend leaves the trend eligible to re-run forever
- **Where:** `trendTranslator.ts` `apply` — on `skip` the trend is archived with a
  reason; on `keep` the trend note is untouched (stays `processed`, stays wired-
  eligible, could be translated again and again).
- **Fix:** on keep, set the trend note's status to `archived` too (with
  `translated_to: [[idea link]]` in frontmatter instead of `skip_reason`) — it did
  its job; the idea carries the torch. Keeps the board truthful.

---

## P3 — Polish / hardening (do after P1–P2)

### 9. Modal-run eats board wires as a side effect
- Running an operator from a note's window (`NoteDetail` buttons) goes through the
  same approve path, which prunes feeds for `(operator, sourceNoteIds)` — so if
  that card was ALSO wired to that machine on the board, its wire gets consumed by
  a modal run. Surprising. **Fix:** include `via: "modal" | "board"` in the run
  request; skip feed-pruning for modal runs.

### 10. Long summary overflows the card face
- Output summaries are sliced to 100–140 chars at write time, but classifier
  summaries can be long (see Yen's spiral note). `NoteNode` slices display at 140 —
  fine — but `Library` row does 90 and the modal title 70; unify: display-slice in
  one helper, and don't slice at write time except idea/carousel (data should stay
  complete in frontmatter).

### 11. Lineage-edge basename collisions
- `Canvas.tsx buildEdges` maps notes by basename; identical filenames in different
  folders collide (first wins). Low likelihood (date-prefixed slugs); note only —
  no action unless it bites.

### 12. `inspect-board.mjs` hardcodes the Chrome path
- Fine on this Mac; add a `CHROME_PATH` env override so the script doesn't die on
  a different machine. One line.

### 13. Review-window title vs payload field capitalisation
- `ReviewModal` label logic: `(key.charAt(0).toUpperCase() + key.slice(1)).replaceAll("_", " ")`
  gives "Usefulness score" ✓ but "Why it works" → "Why_it_works" → check: it
  uppercases before replacing, so "why_it_works" → "Why it works" ✓. No bug —
  listed so you don't "fix" it.

---

## What was checked and found sound (don't churn these)

- `claude.ts`: serialized queue, timeout kill, fenced-JSON extraction with balanced-
  brace fallback, single corrective retry, `--setting-sources ""` isolation. Sound.
- Approve path re-validates edited payloads against the operator zod schema
  server-side. Sound.
- Archive/restore round-trip (`archived_from`) incl. classifier→folder mapping. Sound.
- Vocab system: `system/tags.md` → parser → `/api/vocab/:operator` → dropdowns/
  tag-pickers; classifier prompt hard-constrained to vocab; pillars parsed live
  from `content.md` with fallback. Sound.
- Stale-tab defenses: no-store HTML, bundle self-check reload, pulse indicator,
  empty-board retry polling. Sound.
- React Flow rendering rules (learned the hard way, see tasks/lessons.md): nodes
  merged by id (never wholesale-replaced), callbacks through `cbRef`, no key-based
  remount, imperative one-time fitView. **Do not regress these while editing
  Canvas.tsx.**

## Verification protocol (run after each priority band)

```bash
cd /Users/yen/Documents/contentops
npm run typecheck && npm run build -w web
# restart server:
pkill -f "tsx server/src/index.ts"; NO_OPEN=1 npx tsx server/src/index.ts &
npm run check:board          # nodeCount === visibleCount, CONSOLE ERRORS: none
```
Plus one **real** end-to-end run for anything touching operators or review UI:
capture → classify → approve (subscription Claude call, ~20 s) — and for issue #1
specifically, a real Build carousel run with a slide edit before approve.

Commit per band with clear messages; push to `dev/phase-1`. Do not merge to `main`
— Yen decides that after dogfooding.
