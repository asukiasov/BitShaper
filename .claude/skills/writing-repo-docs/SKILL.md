---
name: writing-repo-docs
description: Use when writing or reviewing a public GitHub repository's discoverability and usability documents — README, CONTRIBUTING, CODE_OF_CONDUCT, LICENSE, docs/ reference pages, .github/ issue and PR templates, or the repo's About/topics metadata — for Pixi or any public repo where developers need to find it, understand it, and get it running quickly.
---

# Writing Repo Docs

## Overview

A public repo is discovered and judged in seconds, not minutes: search/topic
match → About blurb → README skim → clone-and-run. Every doc in this skill
exists to survive one of those seconds. Write for a stranger who has 30
seconds to decide whether this repo solves their problem, and 5 minutes to
get it running if it does.

## When to Use

- Writing or reviewing README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md,
  LICENSE, or docs/ reference pages for a public repo
- Setting up .github/ISSUE_TEMPLATE or PULL_REQUEST_TEMPLATE.md
- Someone asks "make this repo easier to find/use", "write the README",
  "prep this for open source", or similar
- Auditing an existing public repo's docs for gaps

**Not for:** internal/private project notes, OpenSpec change proposals
(those define requirements, not discoverability — see this project's
CLAUDE.md), or narrative writeups of how a bug was fixed.

**Voice:** use [`docs/repo-voice.md`](../../../docs/repo-voice.md) for
tone, terminology, and what Pixi's docs do and don't say. This skill
covers structure and document set; that file covers language.

## First: Inventory, Don't Assume

Before writing anything, check what already exists — repos accumulate docs
in `docs/`, and duplicating or contradicting them is worse than a gap:

```bash
ls README.md CONTRIBUTING.md CODE_OF_CONDUCT.md LICENSE .github/ 2>/dev/null
find docs -maxdepth 2 -type f 2>/dev/null
```

Link out to existing reference docs (architecture notes, database schema,
roadmap) rather than re-explaining them in the README. The README's job is
orientation, not full documentation.

## Three Layers of Discoverability

Docs content is only part of "developers find and easily use our
repository." Two other layers get skipped by most doc-writing passes:

| Layer | What it is | Why it matters |
|---|---|---|
| **Repo metadata** | About blurb (one line), topics/tags, website link, social preview image | Drives GitHub's own search results and topic pages — before anyone opens a file |
| **README on-page SEO** | The actual visible text in the first screenful: H1, tagline, opening paragraph, image alt text | Google indexes README content directly — for most small/mid projects the GitHub repo page outranks any other page for the project's name, so this text *is* the search snippet |
| **Doc content quality** | README, CONTRIBUTING, etc., read in full | Convinces someone who already clicked in |

Never skip the first two layers: a well-written README on a repo with no
topics, a blank About field, or a keyword-free opening line is invisible to
search even though the content itself is fine.

### README on-page SEO, specifically

The repo landing page is indexed as one document, and the first ~160
characters of visible text function like a search-engine snippet. Concrete
rules, distinct from writing quality:

- **The H1 and/or the line right under it must contain the phrase a
  stranger would actually type**, not just the brand name. `# Pixi`
  followed only by unrelated prose under-serves this — a searcher typing
  "browser pixel art tool" needs to see that phrase near the top, not
  three paragraphs down. Compare: strix's H1 is followed immediately by
  "The open-source AI pentesting tool" — the exact noun phrase a searcher
  types, stated once, plainly.
- **Say the core noun phrase 2–4 times naturally in the first section** —
  once in the title/tagline is not enough for search weight, but stuffing
  it every sentence reads as spam. This is compatible with `repo-voice.md`
  (no intensifier adjectives) because it's about repeating the *noun*
  ("pixel art editor"), not stacking adjectives.
- **Give every meaningful image real alt text** — it's indexable text,
  and it's the accessible-name the screenshot needs anyway.
