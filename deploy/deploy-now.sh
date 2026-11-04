#!/bin/bash
# Deploy this branch to the live server and reload every app instance.
#
#   bash deploy/deploy-now.sh [branch]        (default: the branch this file was committed on)
#
# Credentials, never committed:
#   HOST=root@1.2.3.4  SSH_PASS=…            run it directly, e.g.
#   HOST=… SSH_PASS=… bash deploy/deploy-now.sh
#   …or put those two lines in .env.deploy (git-ignored) and just run the script.
#
# Requires `sshpass` for password logins (apt install sshpass); SSH keys work without it.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.deploy ] && { set -a; . ./.env.deploy; set +a; }
: "${HOST:?set HOST (e.g. root@169.58.36.154) in the environment or .env.deploy}"
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
APP="${APP_DIR:-/srv/hm-maths/app}"

echo "→ pushing $BRANCH to origin"
git push origin "$BRANCH"

SSH=(ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
if [ -n "${SSH_PASS:-}" ]; then
  command -v sshpass >/dev/null || { echo "sshpass is missing: apt install sshpass (or use an SSH key)" >&2; exit 1; }
  SSH=(sshpass -p "$SSH_PASS" "${SSH[@]}")
fi

echo "→ $HOST: fetch $BRANCH, apply migrations, build, restart instances"
# The remote command is passed as plain words (ssh concatenates them into one shell command line), so the
# branch/APP values are interpolated here and the remote shell sees no stray quotes.
"${SSH[@]}" "$HOST" "set -e; cd $APP; git fetch -q origin $BRANCH; git reset -q --hard origin/$BRANCH; bash deploy/update.sh $BRANCH"
echo "✓ deployed $BRANCH"
