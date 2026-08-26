---
name: auditing-repo-docs
description: Use when auditing Pixi's public-facing GitHub docs (README, docs/ pages, GitHub About/topics) for content/voice quality or for SEO/GEO discoverability — checking them against docs/repo-voice.md and the writing-repo-docs skill rather than writing new docs from scratch. Also for "audit the README", "check our SEO", "how discoverable are our docs", "does this read like an LLM would cite it", or a periodic health check on the repo's public surface.
---

# Auditing Repo Docs

## Overview

`writing-repo-docs` is how new repo docs get written; this skill is the
recurring check that what's already published still holds up — against
voice, against classic search (SEO), and against LLM answer-engine
discoverability (GEO). One pass, one findings file, two check categories
— not two separate audits, since both read the same text in the same
sitting. It never edits the docs itself; findings become fixes the user
approves, same as `auditing-tool-improvements`.

## When to Use

- "Audit the README", "check our SEO", "review the docs", "is this
  discoverable", "would an AI cite this correctly".
- Periodically, independent of any specific doc change — voice drift and
  stale claims accumulate silently.
- After a `writing-repo-docs` pass, to verify the result before publishing
  (self-audit) — or on docs written before this skill existed.

**Not for:** writing a doc from scratch (`writing-repo-docs`), auditing
UI/code (`auditing-tool-improvements`, `auditing-scope-gaps`), or checking
prose grammar/typos in isolation — this is about discoverability and
correctness-of-claims, not copyediting.

## Two Categories, One Pass

| Category | Checked against | Core question |
|---|---|---|
| **Content & voice** | `docs/repo-voice.md`, `writing-repo-docs`'s document-set/structure guidance | Does this doc say true things, in Pixi's register, without duplicating another doc? |
| **SEO & GEO** | `writing-repo-docs`'s "README on-page SEO" section, GEO checks below | Can a search engine and an LLM answer-engine both find and correctly quote this? |

SEO and GEO are one category, not two, because the techniques overlap more
than they diverge — a clear declarative opening sentence serves both. Flag
which sub-type (SEO vs GEO) a finding is under, but don't run separate
passes.

## Procedure

1. **Inventory the surface**: README.md, everything under `docs/*.md`
   that's reader-facing, and the GitHub repo's About blurb/topics/
   homepage. Two kinds of `docs/*.md` are *not* reader-facing and get a
   lighter check instead of the full Content/SEO/GEO pass: internal-only
   files (`docs/audits/`, `docs/superpowers/` — skip entirely) and this
   skill's own tracking docs (`docs/repo-docs-plan.md`,
   `docs/repo-docs-research.md` — a stranger evaluating Pixi never reads
   these, so don't run SEO/GEO checks on them, but do a quick staleness
   check: does `repo-docs-plan.md`'s status column still match reality?
   A wrong ✅/❌ there misdirects the next audit, so it's worth one line
   even though it's not the main target).

   Fetch the GitHub About blurb/topics/homepage live if you have network
   access (see `writing-repo-docs`'s inventory step for the commands). If
   you don't, don't skip the check — fall back to the state already
   recorded in `docs/repo-docs-plan.md`, mark that finding `needs-recheck`
   with a note to confirm live before acting on it, and say so explicitly
   in the audit file's header rather than silently omitting the check.

2. **Content & voice pass** — for each doc, check against
   `docs/repo-voice.md` and `writing-repo-docs`:
   - Any second-person benefit copy, intensifier adjectives ("powerful",
     "seamless"), or unearned claims? (repo-voice.md's three rules)
   - Any doc re-explaining what another doc already covers, instead of
     linking to it?
   - Any status/feature claim that's gone stale (compare against
     `openspec/roadmap.md` and current `openspec/specs/` — a README
     claiming a feature the roadmap now shows as removed/changed is a
     finding, not a hypothetical)
   - Terminology drift from `docs/ui-reference.md`'s names (Canvas,
     Workspace, Gallery, Layers, Export — see repo-voice.md's table)
   - Document-set gaps against `docs/repo-docs-plan.md`'s Now/Later
     table — anything marked "Now" that's still unchecked

3. **SEO pass**:
   - Does the H1 or the line directly under it contain the actual search
     phrase a stranger would type, not just the project name alone?
   - Is the core noun phrase repeated naturally 2–4× in the opening
     section (not once, not stuffed)?
   - Do meaningful images have real alt text?
   - Is the GitHub About blurb worded like the README's opening line, or
     a generic category label?
   - Is a badge wall or long preamble pushing the keyword-bearing text
     below the fold?

4. **GEO pass** (distinct from classic SEO — optimizing for LLM
   answer-engines quoting a self-contained snippet, not for search
   ranking):
   - Is there one **declarative, self-contained sentence** near the top
     that fully identifies the project ("Pixi is a browser-based pixel
     art drawing tool that runs entirely client-side...") and would still
     make sense lifted out of context with no surrounding text? Persuasive
     or vague openers ("A tool for creators who want more") fail this —
     an answer-engine can't safely quote them as fact.
   - Are claims **dated or version-qualified** where they could go stale
     ("as of Phase 2" rather than a bare "currently"), so a model citing
     this text later doesn't repeat something now false?
   - Is there an `llms.txt` (or equivalent plain-text index for LLM
     crawlers) if the project has a docs site large enough to need one?
     Not required for a single-README project — flag as a suggestion,
     not a finding, below that scale.
   - Do structured lists (features, install steps) stand alone as
     answerable chunks — each bullet a complete fact — rather than
     depending on a preceding sentence's pronoun ("it also supports...")
     to make sense in isolation?

5. **Record findings as you go**, one per issue, tagged with doc + line
   region + category (Content / SEO / GEO).

6. **Write the findings file** to `docs/audits/<date>-repo-docs-audit.md`,
   following this project's existing audit-file format (see
   `docs/audits/2026-08-17-ui-polish-audit.md` for the exact shape: a
   dated header explaining the pass, a severity/state legend, one table
   row per finding with a stable ID like `RDOC-1`, and a "Notes per
   finding" section below with the reasoning/fix direction for each).
   Append new passes as new dated files rather than overwriting a
   previous audit.

7. **Present the findings and stop.** Do not edit the docs. The user
   approves which findings to act on; approved content/structure changes
   go back through `writing-repo-docs`, not ad hoc edits here.

## Common Mistakes

- **Treating SEO and GEO as needing separate passes or files.** They
  read the same text — one pass, category-tagged findings, one file.
- **Flagging voice violations that are actually necessary exceptions**
  (e.g. a legal/security notice that has to use stiffer language) —
  `repo-voice.md` says explicitly this is a default, not a straitjacket;
  don't file a finding against a deliberate, justified deviation.
- **Judging GEO by classic SEO instincts** — a keyword-stuffed heading
  helps search ranking but can hurt extractability if it's not also a
  complete, standalone factual sentence. Check both, don't assume one
  implies the other.
- **Fixing findings inline instead of reporting them.** This skill's job
  ends at the findings file, same discipline as the other `auditing-*`
  skills in this repo.
- **Re-deriving the document-set checklist from scratch** instead of
  cross-checking `docs/repo-docs-plan.md`, which already tracks Pixi's
  current state against the generic list.
