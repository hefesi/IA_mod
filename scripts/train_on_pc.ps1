<#
PowerShell helper para treino 100% no PC (Mindustry v7 desktop + socket local).

Fluxo:
 1) Sobe scripts/rl_socket_server.py em 127.0.0.1:4567
 2) (Opcional) abre o Mindustry.exe automaticamente
 3) Coleta transições por tempo, quantidade máxima ou até ENTER
 4) Treina uma policy PPO-style com scripts/rl_ppo.py
 5) Exporta a policy para nn_model.json

Uso rápido:
  .\scripts\train_on_pc.ps1 -Exe "C:\Games\Mindustry\Mindustry.exe" -MindustryArgs "-map Maze -mode survival -autoplay"

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
    [string]$OutModel = "ppo_model.pt",
    [string]$OutMeta = "ppo_meta.json",
    [string]$OutNNJson = "nn_model.json",
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

# Resolve absolute path for the socket server script before creating the job
$socketServerPath = Join-Path $PSScriptRoot "rl_socket_server.py"
if (-not (Test-Path $socketServerPath)) {
    Write-Error "Socket server script não encontrado em: $socketServerPath"
    exit 1
}
$socketServerPath = (Resolve-Path $socketServerPath).Path
Write-Host "Socket server path: $socketServerPath" -ForegroundColor DarkGray

$serverJob = Start-Job -Name "RL-Socket-PC" -ScriptBlock {
    param($python, $scriptPath, $logFile, $timeout, $maxTransitions)
    $args = @($scriptPath, "--host", "127.0.0.1", "--port", "4567", "--out", $logFile, "--verbose")
    if ($timeout -gt 0) { $args += @("--timeout", $timeout) }
    if ($maxTransitions -gt 0) { $args += @("--max-transitions", $maxTransitions) }
    & $python @args
} -ArgumentList $python, $socketServerPath, $LogFile, $Timeout, $MaxTransitions

# Validate job startup
Start-Sleep -Milliseconds 1000
$jobState = (Get-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue).State
if ($jobState -ne "Running") {
    Write-Error "Socket server job falhou ao iniciar. Estado: $jobState"
    Remove-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue
    exit 1
}
Write-Host "Socket server iniciado com sucesso." -ForegroundColor Green

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

Write-Host "Treinando policy PPO-style..." -ForegroundColor Cyan
& $python scripts/rl_ppo.py --log $LogFile --out $OutModel --out-meta $OutMeta --epochs $Epochs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao executar rl_ppo.py"
    Remove-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Exportando policy para nn_model.json..." -ForegroundColor Cyan
& $python scripts/rl_export_nn_json.py --model $OutModel --meta $OutMeta --out $OutNNJson --export-activation tanh
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao executar rl_export_nn_json.py"
    Remove-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue
    exit 1
}

Remove-Job -Name "RL-Socket-PC" -ErrorAction SilentlyContinue

Write-Host "\nTreino concluído." -ForegroundColor Green
Write-Host "Log de transições: $LogFile"
Write-Host "Checkpoint PPO:      $OutModel"
Write-Host "Meta PPO:            $OutMeta"
Write-Host "Policy exportada:    $OutNNJson"
Write-Host "No mod, confirme config.rlPolicyMode='nn' e config.rlNNFile/config.rlNNPath para carregar esse arquivo." -ForegroundColor Green
