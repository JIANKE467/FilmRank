#!/usr/bin/env sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Initializing database from schema.sql..."
docker exec -i filmrank-db mysql -uroot -pfilmrank_root filmrank < "$ROOT_DIR/server/src/db/schema.sql"
echo "Done."
