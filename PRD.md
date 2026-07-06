# Content Machine — Product Requirements Document

**Owner:** Yen
**Prepared for:** Fable 5 (build agent)
**Date:** 2026-07-06
**Status:** Ready to build (Phase 1)

---

## 0. How to read this doc (note to the build agent)

This PRD describes a personal content-creation system for a solo creator working in the yoga / wellness / tarot–chakra–philosophy space. The owner is **non-technical** — the running app must be usable without touching a terminal after setup.

The system is a **local web app** with three layers:

1. **Memory** — an Obsidian markdown vault = the database / source of truth.
2. **Operators** — AI transformations that turn messy inputs into structured content records.
3. **Production** — Figma templates that turn approved ideas into finished posts.

**Non-negotiable constraint (read carefully):** The AI operators run on the owner's **Claude Pro/Max subscription via the Claude Code CLI in headless mode — NOT the Anthropic API and NOT an API key.** This is a proven pattern (the owner's "Bhat" bot runs this way). See §4 for the exact mechanism. Do not swap this for `ANTHROPIC_API_KEY` or the OpenAI API to "make it easier." If something forces a paid API, stop and flag it rather than silently switching.

Build in the phase order in §11. Ship Phase 1 fully working before starting Phase 2.

---

## 1. Vision & problem

The owner's creative inputs are scattered and messy: Pinterest saves, Instagram screenshots, saved hooks, tarot/chakra themes, yoga philosophy notes, visual references, and random thoughts. There's no system that turns this raw taste-archive into usable, on-brand content.

**Content Machine** is a "creative machine" modeled on a node/TouchDesigner mental model: raw inputs flow in, pass through single-purpose AI **operators**, and come out as structured, reviewable, production-ready content — all stored as markdown in Obsidian so nothing is locked in a proprietary app.

**Success = ** the owner can drop a screenshot or a thought into the system and, within a few clicks, get organized inputs, on-voice content angles + hooks, format structures (carousel/reel/caption), and a visual brief that maps to a Figma template — with a human review gate at each step.

---

## 2. Users & principles

- **Primary user:** Yen (solo creator, non-technical).
- **Design principles:**
  - **Obsidian is the source of truth.** Every record is a markdown file with YAML frontmatter. The app never hides data in a database the owner can't open.
  - **Human-in-the-loop.** AI generates; the owner reviews and approves. Nothing auto-posts.
  - **Taste-led, not copycat.** Visual operators extract *design DNA / principles*, never "copy this exact design."
  - **Structured output.** Operators must return schema-conformant data (JSON), which the app renders into clean markdown notes — not loose prose dumped into a file.
  - **Local-first & private.** Runs on the owner's Mac. No cloud account required to use it.

---

## 3. System architecture (overview)

```
┌─────────────────────────────────────────────────────────────┐
│  WEB APP (local, runs on the Mac)                            │
│                                                              │
│  Frontend (browser UI)      Backend (local server)          │
│   - Inbox / capture          - Reads & writes vault .md      │
│   - Operator buttons         - Runs operators (calls Claude) │
│   - Review & approve         - Talks to Figma                │
│   - Dashboards (Dataview-    - Watches the vault folder      │
│     like views)                                              │
└───────────┬──────────────────────────┬──────────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────┐   ┌──────────────────────────────────┐
│  OBSIDIAN VAULT        │   │  CLAUDE CODE CLI (headless)      │
│  (markdown = database) │   │  runs on Yen's Pro/Max login     │
│  folders + frontmatter │   │  → the "operator" processor      │
└───────────────────────┘   └──────────────────────────────────┘
                                        │
                                        ▼
                            ┌──────────────────────────────────┐
                            │  FIGMA (production layer)         │
                            │  templates populated from briefs  │
                            └──────────────────────────────────┘
```

- The **vault is a plain folder** the app reads/writes. The owner can also open it in Obsidian directly; the app and Obsidian stay in sync because both just read/write the same `.md` files.
- The backend is the only thing that shells out to the Claude Code CLI and to Figma. The frontend never holds secrets.

---

## 4. The AI engine — Claude on the subscription (CRITICAL SPEC)

**Decision:** All automated operators run through **Claude Code in headless / print mode**, authenticated by the owner's existing Claude Pro/Max login (OAuth). No API key, no per-use billing.

**Mechanism the backend must use:**

- Invoke the CLI as a subprocess, e.g.:
  ```
  claude -p "<operator prompt with the input note contents>" \
         --output-format json \
         --append-system-prompt "<operator system prompt>"
  ```
  (Equivalently, the Claude Agent SDK / `@anthropic-ai/claude-agent-sdk` can be used — it inherits the same subscription auth. Pick whichever gives cleaner structured output; the CLI subprocess is the simpler, proven path.)