- **Descriptive link text, not "click here" / "this link".**
- **Keep the GitHub About blurb worded like the opening line**, not a
  generic category label — GitHub renders it into the page's `<meta
  name="description">`, so a vague blurb ("pixel art web app") wastes the
  literal text search engines quote back in results.
- A heavy badge wall *before* any of this text pushes the actual
  indexable content further down the page — keep badges compact and put
  the keyword-bearing tagline at or above them, not buried below a dozen
  shields.

## Document Set and What Each One Answers

Cross-repo research (`docs/repo-docs-research.md`, five OSS repos spanning
solo projects to funded startups) found the doc set tracks whether a repo
has outside contributors yet, not how big or popular it is — a small repo
with an active contributor process needs CONTRIBUTING/CoC; a huge repo
without one (uBlock) skips them. Use that signal, not repo size, to decide
what's in scope right now.

| Document | Question it answers | Skip if |
|---|---|---|
| README.md | What is this, why would I use it, how do I run it? | Never — always required |
| LICENSE | Can I legally use/fork this? | Never, for any public repo |
| CONTRIBUTING.md | How do I set up dev environment and submit a change? | Repo isn't accepting outside contributions yet |
| CODE_OF_CONDUCT.md | What behavior is expected of contributors? | Repo isn't accepting outside contributions yet |
| .github/ISSUE_TEMPLATE/*, PULL_REQUEST_TEMPLATE.md | What info should I include when reporting/proposing? | Repo isn't accepting outside contributions yet |
| SECURITY.md | How do I report a vulnerability privately? | Nothing sensitive to disclose yet (no auth/user data in scope) |
| AGENTS.md | What does an AI coding agent need to use or contribute to this repo in one shot? | No evidence agents are a real audience yet — add once contributors are likely to point one at the repo |
| A short values/position file (e.g. a `MANIFESTO.md`) | What does this project refuse to do, and why does it exist? | The stance is adequately covered inline in the README/voice doc and isn't getting lost |
| docs/*.md reference pages | How is the code organized / how does subsystem X work? | Codebase small enough that README covers it |

**CONTRIBUTING.md is a router, not an encyclopedia** in every repo studied
except one whose contributor docs had nowhere else to live. Default to
linking out (to a fuller guide, a docs site, or this project's process doc)
rather than writing the whole process inline — see `repo-docs-research.md`.

## README Structure

In this order — each section earns the reader's next 10 seconds:

1. **Name + one-line pitch** — what it is, stated concretely (not "a
   powerful tool for..."), and containing the actual noun phrase a
   searcher would type (see README on-page SEO above) — not just the
   project name on its own line. If it's a web app, a live-demo link goes
   here, above the fold.
2. **Screenshot or GIF** — for anything visual (like a drawing tool), this
   does more work than any paragraph. Skip only for libraries/CLIs with
   nothing to show.
3. **Feature list** — short bullets, not prose. What can a user actually do.
4. **Quick start** — the fewest possible steps from clone to running. State
   the real constraint explicitly (e.g. "no build step — open index.html or
   serve the directory with any static server"). Don't make the reader infer
   this from a package.json.
5. **Tech stack** — one line per major choice, especially anything
   non-default (no framework, no bundler) so contributors don't propose
   adding one.
6. **Status / roadmap link** — for a phased project, point to the roadmap
   doc rather than listing what's done inline; it will go stale otherwise.
7. **Links out** — CONTRIBUTING, LICENSE, docs/.

## Badges

Use badges for information a reader would otherwise have to dig for
(license, build/deploy status, package version) — not as decoration.
Skip community-count badges (Discord members, star count) until there's
an actual community; a badge advertising a near-empty channel undercuts
trust more than having no badge at all. See `repo-docs-research.md` for
the full marketing-heavy-vs-utilitarian comparison this is drawn from.

## Common Mistakes

| Mistake | Fix |
|---|---|
| README explains internals in depth | Move to `docs/`, link from README |
| Quick start assumes a build step reader must guess doesn't exist | State "no build step" explicitly if true |
| No repo topics/About blurb set | These are what search/topic pages show — set them, not just files |
| CONTRIBUTING duplicates the project's process docs (e.g. OpenSpec) | Link to the canonical process doc instead of re-describing it |
| Feature list written as marketing prose | Use scannable bullets — readers skim, they don't read |
| Screenshot missing for a visual tool | Add one; it converts better than any description |
| Status claims baked into prose ("currently supports X") | Point to a roadmap/changelog that's actually kept current, so this doesn't rot |
| Badges chosen for how active they make the repo look | Choose badges for what's true and useful to know, not for vibes — see Badges above |
| Tone drifts into second-person benefit copy ("you'll love...") | Check against `repo-voice.md` — Pixi's docs stay factual/third-person |
| H1 is just the project name, search phrase buried paragraphs down | Put the actual noun phrase a searcher types on the H1 line or the one right under it |
| GitHub About blurb is a generic category ("pixel art web app") | Word it like the README's opening line — it becomes the page's meta description |

## Quick Reference: Minimum Viable Public Repo

For a repo about to go public with no outside contributors yet:
README.md + LICENSE + repo topics/About set. Add CONTRIBUTING,
CODE_OF_CONDUCT, and issue/PR templates when actually opening to outside
contributions — not before, since unused templates are just noise.

For Pixi specifically, [`docs/repo-docs-plan.md`](../../../docs/repo-docs-plan.md)
tracks this against the repo's actual current state (what exists, what's
missing, what's deliberately deferred and why) — check it before assuming
this generic list from scratch.
