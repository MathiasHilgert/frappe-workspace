# Frappé workspace commands: `just` lists them. The package.json scripts stay the source; these wrap them.
# The local stack's settings come from deploy/.env (optional; cp deploy/.env.example deploy/.env), shared with compose.
set dotenv-path := "deploy/.env"
set shell := ["bash", "-euo", "pipefail", "-c"]

# The local stack in containers, Valkey and the workspace image: just stack up | down | reset | ps | logs <service>
mod stack "eng/just/stack.just"
# Only the workspace's Valkey, to run `just dev` on this machine: just infra up | down
mod infra "eng/just/infra.just"
# Repository settings: just github protect | labels (need a remote, gh and admin)
mod github "eng/just/github.just"

# List the commands
default:
    @just --list --list-submodules

# Install dependencies exactly as locked in bun.lock (the same as CI), and the Chromium the browser tests run in
[group('setup')]
install:
    bun install --frozen-lockfile
    bunx --no-install playwright install --only-shell chromium

# Start the dev server
[group('run')]
dev:
    bun run dev

# Production build (adapter-bun)
[group('run')]
build:
    bun run build

# Serve the production build
[group('run')]
preview:
    bun run preview

# Every static check: types, code, Markdown, spelling and links
[group('quality')]
check: types lint arch deadcode lint-docker typos links

# Type-check Svelte and TypeScript; warnings fail
[group('quality')]
types:
    bun run check

# Prettier, ESLint (warnings fail, complexity budget) and markdownlint
[group('quality')]
lint:
    bun run lint

# Format every file with Prettier
[group('quality')]
format:
    bun run format

# Layer and feature boundaries (dependency-cruiser)
[group('quality')]
arch:
    bun run arch

# Unused files, exports and dependencies (knip)
[group('quality')]
deadcode:
    bun run deadcode

# Dockerfile lint (hadolint, pinned image; needs docker)
[group('quality')]
lint-docker:
    docker run --rm -i --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 65532:65532 -v "$PWD/eng/hadolint.yaml:/.config/hadolint.yaml:ro" hadolint/hadolint:v2.15.1@sha256:32dac94127fd60b7b7e3fbfc65e1383b9b5e25c9bfd7b8536de7a539fe68a12d hadolint --config /.config/hadolint.yaml - < deploy/Dockerfile

# Check spelling (needs typos: https://github.com/crate-ci/typos)
[group('quality')]
typos:
    typos --config eng/typos.toml

# Check links between documents (needs lychee: https://github.com/lycheeverse/lychee)
[group('quality')]
links:
    lychee --offline --no-progress --hidden --include-fragments --exclude-path node_modules --exclude-path .svelte-kit --exclude-path build "**/*.md"

# Unit and component tests (Vitest)
[group('test')]
test-unit:
    bun run test:unit --run

# End-to-end tests (Playwright)
[group('test')]
test-e2e:
    bun run test:e2e

# Every test suite
[group('test')]
test: test-unit test-e2e

# List dependencies with known vulnerabilities
[group('deps')]
audit:
    bun run audit
