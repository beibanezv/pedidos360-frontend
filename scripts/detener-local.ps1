# Detiene lo que levanta scripts\levantar-local.ps1 (los 8 microservicios + ng serve).
# Los contenedores Docker quedan corriendo a propósito: la base de datos conserva
# sus datos entre sesiones y arranca sola al abrir Docker Desktop.
#
# Uso: powershell -ExecutionPolicy Bypass -File scripts\detener-local.ps1

$ErrorActionPreference = 'Continue'

# Puertos de los microservicios (8081-8088).
$puertosServicios = 8081..8088
Get-NetTCPConnection -State Listen -LocalPort $puertosServicios -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    $p = Get-Process -Id $_ -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq 'java') {
      Write-Host "deteniendo ms (pid $($p.Id))"
      Stop-Process -Id $p.Id -Force
    }
  }

# Frontend (ng serve corre bajo node).
if (Test-NetConnection -ComputerName localhost -Port 4200 -InformationLevel Quiet -WarningAction SilentlyContinue) {
  Get-NetTCPConnection -State Listen -LocalPort 4200 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Write-Host "frontend detenido"
}

Write-Host "Listo. Docker sigue arriba (para bajarlo: docker compose down en cada repo)."
