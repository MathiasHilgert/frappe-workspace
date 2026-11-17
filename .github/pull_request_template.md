<!-- markdownlint-disable MD041 -->

<!--
Title format (Conventional Commits):
  <type>(<scope>): <imperative summary, lower case, no trailing period>
  types: feat | fix | refactor | perf | test | docs | style | build | ci | chore | revert
  scope: a feature folder (src/lib/features/<name>) or one of: shared, ui, kernel, server, routes, i18n, config,
         contracts, observability, tests, tooling, deps, ci, docs, conventions (eng/commitlint.config.js)
  breaking changes: add "!" before ":" and a BREAKING CHANGE note in Technical decisions
  branch: <type>/<kebab-topic> with the title's type, e.g. feat/sign-in
  no AI attribution in the title, the description or any commit
Examples:
  feat(sign-in): let an owner sign in with email and password
  build(tooling): add hadolint to the Dockerfile checks
Sections that do not apply stay, with "None in this PR" and the reason.
-->

## TL;DR

<!--
Tell it as a story, for a senior engineer who reads only this block.
Plain paragraphs only: no ### headings and no &nbsp; spacers inside the TL;DR. GitHub already spaces paragraphs.
Open with the real-world situation, then one bold sentence with what this PR changes about it.
Then short paragraphs, each starting with a bold label.
-->

_Real-world situation that makes this change necessary._

**_One sentence: what this PR changes about that._**

**The problem.** _What hurt, or what would hurt without this._

**What we built.** _One line, then at most three bullets, each starting with a bold phrase._

**How.** _The key mechanism._

**Why this way.** _The tradeoff that justifies the approach, and the alternative it beats._

---

## Summary

<!-- One paragraph: where this change sits in the system and what it unlocks next. -->

## Architecture

<!--
Mermaid diagrams for whatever this change touches: layers and feature boundaries (flowchart), the browser, server and
frappe-api flow (sequenceDiagram), session or form states (stateDiagram-v2).
Diagram what exists after merge; mark anything planned explicitly as planned.
-->

## Screens and texts

<!-- Screenshots or a recording in light and dark, at mobile and desktop widths. New messages in both locales (i18n/messages/en.json and es.json). -->

## Infrastructure and configuration

<!-- Image, compose, environment variables (src/env.ts and .env.example), dependencies, workflows. What changed and how it runs locally. -->

## frappe-api calls

| Operation | Endpoint | Gateway | Errors mapped |
| --------- | -------- | ------- | ------------- |

## Technical decisions

| Decision | Alternatives considered | Why |
| -------- | ----------------------- | --- |

## Pending decisions

| Topic | Options | Blocking? |
| ----- | ------- | --------- |

## How to verify

<!-- Exact commands a reviewer runs (for example `just check`, `just test`), and what they should observe. -->

## Risk

<!-- What could break, blast radius, rollback. -->
