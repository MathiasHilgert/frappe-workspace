# Frappé workspace commands: `just` lists them. The package.json scripts stay the source; these wrap them.
set shell := ["bash", "-euo", "pipefail", "-c"]

# List the commands
default:
    @just --list --list-submodules

# Install dependencies exactly as locked in bun.lock (the same as CI)
[group('setup')]
install:
    bun install --frozen-lockfile

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
check: types lint arch deadcode typos links

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
