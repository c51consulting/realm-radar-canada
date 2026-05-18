#!/usr/bin/env bash
# Paste real secrets in below, then run: bash scripts/set-vercel-secrets.sh
# Requires Vercel CLI logged in and project already linked (`vercel link`).
#
# Each block replaces the existing env var so re-running is safe.

set -euo pipefail

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Install with: npm i -g vercel"; exit 1
fi

# ---- PASTE YOUR SECRETS BELOW ----
SUPABASE_SERVICE_ROLE_KEY="paste_from_https_supabase_com_dashboard_project_raqzeslwlyccnirvxvmk_settings_api"
OPENAI_API_KEY="paste_your_openai_key"
RESEND_API_KEY="paste_your_resend_key"          # optional - leave blank if not using digest yet
NEXT_PUBLIC_POSTHOG_KEY="paste_posthog_project_api_key"  # optional - leave blank to disable analytics
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"      # or eu.i.posthog.com
DIGEST_FROM_EMAIL="radar@realmgroup.global"
DIGEST_TO_EMAIL="c51consulting.aus@gmail.com"
# ---- END SECRETS ----

set_env() {
  local key="$1"; local val="$2"
  if [ -z "$val" ] || [[ "$val" == paste_* ]]; then
    echo "[skip] $key — value not set yet"
    return
  fi
  vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  printf "%s" "$val" | vercel env add "$key" production
  echo "[ok]   $key"
}

set_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"
set_env OPENAI_API_KEY            "$OPENAI_API_KEY"
set_env RESEND_API_KEY            "$RESEND_API_KEY"
set_env NEXT_PUBLIC_POSTHOG_KEY   "$NEXT_PUBLIC_POSTHOG_KEY"
set_env NEXT_PUBLIC_POSTHOG_HOST  "$NEXT_PUBLIC_POSTHOG_HOST"
set_env DIGEST_FROM_EMAIL         "$DIGEST_FROM_EMAIL"
set_env DIGEST_TO_EMAIL           "$DIGEST_TO_EMAIL"

echo ""
echo "Done. Redeploy with:  vercel --prod"
