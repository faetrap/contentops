# visual.md — Flow Fae Visual System

> The source-of-truth for *how it looks*. The Visual Direction operator reads this to turn references into design briefs; Figma templates are built to obey it. If two posts look like they came from different accounts, this file wasn't followed.

**Assumption to confirm:** exact palette hexes below are a proposed starting point inferred from the existing tools (warm-wellness) and the *Path to Self* dark-mystical work. Lock them once, then treat as law.

---

## 1. Visual Principles

1. **Handmade over produced.** It should look touched by a person — layered, slightly imperfect, tactile. Never stock, never corporate.
2. **The range, not the extremes.** Honour the creator's philosophy visually: soft *and* mystical, light *and* shadow. Two moods, one system (see §4).
3. **Restraint.** One focal idea per frame. White space is a feature, not a gap to fill.
4. **Analog texture.** Paper, grain, ink, torn edges, tape, handwriting. Digital-but-warm.
5. **Beauty is the message.** In the Aesthetic Living pillar, the image *is* the content.

---

## 2. Layout Rules

- **Grid:** a loose editorial grid — margins generous, alignment intentional, but allow one element to break the grid (a taped photo, a scrawled note) so it feels alive.
- **Focal hierarchy:** one hero element, one supporting, everything else quiet.
- **Carousels:** slide 1 = hook (biggest type, most space), interior slides = one thought each, final slide = the turn/landing (never a hard CTA).
- **Safe zones:** keep text clear of IG's UI (bottom ~250px, top corners). Design at 1080×1350 (4:5).
- **Breathing room:** if it feels crowded, remove an element rather than shrink everything.

---

## 3. Typography Direction

- **Two-font system, max:**
  - **Display / headline:** a characterful serif or a warm humanist sans with personality (editorial, slightly literary). Used big, sparingly.
  - **Body / caption:** a clean, legible companion (humanist sans or a quiet serif). High readability.
- **Accent:** real or realistic **handwriting** for annotations, circled words, margin notes — this is a signature move, use it deliberately, not everywhere.
- **Rules:** generous line-height, tight-ish letter spacing on display, left-aligned by default. Never centre long text. Never more than two weights on one slide.

---

## 4. Colour Direction — two moods, one system

**Mood A — Soft Wellness (default, daytime):**
- Warm paper `#FAF7F2`, cream `#F0E9DD`, clay/taupe `#8A7355`, sage `#5A7D5A`, ink `#2D2A26`.
- Feeling: linen, morning light, ceramic, dried flowers.

**Mood B — Mystical (night, tarot/chakra content):**
- Deep aubergine/charcoal grounds, muted gold `#C9A15A`, dusk violet `#7A68A6`, candlelight highlights on near-black.
- Feeling: dusk, ritual, low warm light.

**Rules:** pick *one* mood per post. Chakra/tarot/philosophy → often Mood B. Body/breath/capacity → often Mood A. Never mix the two palettes in a single frame. Colour carries ~80% of the mood — get it right before anything else.

---

## 5. Texture & Reference Styles (the four dialects)

The account speaks four visual dialects. Each post picks one:

- **Scrapbook** — torn paper, tape, layered photos, handwriting, field-notes energy. Best for *Field notes*, personal reflections.
- **Editorial** — clean magazine layout, strong type, generous margins, one striking image. Best for essays, reframes.
- **Mystical** — dark grounds, gold linework, symbolic imagery, ritual. Best for tarot/chakra/philosophy.
- **Soft Wellness** — light, airy, minimal, warm neutrals, gentle. Best for breath, rest, body.

> These correspond to the "design DNA" tags the Visual Direction operator extracts. A reference is useful when we can name which dialect it feeds.

---

## 6. Image Treatment

- **Colour grade toward the active mood** — warm and slightly desaturated (A) or deep and candlelit (B). Consistent grade > perfect photo.
- **Grain / texture overlay** at low opacity to kill the "digital" feel.
- **Real over stock**, always. The creator's own photos, imperfect, beat any stock image.
- **Crop with intent** — negative space, body fragments, close texture. Avoid the centred, symmetrical "yoga stock" look.

---

## 7. Composition Rules

- Rule of thirds as default; break it only for deliberate stillness/symmetry.
- Lead the eye: one entry point, one path.
- Let subjects face into the frame, not out.
- Contrast for the focal point (light on dark, or the one warm thing).
- Consistent margin system across a carousel so slides feel like a set.

---

## 8. Figma Guidance

- **Build a component library, not one-off files.** Reusable pieces: scrapbook frame, tape strip, annotation label, asana card, chakra block, quote card, slide-title system, breath-cue block.
- **Templates named by dialect + format:** `scrapbook_carousel`, `editorial_carousel`, `mystical_carousel`, `soft_reel_cover`, etc. Operators reference templates *by this name*.
- **Use Figma Variables for text** (headline, body, slide copy) so the future companion plugin can fill copy into a template. Design decides the look; the operator only pours words in.
- **Two colour styles** (Mood A, Mood B) as Figma variables so a whole design can be re-moodedin one switch.
- **Master frame 1080×1350**, safe zones marked as a locked overlay layer.

---

## 9. Extracting Reusable Visual Language from Screenshots

The method for turning a Pinterest/IG save into system value (this is the Visual Direction operator's core logic). **Analyse, never copy:**

1. **Name the dialect** — scrapbook / editorial / mystical / soft wellness.
2. **Extract the design DNA** — 3–6 reusable principles ("torn paper edges," "one word circled by hand," "warm grain," "huge margins").
3. **Name the mood** in plain words.
4. **Translate, don't clone** — "how does this become *ours*, in our palette, for our pillar?"
5. **Map to a template** — which Figma template does this feed, or does it justify a new component?

Output is a design brief, not a copy order. The question is always *"what makes this work, and how do we make it ours?"* — never *"reproduce this."*

---

## 10. Visual Anti-Patterns (never ship these)

- Centred, symmetrical stock-yoga photos with a quote slapped on.
- Canva-default gradients, drop shadows, and template energy.
- More than two fonts, or two fonts fighting.
- Mixing Mood A and Mood B in one frame.
- Emoji as design elements. Sparkle/leaf emoji borders.
- Crowded slides — text edge-to-edge with no air.
- Over-filtered, HDR, oversaturated images.
- Copying a reference 1:1 (it will look like someone else's account).
- Inconsistent margins across a carousel (breaks the "set" feeling).
