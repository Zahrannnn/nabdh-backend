param(
  [ValidateSet('up','down','build','restart','rebuild','logs','ps','clean','start','lint','test','test:e2e')]
  [string]$Command
)

$compose = "docker compose -f infra/docker/docker-compose.yml"

switch ($Command) {
  'up'       { Invoke-Expression "$compose up -d" }
  'down'     { Invoke-Expression "$compose down" }
  'build'    { Invoke-Expression "$compose build" }
  'restart'  { Invoke-Expression "$compose down && $compose up -d" }
  'rebuild'  { Invoke-Expression "$compose build && $compose up -d" }
  'logs'     { Invoke-Expression "$compose logs -f" }
  'ps'       { Invoke-Expression "$compose ps" }
  'clean'    { Invoke-Expression "$compose down -v --rmi local" }
  'start'    { pnpm start:dev }
  'lint'     { pnpm lint }
  'test'     { pnpm test }
  'test:e2e' { pnpm test:e2e }
  default    { Write-Host "Usage: .\run.ps1 <command>`nCommands: up, down, build, restart, rebuild, logs, ps, clean, start, lint, test, test:e2e" }
}
