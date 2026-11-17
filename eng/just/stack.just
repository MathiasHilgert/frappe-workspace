set working-directory := "../.."
set shell := ["bash", "-euo", "pipefail", "-c"]

# Build the image and start Valkey and the workspace (frappe-api runs from its own checkout)
up:
    docker compose -f deploy/compose.yaml up -d --build
    @echo "Workspace: http://localhost:${WORKSPACE_PORT:-4000} · frappe-api expected on ${WORKSPACE_FRAPPE_API_URL:-http://host.docker.internal:8080} (from the container)"

# Stop the stack; volumes (sessions) are kept
down:
    docker compose -f deploy/compose.yaml down

# Stop the stack and delete every volume: every session is lost
reset:
    docker compose -f deploy/compose.yaml down -v

# Show the state of every service
ps:
    docker compose -f deploy/compose.yaml ps

# Follow the logs of one service (workspace, valkey)
logs service:
    docker compose -f deploy/compose.yaml logs -f {{ service }}
