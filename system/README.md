# Flow Fae — Content System (foundation)

The operating manual for a modular, operator-style content system for yoga / wellness / mindfulness / spirituality / visual lifestyle content. Human-in-the-loop by design: **you are the review operator.**

This folder is the **brain**. The running app (repo root) is the **hands**. Operators read these files so strategy lives in one place.

- **[content.md](content.md)** — what we say and why (pillars, voice, formats, hooks, idea→post pipeline).
- **[visual.md](visual.md)** — how it looks (dialects, colour moods, type, Figma, extracting DNA from screenshots).
- **[operators.md](operators.md)** — the production modules + the first 5 to build + how to review.

---

## Suggested Folder Structure

The system spans a **repo** (code + these system files) and the **Obsidian vault** (the living content/reference database).

```
contentops/                     ← repo (code + brain), handed to Fable 5
├── system/                     ← THIS folder — the source-of-truth brain
│   ├── README.md
│   ├── content.md
│   ├── visual.md
│   └── operators.md
├── server/  web/  PRD.md       ← the app that runs the operators
│
└── (Obsidian vault) FLOW FAE CONTENT OPS/   ← the database
    ├── 00 Inbox                ← raw captures land here
    ├── 01 Inputs
    │   ├── Trends
    │   ├── Hooks
    │   ├── Visual References
    │   ├── Yoga Notes
    │   ├── Personal Reflections
    │   └── Tarot-Chakra-Philosophy
    ├── 02 Operators            ← editable operator prompts (inherit from system/)
    ├── 03 Generated Ideas
    ├── 04 Drafts
    ├── 05 Posted
    ├── 06 Feedback
    └── assets/                 ← screenshots, pinterest, ig
```

> **Wiring for Fable 5:** the operator prompts in the vault's `02 Operators/` should be generated from / kept in sync with `content.md` + `visual.md`. One edit to the brain, one behaviour change everywhere. Consider having the app load `system/*.md` as context on every operator run.

---

## Simple Weekly Workflow

A light, repeatable rhythm. ~2–3 focused sessions a week.

**1 · Feed (ongoing, 5 min at a time)**
Whenever you see something — a Pinterest save, an IG screenshot, a line from class, a thought — **capture** it to the Inbox. Don't judge it yet. Volume of raw input is the fuel.

**2 · Sort (Mon, ~20 min)**
Run the **Input Classifier** on everything in the Inbox. Fix any tags. Skim the week's inputs — what's alive?

**3 · Generate (Tue, ~30 min)**
Pick 2–3 of the strongest processed inputs. Run **Idea + Hook** (and **Trend Translator** on any trend saves). Approve the angles that sound like you; bin the rest.

**4 · Shape (Wed, ~40 min)**
For approved ideas: run **Visual Direction** + **Carousel/Reel Builder**. Review structure and brief. This produces drafts in `04 Drafts`.

**5 · Make (Thu, in Figma)**
Build the approved drafts on your named templates. Words are already written; you're designing, not starting cold.

**6 · Post & note (Fri / ongoing)**
Publish. Later, drop a quick performance note into `06 Feedback` — what landed, what didn't. That's the input that improves next week.

> The point isn't to fill a calendar. It's to turn scattered taste into a few pieces you're proud of, with less friction each week.

---

## The Anti-Drift Rule (read this before any AI runs)

**A constitution for every AI agent and operator in this system. The single job of these rules is to keep the work sounding like a specific human, not like the internet's average wellness account.**

**The Prime Directive:**
> Every piece must contain at least one specific, lived, or paradoxical observation that a generic wellness account could not have written. If you can't find it, the idea isn't ready — say so. Do not manufacture depth.

**Never produce (hard bans):**
- Rejection-triples: *"Not another X. Not another Y. Not another Z."* and all close cousins.
- "It's not about X, it's about Y" as a crutch. The tidy rule-of-three. Forced alliteration.
- AI-tells: "In today's fast-paced world," "unlock," "elevate," "game-changer," "dive in," "let's be real," "the truth is," "at the end of the day," "here's the thing."
- Motivational-poster certainty, guru voice, toxic positivity, "manifest your dream life."
- Emoji as punctuation or decoration. Hashtags in the body.
- CTAs that beg ("save this!", "double tap if…").

**Always prefer:**
- The **specific** over the universal. The **question** over the verdict. The **body** over the abstraction.
- Admitting *"I don't know"* over false resolution. Contradiction is allowed — *"so much of life lies in a range."*
- One idea, fully felt, over five ideas listed.

**The two tests (run on every output):**
1. **Say-it-out-loud test:** would the creator say this to a friend, in these words? If it's "content-voice," cut it.
2. **Only-us test:** could any wellness account have posted this? If yes, it isn't ours yet — add the lived specificity or reject.

**When unsure, the agent's move is to ask or to reject — never to fill the gap with generic filler.** A smaller amount of true-sounding work beats a full calendar of average. Drift is the only real failure mode of this system; guard it above output volume.
