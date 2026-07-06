# Phase 1 — The Brain

- [x] Scaffold repo (workspaces, tsconfig, gitignore)
- [x] Server: config + vault layer (bootstrap, atomic notes)
- [x] Server: Claude headless runner (subscription, JSON extraction, retry)
- [x] Server: operators — Input Classifier + Idea/Hook (voice-seeded)
- [x] Server: REST API + static serving
- [x] Web app: Inbox/Capture, Library, Note detail, Review, Settings
- [x] Bootstrap vault folders in FLOW FAE CONTENT OPS
- [x] End-to-end verify: capture → classify → idea/hook → approve (real Claude calls)
- [x] Screenshots for Yen, push branch

## Review (2026-07-06)

Phase 1 built and verified end-to-end with real Claude subscription calls (no API key):

1. **Health** — vault + Claude CLI 2.1.201 detected, green.
2. **Capture** — text and text+image both write valid raw notes to `00 Inbox` with assets filed.
3. **Classifier** — real run: tagged a savasana thought as `hook` (score 5), moved it to `01 Inputs/Hooks/`. Image run: correctly read a PNG and described it (`visual_reference`, honest score 2).
4. **Idea+Hook** — produced an on-voice angle + 10 hooks (question-led, no rejection-triples, no jargon); approved → idea note in `03 Generated Ideas` with wikilinks back to source.
5. **Reject path** — rejected proposal wrote nothing; note stayed `raw`.
6. **Obsidian compat** — valid YAML frontmatter, wikilinks, atomic writes.

Key implementation choices:
- `--setting-sources ""` isolates operator runs from Yen's global CLAUDE.md/hooks (spike showed leakage).
- JSON extracted from fenced block (fallback: balanced braces), zod-validated, one corrective retry.
- Notes indexed by on-demand vault scan (simpler than a watcher; Obsidian edits appear on every refresh).
- Operator prompts are editable notes in `02 Operators/` — re-read on every run.

Phase 2 next (after Yen dogfoods): format builders (carousel/reel/caption) + Visual Direction operator.
