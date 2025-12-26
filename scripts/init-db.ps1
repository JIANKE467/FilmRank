$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$schemaPath = Join-Path $root "server/src/db/schema.sql"

Write-Host "Initializing database from schema.sql..."
Get-Content -Path $schemaPath | docker exec -i filmrank-db mysql -uroot -pfilmrank_root filmrank
Write-Host "Done."
