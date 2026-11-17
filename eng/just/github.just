set working-directory := "../.."
set shell := ["bash", "-euo", "pipefail", "-c"]

# Settings (squash = PR title + description; Actions may open the release PR; dependency graph and alerts) and the rulesets of main and v* tags; needs a remote, gh as admin and the id of the release GitHub App (argument or RELEASE_APP_ID), the only actor that may tag
protect app_id=env("RELEASE_APP_ID", ""): _remote
    #!/usr/bin/env bash
    set -euo pipefail
    if ! [[ "{{ app_id }}" =~ ^[0-9]+$ ]]; then
      echo "The release GitHub App id is required (a number): just github protect <app-id>, or set RELEASE_APP_ID. It is on the app's settings page (App ID); see .github/CONTRIBUTING.md." >&2
      exit 1
    fi
    gh api --method PATCH "repos/{owner}/{repo}" -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false -F delete_branch_on_merge=true --silent
    gh api --method PUT "repos/{owner}/{repo}/actions/permissions/workflow" -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true --silent
    gh api --method PUT "repos/{owner}/{repo}/vulnerability-alerts" --silent
    for name in main tags; do
      # The tags ruleset names the release app as its only bypass actor; the file carries a placeholder id.
      body=$(jq --argjson app "{{ app_id }}" '(.bypass_actors[]? | select(.actor_type == "Integration") | .actor_id) = $app' ".github/rulesets/$name.json")
      id=$(gh api "repos/{owner}/{repo}/rulesets" --jq ".[] | select(.name == \"$name\") | .id")
      if [ -n "$id" ]; then gh api --method PUT "repos/{owner}/{repo}/rulesets/$id" --input - <<< "$body" --silent
      else gh api --method POST "repos/{owner}/{repo}/rulesets" --input - <<< "$body" --silent; fi
    done
    echo "Settings and the rulesets of main and v* tags are applied."

# Make the repository's labels exactly .github/labels.json: create or update each one, delete any other; needs a remote and gh
labels: _remote
    #!/usr/bin/env bash
    set -euo pipefail
    jq -c '.[]' .github/labels.json | while read -r label; do
      gh label create "$(jq -r .name <<< "$label")" --color "$(jq -r .color <<< "$label")" --description "$(jq -r .description <<< "$label")" --force
    done
    gh label list --limit 200 --json name --jq '.[].name' | while read -r name; do
      jq -e --arg name "$name" 'any(.[]; .name == $name)' .github/labels.json > /dev/null || gh label delete "$name" --yes
    done
    echo "Labels match .github/labels.json."

# Fail with a clear message when the repository has no origin remote yet (these recipes talk to GitHub)
[private]
_remote:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! git remote get-url origin > /dev/null 2>&1; then
      echo "No 'origin' remote: this repository is not on GitHub yet. Add one (git remote add origin <url>) and push, then run this again." >&2
      exit 1
    fi
