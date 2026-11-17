# syntax=docker/dockerfile:1
# The workspace as one image: SvelteKit built with adapter-bun, served by Bun on a distroless base.
# Build from the repository root: docker build -f deploy/Dockerfile . (compose does it for `just stack up`).
ARG BUN_IMAGE=oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a
ARG RUNTIME_IMAGE=oven/bun:1.4.4-distroless@sha256:153a951ae40106e125898103e6e990ee0f38e6aee7f561029e26cf9fbed23470

# Dependencies only: this layer changes only when package.json or bun.lock change.
# The output is plain JavaScript, so it is built once on the build machine's platform, whatever the target.
FROM --platform=$BUILDPLATFORM ${BUN_IMAGE} AS deps
WORKDIR /source
COPY package.json bun.lock ./
# No scripts: `prepare` (svelte-kit sync) needs the sources, and the build below syncs anyway. The packages stay in this
# layer; the cache mount only keeps Bun's download cache between builds.
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

FROM --platform=$BUILDPLATFORM ${BUN_IMAGE} AS build
WORKDIR /source
COPY --from=deps /source/node_modules/ node_modules/
COPY . .
# Kit's post-build analysis runs the server once and validates every required variable of src/env.ts. These values only
# satisfy that check: they live in this stage, never reach the runtime image, and the real ones are validated again when
# the container starts (OPS-01).
RUN FRAPPE_API_BASE_URL=http://frappe-api.invalid \
    VALKEY_URL=redis://valkey.invalid:6379/0 \
    bun run build

# Distroless: no shell, no package manager, only Bun. adapter-bun bundles every dependency into build/ (the package has
# only devDependencies), so build/ is the whole application: no node_modules, no sources.
FROM ${RUNTIME_IMAGE} AS runtime
WORKDIR /app
# Owned by root and only readable by the app user: the process cannot rewrite its own code.
COPY --from=build /source/build/ ./build/
# The base image runs as root; 65532 is distroless's nonroot user.
USER 65532:65532
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
EXPOSE 3000
# The base image's entrypoint is bun.
CMD ["./build"]