- **Auth:** relies on the machine already being logged in via `claude` (the same session this app's owner uses). The app must NOT set `ANTHROPIC_API_KEY`. On first run, if Claude isn't logged in, the app should surface a friendly "Please run `claude` once and log in" message rather than failing cryptically.
- **Structured output:** each operator prompt must instruct Claude to return **only JSON matching the operator's schema** (schemas in §7). The backend parses that JSON, validates it against the schema, and on success writes a new/updated markdown note. On invalid JSON, retry once with a "return valid JSON only" nudge, then surface an error to the review UI (never write a malformed note).
- **Concurrency:** operators run one input at a time per operator by default; a small queue is fine. Show progress/spinner in the UI.
- **Model:** use the CLI default (the owner's plan model). Optionally expose a setting to pin a model. Do not hardcode an API model id.

**Explicitly out of scope / forbidden:** scripting ChatGPT Plus. There is no supported automation path for a ChatGPT Plus subscription. The owner will use ChatGPT manually in the browser as a second opinion; the app does not integrate it. Do not add unofficial/reverse-engineered ChatGPT clients.

---

## 5. Data model — the Obsidian vault

### 5.1 Folder structure (create on first run if missing)

```
/00 Inbox              ← raw, unprocessed captures land here
/01 Inputs
  /Trends
  /Hooks
  /Visual References
  /Yoga Notes
  /Personal Reflections
  /Tarot-Chakra-Philosophy
/02 Operators          ← operator prompt definitions live here (editable by owner)
/03 Generated Ideas    ← output of Idea/Hook operators
/04 Drafts             ← format-builder output (carousels, reels, captions)
/05 Posted             ← shipped content
/06 Feedback           ← post-performance notes
/assets
  /screenshots
  /pinterest
  /ig
```

### 5.2 Note = record. Frontmatter schema.

Every note is markdown with YAML frontmatter. Base fields on **every** note:

```yaml
---
id: <uuid or slug>            # stable id
type: <see type list>         # what kind of record this is
status: raw | processed | idea | draft | approved | posted | archived
pillar: <content pillar>      # e.g. visual_language, yoga_philosophy, ...
created: 2026-07-06
updated: 2026-07-06
source: <where it came from>  # instagram_screenshot, pinterest, manual, trend, ...
tags: []
links: []                     # [[wikilinks]] to related notes
---
```

**`type` values:** `visual_reference`, `hook`, `trend`, `yoga_note`, `personal_reflection`, `tarot_chakra_philosophy`, `idea`, `carousel_draft`, `reel_draft`, `caption_draft`, `design_brief`, `feedback`.

Type-specific fields are defined per operator in §7 (each operator's output schema *is* the frontmatter contract for the notes it writes).

Images are embedded with standard Obsidian syntax (`![[assets/screenshots/foo.png]]`) and the file is copied into `/assets/...` on capture.

### 5.3 Sync behavior

- The backend **watches the vault folder** for changes so notes added directly in Obsidian appear in the app.
- All writes are atomic (write temp file, rename) to avoid corrupting a note Obsidian has open.
- The app never deletes owner content silently; "archive" sets `status: archived` and/or moves to an `/archive` area — it does not `rm`.

---

## 6. The web app

### 6.1 Screens (v1)

1. **Inbox / Capture** — drag-drop a screenshot, paste a link, or type a thought. Creates a note in `/00 Inbox` with `status: raw`. One-click "Classify" runs the Input Classifier.
2. **Library / Dashboard** — table + board views of notes filtered by `type`, `pillar`, `status` (this is the "Dataview-like" layer). Click a note to open it.
3. **Note detail** — renders the note (frontmatter + body + embedded image), shows which operators can run on it, and a run button per operator.
4. **Operator run + review** — shows AI output side-by-side with the source, with **Approve / Edit / Reject**. Approve writes the output note into the right folder and advances `status`.
5. **Production (Figma)** — for `design_brief` / `carousel_draft` notes, a "Send to Figma" action (see §8).
6. **Settings** — vault path, Figma token, operator definitions, Claude login status check.

### 6.2 Non-functional

- Runs locally: one command (or a double-click launcher / menu-bar app) starts backend + opens the UI in the browser.
- No login/multi-user. Single owner.
- Secrets (Figma token) stored locally (OS keychain or a gitignored `.env`), never in the vault, never in the frontend bundle.
- Graceful errors surfaced in-UI (Claude not logged in, Figma token missing, invalid AI output).

---

## 7. The operators (the core value)

Each operator = a single-purpose transformation: **read note → send note + operator prompt to Claude → receive structured JSON → write a new/updated note.** Operator prompt templates live as editable notes in `/02 Operators` so the owner can tune them without code.

All four below are **v1** (owner selected all). Build them in this order.

### 7.1 Input Classifier
- **Input:** any raw note from `/00 Inbox` (text and/or image).
- **Job:** tag it and route it.
- **Output schema:**
  ```json
  {
    "type": "visual_reference | hook | trend | yoga_note | personal_reflection | tarot_chakra_philosophy",
    "pillar": "string",
    "aesthetic": ["string"],
    "mood": ["string"],
    "usefulness_score": 1-5,
    "suggested_folder": "string",
    "summary": "one-line summary"
  }
  ```
- **Effect:** updates frontmatter, sets `status: processed`, moves note to the suggested `/01 Inputs/...` subfolder.

### 7.2 Idea + Hook operator
- **Input:** a processed input note (or several selected notes).
- **Job:** produce content angles + hooks in the owner's voice.
- **Output schema:**
  ```json
  {
    "angle": "the content angle / core idea",
    "why_it_works": "string",
    "hooks": ["10 hooks in Yen's tone"],
    "suggested_format": "carousel | reel | caption | story",
    "pillar": "string"
  }
  ```
- **Effect:** writes an `idea` note to `/03 Generated Ideas`, links back to source input(s).
- **Voice note for the prompt:** hooks must respect Yen's writing style. IMPORTANT: never use "rejection-triple" slogans (e.g. "Not another X. Not another Y. Not another Z.") or close cousins. Keep it grounded, first-person, non-jargony.

### 7.3 Format builders (carousel / reel / caption)
Three sub-operators sharing one pattern. Input = an approved `idea` note.

- **Carousel operator → output:**
  ```json
  {
    "slides": [
      {"n": 1, "role": "hook", "text": "...", "visual_note": "..."},
      {"n": 2, "role": "body insight", "text": "...", "visual_note": "..."}
    ],
    "caption": "...",
    "recommended_template": "scrapbook_carousel"
  }
  ```
- **Reel operator → output:** `{ "shot_list": [{"shot": 1, "visual": "...", "voiceover": "..."}], "hook_line": "...", "caption": "..." }`
- **Caption operator → output:** `{ "caption": "...", "alt_variations": ["..."], "hashtags": ["..."] }`
- **Effect:** writes a `*_draft` note to `/04 Drafts`, `status: draft`.

### 7.4 Visual Direction operator
- **Input:** an `idea` note + one or more `visual_reference` notes (with images).
- **Job:** extract **design DNA** from references and produce a brief that maps to a Figma template. Taste-led — reusable principles, not "copy this."
- **Output schema:**
  ```json
  {
    "design_dna": ["tactile", "layered", "handwritten", "..."],
    "mood": "string",
    "design_elements": ["torn paper", "annotation labels", "..."],
    "yoga_use_case": "how this translates to Yen's world",
    "recommended_figma_template": "scrapbook_carousel",
    "per_slide_direction": [{"slide": 1, "direction": "..."}]
  }
  ```
- **Effect:** writes a `design_brief` note to `/04 Drafts`, ready for the Figma step.

---

## 8. Figma integration (production layer) — READ THIS, IT HAS A CATCH

The owner wants operators to "push into Figma templates" in v1. **Honest technical reality Fable must design around:**

- **Figma's REST API can read files, read/duplicate templates, and read/write Variables and comments — but it CANNOT create or fully lay out arbitrary design nodes.** Creating/populating design content programmatically requires the **Figma Plugin API**, which runs *inside* Figma (in a plugin), not from an external server.
- Therefore "AI fills my Figma template automatically" = **two pieces**:
  1. **Backend:** produces the structured brief/slide content (already done by §7 operators) and, via REST + Figma **Variables**, sets text/content variables on a duplicated template file. This covers text-driven templates well.
  2. **A small companion Figma plugin** (part of this project): the owner opens the template in Figma and clicks the plugin; it reads the brief (via the variables the backend set, or by pasting a brief id) and populates the template's text layers / swaps components. This is the only supported way to push real content into the design canvas.

**v1 Figma acceptance = ** owner clicks "Send to Figma" on a `carousel_draft` + `design_brief` → backend duplicates the correct template file and writes the slide text into Figma Variables / a shared data channel → owner opens Figma, runs the companion plugin, and the template auto-fills with the slide copy. Full pixel-perfect auto-layout of scrapbook elements is **not** promised in v1; the plugin fills text and swaps named components, the owner finishes styling.

**Prerequisite deliverable:** the owner must first build the reusable Figma templates + named components (scrapbook carousel, asana card, chakra block, quote card, slide-title system, etc.). The app references templates by name. Document the naming contract the plugin expects.

If, during build, Figma's platform makes even the plugin path unworkable for the owner's templates, **flag it** and fall back to: app exports the brief + slide copy as a clean, copy-pasteable checklist the owner pastes into Figma manually. (Owner also indicated Canva could be acceptable as an alternate production tool — keep the production layer loosely coupled so swapping is cheap.)

---

## 9. Tech stack (recommended, not mandatory)

- **Backend:** Node.js (TypeScript). Reasons: same ecosystem as the Claude Agent SDK, easy subprocess control for the `claude` CLI, easy Figma REST + plugin (plugins are JS/TS), good file-watching.
- **Frontend:** a lightweight React app (Vite) served locally by the backend. Keep it simple — it's a single-user tool.
- **Vault I/O:** gray-matter (frontmatter parsing) + chokidar (file watching).
- **Schema validation:** zod for operator output schemas.
- **Figma:** REST for file/variable ops + a small bundled plugin for canvas population.
- **Packaging:** a one-command start (`npm start`) for v1; optionally an Electron or menu-bar wrapper later so the non-technical owner double-clicks to launch.

Fable may choose Python for the backend if it prefers, but Node keeps the Figma plugin and backend in one language.

---

## 10. Explicitly OUT of scope (do not build)

- Auto-scraping Instagram/Pinterest.
- Auto-generating finished designs end-to-end (see §8 catch).
- Auto-posting to any platform.
- ChatGPT Plus automation / any unofficial ChatGPT client.
- Multi-user, accounts, cloud hosting.
- Full trend-detection system.

Start with **manual capture + automated synthesis + human review.**

---

## 11. Build phases (ship in this order)

**Phase 1 — The brain (MUST ship first, fully working):**
- Vault folder bootstrap + frontmatter schema.
- Backend ↔ Claude Code CLI headless wiring (§4) with structured-output validation.
- Web app: Inbox/Capture, Library dashboard, Note detail, Operator run+review.
- Operators: **Input Classifier** and **Idea + Hook**.
- Acceptance: owner drops a screenshot → classifies → generates on-voice hooks → approves → note lands in `/03 Generated Ideas`.

**Phase 2 — Formats & visual direction:**
- **Format builders** (carousel/reel/caption) and **Visual Direction** operator.
- Drafts folder flow + review.
- Acceptance: approved idea → carousel structure + caption + design brief notes in `/04 Drafts`.

**Phase 3 — Figma production:**
- Figma REST duplication + Variables + companion plugin (§8).
- "Send to Figma" action.
- Acceptance: draft → template auto-filled with slide copy in Figma via the plugin.

**Phase 4 — Polish:**
- Editable operator prompts in `/02 Operators`, Dataview-style dashboards, double-click launcher, feedback loop (`/06 Feedback`).

---

## 12. Risks & open questions

- **Claude CLI auth in a subprocess:** verify the headless `claude -p` call inherits the owner's logged-in session on this Mac before building UI on top of it. This is the single biggest technical assumption — spike it first.
- **Structured output reliability:** Claude must return clean JSON. Use the retry+validate guard in §4; consider asking for a fenced ```json block and parsing that.
- **Figma canvas population:** confirmed to need a plugin (§8) — don't over-promise auto-design.
- **Voice fidelity:** the Idea/Hook operator's voice depends on a good system prompt seeded with Yen's writing style. Leave the prompt editable and iterate.
- **Vault/Obsidian write conflicts:** use atomic writes; test with Obsidian open on the same note.

---

## 13. Acceptance criteria (definition of done for v1 = Phase 1)

1. Fresh install bootstraps the vault folders and base schema.
2. Owner can capture a screenshot/hook/thought into the Inbox from the web UI.
3. Input Classifier runs **on the owner's Claude subscription with no API key**, tags the note, and routes it.
4. Idea+Hook operator produces on-voice hooks (no rejection-triple slogans) as validated structured output.
5. Every AI step has a human Approve/Edit/Reject gate; approved output is written as a clean markdown note with correct frontmatter that also opens correctly in Obsidian.
6. No secrets in the frontend or the vault; clear in-UI errors when Claude isn't logged in.
```
