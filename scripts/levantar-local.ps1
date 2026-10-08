# Levanta Pedidos360 completo en local: 5 Postgres + cluster RabbitMQ (2 nodos)
# + 8 microservicios Spring Boot + frontend Angular.
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\levantar-local.ps1
# Parar: ver scripts\detener-local.ps1
#
# Es idempotente: lo que ya está arriba lo detecta y no lo toca.

$ErrorActionPreference = 'Continue'

# --- Ubicar la raíz del workspace (carpeta que contiene "pedidos360") ----------
# Buscando hacia arriba, el script funciona desde cualquier carpeta del repo.
$root = $PSScriptRoot
while ($root -and -not (Test-Path (Join-Path $root 'pedidos360'))) {
  $root = Split-Path $root -Parent
}
if (-not $root) { throw "No encontré la carpeta 'pedidos360' subiendo desde $PSScriptRoot" }
$pedidos = Join-Path $root 'pedidos360'
$logdir = Join-Path $env:TEMP 'opencode\p360-local'
New-Item -ItemType Directory -Force -Path $logdir | Out-Null

function Test-Puerto([int]$puerto) {
  (Test-NetConnection -ComputerName localhost -Port $puerto -InformationLevel Quiet -WarningAction SilentlyContinue)
}

function Test-Contenedor([string]$nombre) {
  $null -ne (docker ps --filter "name=^/$nombre$" --format '{{.Names}}')
}

# --- 1. Docker: Postgres de cada servicio + cluster RabbitMQ -------------------
Write-Host "`n[1/4] Docker..." -ForegroundColor Cyan
$grupos = @(
  @{ contenedores = @('p360-rabbit-1', 'p360-rabbit-2'); ruta = "$pedidos\pedidos360-ms-admin\docker\rabbitmq-cluster" }
  @{ contenedores = @('pedidos360-productos-db'); ruta = "$pedidos\pedidos360-ms-productos" }
  @{ contenedores = @('pedidos360-carrito-db'); ruta = "$pedidos\pedidos360-ms-carrito" }
  @{ contenedores = @('p360-orders-db'); ruta = "$pedidos\pedidos360-ms-orders" }
  @{ contenedores = @('p360-auditoria-db'); ruta = "$pedidos\pedidos360-ms-auditoria" }
  @{ contenedores = @('p360-cupones-db'); ruta = "$pedidos\pedidos360-ms-cupones" }
)
foreach ($g in $grupos) {
  $faltan = @($g.contenedores | Where-Object { -not (Test-Contenedor $_) })
  if (-not $faltan) { Write-Host "  ya arriba: $($g.contenedores -join ', ')"; continue }
  Push-Location $g.ruta
  docker compose up -d 2>&1 | Out-Null
  Pop-Location
  Write-Host "  levantado: $($faltan -join ', ')"
}

# --- 2. Microservicios ---------------------------------------------------------
Write-Host "`n[2/4] Microservicios..." -ForegroundColor Cyan
$servicios = [ordered]@{
  'productos'      = 8081
  'carrito'        = 8082
  'login'          = 8083
  'orders'         = 8084
  'notificaciones' = 8085
  'auditoria'      = 8086
  'admin'          = 8087
  'cupones'        = 8088
}
foreach ($svc in $servicios.Keys) {
  $repo = "pedidos360-ms-$svc"
  $jar = Join-Path $pedidos "$repo\target\ms-$svc-0.0.1-SNAPSHOT.jar"
  if (-not (Test-Path $jar)) {
    Write-Host "  FALTA JAR: $repo (compilar con: mvn -o package -DskipTests)" -ForegroundColor Red
    continue
  }
  if (Test-Puerto $servicios[$svc]) { Write-Host "  ya arriba: $svc (:$($servicios[$svc]))"; continue }
  $log = Join-Path $logdir "$svc.log"
  Start-Process -FilePath 'java' -ArgumentList "-jar `"$jar`"" `
    -WorkingDirectory (Split-Path $jar) `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err" -WindowStyle Hidden
  Write-Host "  lanzado: $svc (:$($servicios[$svc]))"
}

# --- 3. Esperar a que respondan -------------------------------------------------
Write-Host "`n[3/4] Esperando servicios..." -ForegroundColor Cyan
foreach ($svc in $servicios.Keys) {
  $jar = Join-Path $pedidos "pedidos360-ms-$svc\target\ms-$svc-0.0.1-SNAPSHOT.jar"
  if (-not (Test-Path $jar)) { continue }
  $ok = $false
  foreach ($i in 1..24) {
    if (Test-Puerto $servicios[$svc]) { $ok = $true; break }
    Start-Sleep -Seconds 5
  }
  if ($ok) { Write-Host "  OK  $svc :$($servicios[$svc])" }
  else { Write-Host "  !!! $svc no responde (ver $logdir\$svc.log)" -ForegroundColor Yellow }
}

# --- 4. Frontend ---------------------------------------------------------------
Write-Host "`n[4/4] Frontend Angular..." -ForegroundColor Cyan
if (Test-Puerto 4200) {
  Write-Host "  ya arriba: http://localhost:4200"
} else {
  $log = Join-Path $logdir 'ng-serve.log'
  Start-Process -FilePath 'cmd.exe' `
    -ArgumentList ('/c npm start > "' + $log + '" 2>&1') `
    -WorkingDirectory (Join-Path $pedidos 'pedidos360-frontend') -WindowStyle Hidden
  foreach ($i in 1..40) {
    Start-Sleep -Seconds 5
    if (Test-Puerto 4200) { break }
  }
  if (Test-Puerto 4200) { Write-Host "  OK  http://localhost:4200" }
  else { Write-Host "  !!! ng serve no levantó (ver $log)" -ForegroundColor Yellow }
}

Write-Host "`nListo. Abrir http://localhost:4200 y entrar con la cuenta Azure del curso." -ForegroundColor Green
