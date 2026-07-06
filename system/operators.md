# operators.md — Flow Fae Production Operators

> The operator library. Each operator is a single-purpose module: **input → process → output**, with the creator as the review operator. This file is the human-readable spec; the running app (`server/src/operators/`) is the implementation. Keep them in sync.
>
> **Alignment note for Fable 5:** operators marked `[BUILT]` exist in code today — as of 2026-07-06 all first-5 are built. Every operator must load `content.md` + `visual.md` as context so strategy lives in one place, not in each prompt.

---

## Operator Spec Template

Copy this block to define any new operator.

```
### <Operator Name>   [BUILT | PLANNED]
- **Purpose:** one sentence — the single job.
- **Inputs:** what note type(s) / fields it consumes.
- **Process:** the transformation, step by step.
- **Outputs:** the structured result (schema) and where it's filed.
- **Example prompt:** the instruction given to Claude.
- **When to use:** the trigger condition.
- **How to review:** what the human operator checks before approving.
```

---

## The First 5 Operators (build/use in this order)

### 1. Input Classifier   `[BUILT]`
- **Purpose:** Tag and file any raw capture so the archive stays usable.
- **Inputs:** a raw note from `00 Inbox` (text and/or image).
- **Process:** read input (and image if present) → determine type, pillar, aesthetic, mood, usefulness (1–5), one-line summary → file into the matching `01 Inputs/` subfolder.
- **Outputs:** `{type, pillar, aesthetic[], mood[], usefulness_score, summary}`; note status → `processed`.
- **Example prompt:** *"Classify this captured input. Choose type from: visual_reference, hook, trend, yoga_note, personal_reflection, tarot_chakra_philosophy. Return {type, pillar, aesthetic[], mood[], usefulness_score 1-5, summary}."*
- **When to use:** immediately on every capture, before anything else.
- **How to review:** Is the pillar right? Is the usefulness score honest (a 2 is allowed — not everything is gold)? Fix the tag, then approve.

### 2. Idea + Hook   `[BUILT]`
- **Purpose:** Turn processed input(s) into one content angle + 10 hooks in the creator's voice.
- **Inputs:** one or more `processed` input notes.
- **Process:** find the *turn* (per `content.md` §10 step 3) → write the angle, why it works, 10 hooks across the approved styles, a suggested format, the pillar.
- **Outputs:** `{angle, why_it_works, hooks[10], suggested_format, pillar}` → filed in `03 Generated Ideas`, wired back to sources.
- **Example prompt:** *"From these inputs, produce ONE angle and 10 hooks in Yen's voice (grounded, first-person, paradox-friendly, no rejection-triples). Return {angle, why_it_works, hooks[], suggested_format, pillar}."*
- **When to use:** when a processed input has a real idea in it.
- **How to review:** Do the hooks sound like *her*, out loud? Kill any that smell like AI (see Anti-Drift). Keep 2–3, bin the rest.

### 3. Trend Translator   `[BUILT]`
- **Purpose:** Convert an outside trend/format into an on-pillar, on-voice angle (so we ride trends without becoming generic).
- **Inputs:** a `trend` note (a screenshot or description of a format/sound/topic doing numbers).
- **Process:** identify the trend's mechanic → map it to the nearest pillar → propose how *we* would do it without betraying the voice, or reject it as off-brand.
- **Outputs:** `{trend_mechanic, best_pillar, our_take, format, keep_or_skip, reason}` → `03 Generated Ideas`.
- **Example prompt:** *"Here's a trend. What makes it work, which of our 5 pillars could carry it honestly, and how would we do it in our voice? Or tell me to skip it and why."*
- **When to use:** weekly, on saved trend screenshots.
- **How to review:** Trust the "skip." If our take needs us to abandon the voice to work, skip it.

### 4. Visual Direction   `[BUILT]`
- **Purpose:** Turn an idea + visual references into a design brief mapped to a Figma template (reads `visual.md`).
- **Inputs:** an `idea` note + one or more `visual_reference` notes (with images).
- **Process:** extract design DNA from refs (`visual.md` §9) → choose dialect + mood → write per-slide visual direction → name the Figma template.
- **Outputs:** `{dialect, mood, design_dna[], design_elements[], per_slide_direction[], figma_template}` → `04 Drafts`.
- **Example prompt:** *"Using visual.md, turn this idea + these references into a design brief. Extract reusable design DNA (don't copy), pick one dialect and one mood, and map to a named Figma template."*
- **When to use:** once an idea is approved and heading to design.
- **How to review:** Is it *translating* the reference, not cloning it? One mood only? Does it map to a real template?

### 5. Carousel Builder   `[BUILT]`
- **Purpose:** Expand an approved idea into a slide-by-slide carousel structure + caption.
- **Inputs:** an approved `idea` note (+ optional design brief).
- **Process:** hook slide → one thought per interior slide → landing slide (the turn) → caption. Obeys `content.md` format rules.
- **Outputs:** `{slides:[{n, role, text, visual_note}], caption, recommended_template}` → `04 Drafts`.
- **Example prompt:** *"Turn this idea into a 4–8 slide carousel. Slide 1 = hook, interiors = one thought each, final = the turn (no hard CTA). Include a caption and a visual note per slide."*
- **When to use:** when an idea's format is `carousel` and it's approved.
- **How to review:** Does slide 1 stop the scroll? Does the last slide *land* rather than sell? One idea across the whole set?

> **Later operators** (not first-5): Reel Builder (incl. talking-head scripts), Visual Quote Builder (one line → designed quote spec), **Tarot → Yoga Theme** (card in → class theme + content angle out), **Curation Digest** (the week's processed inputs → "content I consumed this week" roundup), Caption Operator, Repurpose Operator (1 post → 5 derivatives), Feedback Operator (post-performance → notes). Add them using the spec template once the first 5 feel good.
>
> **Taxonomy rule of thumb:** a *noun you collected* = inspiration card. A *verb with an arrow* (X → Y) = operator. The *shape of a finished post* = format (each format earns a builder operator). A *named, repeating container* = series (a recipe combining pillar + format + operator — lives in content.md §5).

---

## How to Review Any Operator Output (universal checklist)

Before you approve, ask:
1. **Voice:** would the creator say this out loud to a friend? (If it's "content-voice," edit or reject.)
2. **Pillar:** does it clearly belong to one of the five?
3. **The turn:** is there a real reframe/question, or is it a flat observation?
4. **Anti-Drift:** does it trip any banned pattern (see `README.md`)?
5. **Specificity:** could a generic wellness account have written this? If yes, it's not ours yet.

Approve → it's written to the vault. Edit → fix inline, then approve. Reject → nothing is written; the source stays untouched. **Rejecting is using the system correctly, not failing at it.**
