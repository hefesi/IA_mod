<#
PowerShell helper para treino 100% no PC (Mindustry v7 desktop + socket local).

Fluxo:
 1) Sobe scripts/rl_socket_server.py em 127.0.0.1:4567
 2) (Opcional) abre o Mindustry.exe automaticamente
 3) Coleta transições por tempo, quantidade máxima ou até ENTER
 4) Treina Q-table com scripts/rl_qlearn.py

Uso rápido:
  .\scripts\train_on_pc.ps1 -Exe "C:\Games\Mindustry\Mindustry.exe" -MindustryArgs "-map maze -mode survival -autoplay"

Importante no mod (scripts/ai.js):
  config.rlSocketEnabled = true
  config.rlSocketHost = "127.0.0.1"
  config.rlSocketPort = 4567
#>

param(
    [string]$Exe = "",
    [string]$MindustryArgs = "",
    [int]$Timeout = 0,
    [int]$MaxTransitions = 0,
    [int]$Epochs = 5,
    [string]$LogFile = "rl_socket.log",
    [string]$OutQTable = "q_table.json",
    [switch]$NoWait,
    [switch]$NoLaunch
)

function Get-PythonCommand {
    foreach ($cmd in @("python", "py", "python3", "python3.13")) {
        try {
            & $cmd --version *> $null
            if ($LASTEXITCODE -eq 0) { return $cmd }
        } catch {
            # ignore
        }
    }
    return $null
}

$python = Get-PythonCommand
if (-not $python) {
    Write-Error "Python não encontrado no PATH. Instale Python (ou py launcher)."
    exit 1
}

if (-not $NoLaunch -and [string]::IsNullOrWhiteSpace($Exe)) {
    Write-Error "Informe -Exe com o caminho do Mindustry.exe ou use -NoLaunch para abrir o jogo manualmente."
    exit 1
}

if (-not $NoLaunch -and -not (Test-Path $Exe)) {
    Write-Error "Mindustry.exe não encontrado em: $Exe"
    exit 1
}

Write-Host "Usando Python: $python"
Write-Host "Iniciando socket server em 127.0.0.1:4567..." -ForegroundColor Cyan

$serverJob = Start-Job -Name "RL-Socket-PC" -ScriptBlock {
    param($python, $logFile, $timeout, $maxTransitions)
    $args = @("scripts/rl_socket_server.py", "--host", "127.0.0.1", "--port", "4567", "--out", $logFile, "--verbose")
    if ($timeout -gt 0) { $args += @("--timeout", $timeout) }
    if ($maxTransitions -gt 0) { $args += @("--max-transitions", $maxTransitions) }
    & $python @args
} -ArgumentList $python, $LogFile, $Timeout, $MaxTransitions

Start-Sleep -Milliseconds 600

$mindustryProc = $null
if (-not $NoLaunch) {
    Write-Host "Abrindo Mindustry..." -ForegroundColor Cyan
    if ([string]::IsNullOrWhiteSpace($MindustryArgs)) {
        $mindustryProc = Start-Process -FilePath $Exe -PassThru
    } else {
        $mindustryProc = Start-Process -FilePath $Exe -ArgumentList $MindustryArgs -PassThru
    }
    Write-Host "Mindustry PID: $($mindustryProc.Id)" -ForegroundColor Green
} else {
    Write-Host "NoLaunch ativo: abra o Mindustry manualmente neste PC." -ForegroundColor Yellow
}

Write-Host "\nNo jogo, deixe a IA rodar para gerar transições." -ForegroundColor Yellow
if (-not $NoWait -and $Timeout -eq 0 -and $MaxTransitions -eq 0) {
    Write-Host "Pressione ENTER para encerrar coleta e iniciar treino." -ForegroundColor Yellow
    Read-Host | Out-Null
} else {
    if ($Timeout -gt 0) { Write-Host "Parada automática por timeout: $Timeout s" -ForegroundColor Yellow }
    if ($MaxTransitions -gt 0) { Write-Host "Parada automática por transições: $MaxTransitions" -ForegroundColor Yellow }

    while ((Get-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue).State -eq "Running") {
        Start-Sleep -Milliseconds 400
    }
}

if ((Get-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue).State -eq "Running") {
    Write-Host "Parando socket server..." -ForegroundColor Cyan
    Stop-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue
}

Write-Host "Treinando Q-table..." -ForegroundColor Cyan
& $python scripts/rl_qlearn.py --log $LogFile --out $OutQTable --epochs $Epochs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao executar rl_qlearn.py"
    Remove-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue
    exit 1
}

Remove-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue

Write-Host "\nTreino concluído." -ForegroundColor Green
Write-Host "Log de transições: $LogFile"
Write-Host "Q-table gerada:      $OutQTable"
Write-Host "No mod, confirme config.rlQTableFile/config.rlQTablePath para carregar esse arquivo." -ForegroundColor Green
