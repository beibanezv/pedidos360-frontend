# Clona todos los repos de Pedidos360.
#
# Uso: powershell -ExecutionPolicy Bypass -File scripts\clonar-repos.ps1
# (los que ya existan se saltan)
#
# Destino: la carpeta que contiene a pedidos360-frontend (normalmente "pedidos360").
# NUNCA dentro del repo frontend: si el destino cayera dentro de el, los 9 repos
# quedarian anidados y levantar-local.ps1 no los encontraria.

$Owner = "beibanezv"

$Repos = @(
    "pedidos360-frontend",
    "pedidos360-ms-productos",
    "pedidos360-ms-carrito",
    "pedidos360-ms-login",
    "pedidos360-ms-admin",
    "pedidos360-ms-orders",
    "pedidos360-ms-notificaciones",
    "pedidos360-ms-auditoria",
    "pedidos360-ms-cupones"
)

# Buscar hacia arriba la carpeta que contiene a pedidos360-frontend.
$Destino = $PSScriptRoot
while ($Destino -and -not (Test-Path (Join-Path $Destino 'pedidos360-frontend'))) {
    $Destino = Split-Path $Destino -Parent
}
if (-not $Destino) {
    throw "No encontré la carpeta que contiene 'pedidos360-frontend' subiendo desde $PSScriptRoot"
}
if ($Destino -like "*\pedidos360-frontend\*") {
    throw "Destino dentro del repo frontend ($Destino): abortado para no anidar los repos."
}

foreach ($repo in $Repos) {
    $ruta = Join-Path $Destino $repo
    if (Test-Path $ruta) {
        Write-Host "==> $repo ya existe, se salta" -ForegroundColor DarkGray
        continue
    }
    Write-Host "==> Clonando $repo ..." -ForegroundColor Cyan
    git clone "https://github.com/$Owner/$repo.git" $ruta
    if ($LASTEXITCODE -ne 0) { Write-Host "    FALLO $repo" -ForegroundColor Red }
}

Write-Host "Listo. Repos en $Destino" -ForegroundColor Green
