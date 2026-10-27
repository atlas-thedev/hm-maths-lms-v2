#!/bin/bash
# Throwaway local database stack for development and tests — never touches the production database.
#   bash scripts/dev-stack.sh up      create + start PostgreSQL (:55432) and PostgREST (:55433), apply db/*
#   bash scripts/dev-stack.sh env     print the env vars the app and tests need
#   bash scripts/dev-stack.sh reset   drop everything and start fresh
#   bash scripts/dev-stack.sh down    stop it (data kept in .dev-stack/)
# Needs the postgresql server package and the `postgrest` binary (the same ones the VPS uses).
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
cd "$(dirname "$0")/.."
D="$PWD/.dev-stack"; PGPORT_=${DEV_PG_PORT:-55432}; RESTPORT=${DEV_REST_PORT:-55433}
SECRET="dev-only-secret-change-me-0123456789abcdef"
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
[ -x "$BIN/initdb" ] || { echo "PostgreSQL server binaries not found (apt install postgresql)"; exit 1; }
command -v postgrest >/dev/null || { echo "postgrest binary not found (https://postgrest.org)"; exit 1; }
PSQL=(psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PGPORT_" -U postgres)

env_vars() {
  cat <<ENV
export DATABASE_URL=postgres://authenticator@127.0.0.1:$PGPORT_/hm_dev
export ADMIN_DATABASE_URL=postgres://postgres@127.0.0.1:$PGPORT_/hm_dev
export POSTGREST_URL=http://127.0.0.1:$RESTPORT
export JWT_SECRET=$SECRET
export STORAGE_DIR=$D/storage
export COOKIE_INSECURE=1
ENV
}

up() {
  mkdir -p "$D/storage"
  if [ ! -d "$D/data" ]; then "$BIN/initdb" -D "$D/data" -U postgres --auth=trust -E UTF8 >/dev/null; fi
  "$BIN/pg_ctl" -D "$D/data" status >/dev/null 2>&1 || \
    "$BIN/pg_ctl" -D "$D/data" -o "-p $PGPORT_ -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$D/postgres.log" -w start >/dev/null
  "${PSQL[@]}" -d postgres -tAc "select 1 from pg_database where datname='hm_dev'" | grep -q 1 || "${PSQL[@]}" -d postgres -c "create database hm_dev"
  for f in deploy/00_bootstrap.sql db/migrations/*.sql deploy/99_grants.sql; do "${PSQL[@]}" -d hm_dev < "$f" >/dev/null; done
  cat > "$D/postgrest.conf" <<CONF
db-uri = "postgres://authenticator@127.0.0.1:$PGPORT_/hm_dev"
db-schemas = "public"
db-anon-role = "anon"
db-pool = 5
jwt-secret = "$SECRET"
server-host = "127.0.0.1"
server-port = $RESTPORT
db-max-rows = 5000
CONF
  if [ -f "$D/postgrest.pid" ] && kill -0 "$(cat "$D/postgrest.pid")" 2>/dev/null; then kill -SIGUSR1 "$(cat "$D/postgrest.pid")" 2>/dev/null || true
  else nohup postgrest "$D/postgrest.conf" > "$D/postgrest.log" 2>&1 & echo $! > "$D/postgrest.pid"; sleep 2; fi
  echo "Dev stack is up. Export the variables with:  eval \"\$(bash scripts/dev-stack.sh env)\""
}

down() {
  [ -f "$D/postgrest.pid" ] && kill "$(cat "$D/postgrest.pid")" 2>/dev/null || true
  rm -f "$D/postgrest.pid"
  [ -d "$D/data" ] && "$BIN/pg_ctl" -D "$D/data" -m fast stop >/dev/null 2>&1 || true
}

case "${1:-}" in
  up) up ;;
  env) env_vars ;;
  down) down ;;
  reset) down; rm -rf "$D"; up ;;
  *) sed -n 2,8p "$0"; exit 1 ;;
esac
