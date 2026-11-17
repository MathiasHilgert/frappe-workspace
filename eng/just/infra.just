set working-directory := "../.."
set shell := ["bash", "-euo", "pipefail", "-c"]

# Start only the workspace's Valkey, to run `just dev` on this machine
up:
    docker compose -f deploy/compose.yaml up -d valkey
    @echo "Valkey: redis://localhost:${WORKSPACE_VALKEY_PORT:-6380}/0"

# Stop it; its data is kept
down:
    docker compose -f deploy/compose.yaml stop valkey
