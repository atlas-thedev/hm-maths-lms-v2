#!/bin/bash
# Daily backup (cron): database dump + uploaded files, keeps 14 days.
set -euo pipefail
umask 077
D=/srv/hm-maths/backups; mkdir -p "$D"; T=$(date +%F)
sudo -u postgres pg_dump -Fc hm_maths > "$D/db-$T.dump"
tar -czf "$D/storage-$T.tar.gz" -C /srv/hm-maths storage
find "$D" -type f -mtime +14 -delete
