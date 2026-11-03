#!/bin/bash
# Pull the latest code, apply database migrations, rebuild and restart. Run: sudo bash /srv/hm-maths/app/deploy/update.sh
# The app runs as several instances (hm-maths@<port>, one per CPU core) behind nginx; they are restarted one at a
# time, so the site keeps answering during a deploy.
set -euo pipefail

main() {
  local BRANCH="${1:-$(sudo -u hm git -C /srv/hm-maths/app rev-parse --abbrev-ref HEAD)}"
  # Ports of the app instances. Keep in sync with the upstream block in deploy/nginx.conf. 3100 goes last: on the
  # first run after moving from the old single "hm-maths" service, that service still owns it until then.
  local INSTANCES=(${HM_INSTANCES:-3101 3102 3103 3100})
  cd /srv/hm-maths/app
  sudo -u hm git fetch -q origin "$BRANCH"
  sudo -u hm git reset -q --hard "origin/$BRANCH"
  # Migrations are idempotent — safe to re-apply on every deploy.
  for f in deploy/00_bootstrap.sql db/migrations/*.sql deploy/99_grants.sql; do
    sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d hm_maths < "$f" > /dev/null
  done
  sudo -u hm bash -c 'set -a; source /srv/hm-maths/.env; set +a; npm ci --no-audit --no-fund --loglevel=error && npx next build'

  # systemd template for the instances (installed / refreshed when it changed).
  if ! cmp -s deploy/hm-maths@.service /etc/systemd/system/hm-maths@.service; then
    cp deploy/hm-maths@.service /etc/systemd/system/hm-maths@.service
    systemctl daemon-reload
  fi
  systemctl restart hm-postgrest

  wait_up() {  # wait until the instance on port $1 answers
    for _ in $(seq 1 40); do
      curl -fsS -o /dev/null -m 5 "http://127.0.0.1:$1/login" && return 0
      sleep 1
    done
    echo "Instance on port $1 did not come up — check: journalctl -u hm-maths@$1 -n 50" >&2
    return 1
  }
  local p
  for p in "${INSTANCES[@]}"; do
    if [ "$p" = 3100 ] && [ -f /etc/systemd/system/hm-maths.service ]; then
      # Old single-process service: the other instances are already serving, so it can go.
      systemctl disable --now hm-maths.service
      rm -f /etc/systemd/system/hm-maths.service
      systemctl daemon-reload
    fi
    systemctl enable --quiet "hm-maths@$p"
    systemctl restart "hm-maths@$p"
    wait_up "$p"
  done
  echo "Deployed $(sudo -u hm git log --oneline -1) on ${#INSTANCES[@]} instances"
}

# Everything is read before it runs: the script replaces itself on disk (git reset), which must not confuse bash.
main "$@"
exit $?
