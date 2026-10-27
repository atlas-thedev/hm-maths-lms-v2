# Server deployment (single Ubuntu VPS)

Stack on one Ubuntu server:

| Piece | What it does |
|---|---|
| **PostgreSQL** (`hm_maths` db) | All data. Same schema as `db/migrations/*` + `deploy/00_bootstrap.sql` (auth + storage schemas, roles). |
| **PostgREST** (`hm-postgrest`, 127.0.0.1:3001) | Local query API used by the app. Not exposed to the internet. Row-level security applies per user via the session token. |
| **Next.js** (`hm-maths`, 127.0.0.1:3000) | The website. Own login (bcrypt passwords in `auth.users`, 30-day signed session cookie). |
| **Files** | `/srv/hm-maths/storage/<bucket>/…`, access checked against the `storage.objects` policies. |
| **Nginx** | Public reverse proxy, HTTPS (Let's Encrypt, auto-renew). |

Paths: app `/srv/hm-maths/app`, env `/srv/hm-maths/.env`, uploads `/srv/hm-maths/storage`, backups `/srv/hm-maths/backups` (daily 02:30, 14 days).

## Update to the latest code
```bash
sudo bash /srv/hm-maths/app/deploy/update.sh
```

Each deploy re-applies `deploy/00_bootstrap.sql`, every file in `db/migrations/` (in order) and
`deploy/99_grants.sql`, so every SQL file must stay safe to re-run.

## Nginx behind Cloudflare (one-time)
The site must take the visitor's IP from Cloudflare, or every student shares a few Cloudflare IPs and
the login / sign-up rate limits lock people out:
```bash
sudo cp /srv/hm-maths/app/deploy/cloudflare-realip.conf /etc/nginx/snippets/cloudflare-realip.conf
# add inside the `server { … }` block of /etc/nginx/sites-available/hm-maths (see deploy/nginx.conf):
#   include /etc/nginx/snippets/cloudflare-realip.conf;
sudo nginx -t && sudo systemctl reload nginx
```

## Admin account (create / reset password)
```bash
sudo -u postgres psql -d hm_maths -v admin_email=admin@nativelaunch.xyz -v admin_pw='NEW-PASSWORD' < /srv/hm-maths/app/deploy/seed-admin.sql
```

## Logs / restart
```bash
journalctl -u hm-maths -f        # app
journalctl -u hm-postgrest -f    # db api
sudo systemctl restart hm-maths hm-postgrest
```

## Restore a backup
```bash
sudo -u postgres pg_restore --clean --if-exists -d hm_maths /srv/hm-maths/backups/db-YYYY-MM-DD.dump
sudo tar -xzf /srv/hm-maths/backups/storage-YYYY-MM-DD.tar.gz -C /srv/hm-maths
```
