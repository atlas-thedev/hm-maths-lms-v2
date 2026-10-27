#!/bin/bash
# Pull the latest code, apply database migrations, rebuild and restart. Run: sudo bash /srv/hm-maths/app/deploy/update.sh
set -euo pipefail
BRANCH="${1:-$(sudo -u hm git -C /srv/hm-maths/app rev-parse --abbrev-ref HEAD)}"
cd /srv/hm-maths/app
sudo -u hm git fetch -q origin "$BRANCH"
sudo -u hm git reset -q --hard "origin/$BRANCH"
# Migrations are idempotent — safe to re-apply on every deploy.
for f in deploy/00_bootstrap.sql db/migrations/*.sql deploy/99_grants.sql; do
  sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d hm_maths < "$f" > /dev/null
done
sudo -u hm bash -c 'set -a; source /srv/hm-maths/.env; set +a; npm ci --no-audit --no-fund --loglevel=error && npx next build' 
systemctl restart hm-postgrest hm-maths
echo "Deployed $(sudo -u hm git log --oneline -1)"
