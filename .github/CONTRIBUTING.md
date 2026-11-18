# Contributing to Frappé Workspace

This repository is proprietary (see [LICENSE](../LICENSE)): contributions are made by people the owner has authorized
in writing. This guide covers how work gets into `main`: the commands, the tests, the conventions and the checks
every pull request must pass.

## Quick path

1. Install the tools: [Bun](https://bun.com/docs/installation) (the version in `package.json`), [just](https://github.com/casey/just#installation)
   and Docker. Run `just install` and `bunx lefthook install` once.
2. Branch from `main` as `<type>/<kebab-topic>`, for example `feat/sign-in`.
3. Make the change with its tests; run `just check` and `just test`.
4. Open a pull request titled `<type>(<scope>): <summary>` and fill in the
   [template](pull_request_template.md).
5. Wait for every required check to pass; `main` is squash-merged.

## Repository layout

The root keeps only what an editor or a framework looks for there; every other file lives where its tool is pointed
at it (`--config`, a `just` module, the Compose file).

```text
.config/       lefthook.yml (Git hooks)
.github/       workflows, their actions, Renovate, labels, rulesets, release-please files, this guide, the PR template
deploy/        Dockerfile (+ Dockerfile.dockerignore), compose.yaml, .env.example for the local stack
eng/           tool configuration: commitlint, dependency-cruiser, hadolint, knip, markdownlint, typos, and the just modules
i18n/          messages/ (en.json, es.json) and the Paraglide project
src/           the app: routes/, lib/features, lib/server, lib/shared, env.ts and the hooks
static/        files served as they are
tests/         e2e/ (Playwright), setup/ (Vitest setups), msw/ (the frappe-api stand-in), support/ (helpers), playwright.config.ts
.justfile      the `just <command>` entry point
package.json   scripts and dependencies (bun.lock is the lock file)
```

The formatter, linter, TypeScript, SvelteKit, Vite and shadcn configuration stay at the root because editors find
them there.

## Commands

`just` lists every command; the `package.json` scripts are the source and the recipes wrap them.

| Group     | Commands                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `setup`   | `install`: dependencies exactly as locked in `bun.lock`                                                                                 |
| `run`     | `dev` (the dev server), `build` (production build), `preview` (serve the build)                                                         |
| `quality` | `check` runs all of: `types`, `lint`, `arch`, `deadcode`, `lint-docker`, `typos`, `links`; `format` rewrites every file with Prettier   |
| `test`    | `test` runs `test-unit` (Vitest) and `test-e2e` (Playwright)                                                                            |
| `deps`    | `audit`: dependencies with known vulnerabilities                                                                                        |
| `stack`   | `up`, `down`, `reset` (deletes the volumes), `ps`, `logs <service>`: Valkey and the production image of the workspace                   |
| `infra`   | `up`, `down`: only the workspace's Valkey, to run `just dev` on this machine                                                            |
| `github`  | `protect`: apply the repository settings and the rulesets (`main` and `v*` tags); `labels`: make the labels match `.github/labels.json` |

`lint-docker` runs hadolint in Docker, `typos` and `links` need [typos](https://github.com/crate-ci/typos) and
[lychee](https://github.com/lycheeverse/lychee) installed, and `github` needs a remote named `origin`, `gh` and
admin rights. `bun run gate` runs the checks that need no extra tool: types, lint, architecture, dead code and the unit tests.

### Run it locally

```bash
just install           # dependencies, exactly as locked, and Chromium
cp .env.example .env   # every variable is explained there
just infra up          # the workspace's own Valkey, on localhost:6380
just dev               # http://localhost:5173
```

`just stack up` runs the production image and Valkey in containers instead (<http://localhost:4000>); it needs no
frappe-api of its own, but the workspace calls the one running on your machine. See the [README](../README.md).

## Testing

| Suite       | Where it runs                          | Files                          | Command          |
| ----------- | -------------------------------------- | ------------------------------ | ---------------- |
| Unit        | Vitest on the server, no browser       | `src/**/*.test.ts`             | `just test-unit` |
| Component   | a real browser (Chromium)              | `src/**/*.svelte.test.ts`      | `just test-unit` |
| Integration | a Valkey container, frappe-api via MSW | `src/**/*.integration.test.ts` | `just test-unit` |
| End to end  | Playwright against the built app       | `tests/e2e/`                   | `just test-e2e`  |

`just test-unit` runs the three Vitest projects (`server`, `client`, `integration`); the integration project starts one
Valkey container per run, so Docker must be running. Unit and integration tests answer
for frappe-api through MSW (`tests/msw/`); end-to-end tests run the critical flows. Coverage is measured and reported on
the pull request, but nothing fails on a percentage (TEST-09 in `workspace-conventions`).

## Conventions

- **Titles and commits.** `main` is squash-merged, so the pull request title becomes the commit:
  `<type>(<scope>): <summary>`, `!` before the colon for a breaking change. Types: `feat`, `fix`, `refactor`, `perf`,
  `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`. The scope is a feature folder under `src/lib/features/`
  or one of `shared`, `ui`, `kernel`, `server`, `routes`, `i18n`, `config`, `contracts`, `observability`, `tests`,
  `tooling`, `deps`, `ci`, `docs`, `conventions` (the list lives in `eng/commitlint.config.js`). Commits follow the same
  rule, checked locally by commitlint on `commit-msg`.
- **Branches.** `<type>/<kebab-topic>` with the title's type, for example `fix/session-expiry`. Branches that Renovate
  and release-please open are exempt.
- **No AI attribution.** No co-author trailer, "generated with" footer or session link in a title, description or
  commit.
- **Pull requests.** Follow the [template](pull_request_template.md): a TL;DR told as a story, then the sections that
  describe the change.
- **Code rules.** Every rule is enforced by the linters, the type check and the architecture check. User-visible text
  always goes through Paraglide, in both locales.
- **Git hooks** (`.config/lefthook.yml`, installed with `bunx lefthook install`): commit-msg runs commitlint;
  pre-commit checks the staged files with Prettier, ESLint, typos and (when the Dockerfile is staged) hadolint;
  pre-push runs the type check, ESLint and knip.

## Continuous integration

Every check is named after what it guarantees, and every one of them but the informational one is required by the
ruleset of `main` (`.github/rulesets/main.json`, applied with `just github protect`).

| Group        | Check                               | What it guarantees                                                                                 |
| ------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Tests        | Unit tests pass                     | the Vitest `server` project passes                                                                 |
|              | Component tests pass                | the Vitest `client` project passes in Chromium                                                     |
|              | Integration tests pass              | the Vitest `integration` project passes                                                            |
|              | Architecture rules hold             | dependency-cruiser finds no layer, feature or circular-import violation                            |
|              | End-to-end tests pass               | the Playwright suite passes                                                                        |
|              | Image builds and starts             | `deploy/Dockerfile` builds and the container answers                                               |
|              | Coverage is reported                | informational: the report is in the job summary and the coverage artifact, nothing fails (TEST-09) |
| Code quality | Code is formatted                   | Prettier finds nothing to rewrite                                                                  |
|              | Code passes the linters             | ESLint (warnings fail) and markdownlint pass                                                       |
|              | Types check without warnings        | svelte-check passes with warnings as failures                                                      |
|              | No dead code                        | knip finds no unused file, export or dependency                                                    |
|              | Spelling is correct                 | typos finds no misspelling                                                                         |
|              | Links are valid                     | lychee finds no broken link between documents                                                      |
|              | App builds                          | `bun run build` succeeds                                                                           |
| Security     | No vulnerable dependencies          | `bun audit` and osv-scanner on `bun.lock` find no unaccepted high advisory                         |
|              | No leaked secrets                   | gitleaks finds no secret in the change                                                             |
|              | Code has no known vulnerabilities   | CodeQL (`javascript-typescript` and `actions`, `security-extended`) finds none                     |
|              | Workflows are secure                | actionlint and zizmor accept every workflow                                                        |
|              | Dockerfile follows best practices   | hadolint accepts `deploy/Dockerfile`                                                               |
|              | Container image is clean            | Trivy finds no fixable HIGH or CRITICAL vulnerability in the image                                 |
| Pull request | Title follows Conventional Commits  | the title is `<type>(<scope>): <summary>` and it and the description carry no AI attribution       |
|              | Commits follow Conventional Commits | every commit header follows the same rule and no commit message carries AI attribution             |
|              | Branch name is valid                | the branch is `<type>/<kebab-topic>` with the title's type                                         |
|              | Assignee and labels set             | the author is assigned and the `type:`, `size:` and `area:` labels are set                         |

- **Nightly** rebuilds everything from scratch, without caches.
- **Image retention** (weekly) prunes old images of the workspace in GHCR; release tags are never deleted.
- **Release** keeps a release pull request (release-please, `.github/release-please-config.json`) from the Conventional
  Commits. Merging it tags `v<version>`, updates `CHANGELOG.md` and the `package.json` version, and publishes the image
  to GHCR with SBOM, provenance and build attestation. Versions stay 0.x until a deliberate 1.0.0.
- **Tags.** The ruleset `.github/rulesets/tags.json` restricts creating, moving and deleting `v*` tags; its only bypass
  actor is the release GitHub App, which is mandatory. Create it once (Settings > Developer settings > GitHub Apps),
  owned by the account or organization, with the repository permissions Contents, Pull requests and Issues set to
  read and write, no webhook, installed on this repository only. Then store its client id as the repository variable
  `RELEASE_APP_CLIENT_ID`, a generated private key as the secret `RELEASE_APP_PRIVATE_KEY`, and pass its numeric App ID
  to the rulesets: `just github protect <app-id>` (or set `RELEASE_APP_ID`). The recipe injects the id into the
  ruleset and fails without it; the release workflow fails without the variable and the secret.
- **Dependencies** are updated by Renovate (`.github/renovate.json5`), lock file included, once the Renovate app is
  installed: Monday mornings, a package must be three days old, and ESLint plugins, Bun and GitHub Actions move in
  groups. Base images in `deploy/` and the hadolint image stay pinned by digest.
- **Labels** (`.github/labels.json`, `just github labels`): `type:` follows the title, `size:` counts authored lines,
  `area:` comes from the changed paths (`.github/labeler.yml`).
