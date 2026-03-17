<#
PowerShell helper for headless Mindustry training (gradlew server:run).

Flow:
 1) Start scripts/rl_socket_server.py on 127.0.0.1:4567
 2) Start Gradle headless server (server:run) from Mindustry repo root
 3) Send "host" (optional map/mode) to create a game world
 4) Collect transitions until ENTER, timeout or max transitions
 5) Train Q-table with scripts/rl_qlearn.py

Quick use:
  .\scripts\train_headless.ps1 -Map "maze" -Mode "survival" -Timeout 1800 -Epochs 8

Notes:
  - Make sure config.rlSocketEnabled=true and config.rlSocketHost="127.0.0.1" in scripts/ai.js
  - Server output is saved to headless_server.log
#>

param(
    [string]$RepoRoot = "",
    [string]$Map = "",
    [string]$Mode = "",
    [int]$Timeout = 0,
    [int]$MaxTransitions = 0,
    [int]$Epochs = 5,
    [string]$LogFile = "rl_socket.log",
    [string]$OutQTable = "q_table.json",
    [string]$ServerLog = "headless_server.log",
    [switch]$NoWait,
    [switch]$NoHost
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

function Resolve-RepoRoot {
    param([string]$ExplicitRoot)
    if (-not [string]::IsNullOrWhiteSpace($ExplicitRoot)) {
        return (Resolve-Path $ExplicitRoot).Path
    }
    # scripts/ -> IA_mod -> mods -> config -> assets -> core -> repo root
    $guess = Join-Path $PSScriptRoot "..\..\..\..\..\.."
    try {
        return (Resolve-Path $guess).Path
    } catch {
        return $null
    }
}

function Resolve-PathIfRelative {
    param([string]$Path, [string]$Base)
    if ([System.IO.Path]::IsPathRooted($Path)) { return $Path }
    return (Join-Path $Base $Path)
}

$python = Get-PythonCommand
if (-not $python) {
    Write-Error "Python nao encontrado no PATH. Instale Python (ou py launcher)."
    exit 1
}

$modRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRoot = Resolve-RepoRoot -ExplicitRoot $RepoRoot
if (-not $repoRoot) {
    Write-Error "Nao foi possivel resolver a raiz do repo. Use -RepoRoot para indicar."
    exit 1
}

$gradlew = Join-Path $repoRoot "gradlew.bat"
if (-not (Test-Path $gradlew)) {
    $gradlew = Join-Path $repoRoot "gradlew"
}
if (-not (Test-Path $gradlew)) {
    Write-Error "gradlew(.bat) nao encontrado em: $repoRoot"
    exit 1
}

$socketScript = Resolve-PathIfRelative -Path "scripts/rl_socket_server.py" -Base $modRoot
$qlearnScript = Resolve-PathIfRelative -Path "scripts/rl_qlearn.py" -Base $modRoot
$logPath = Resolve-PathIfRelative -Path $LogFile -Base $modRoot
$outQTablePath = Resolve-PathIfRelative -Path $OutQTable -Base $modRoot
$serverLogPath = Resolve-PathIfRelative -Path $ServerLog -Base $modRoot

Write-Host "Repo root: $repoRoot"
Write-Host "Mod root:  $modRoot"
Write-Host "Usando Python: $python"
Write-Host "Iniciando socket server em 127.0.0.1:4567..." -ForegroundColor Cyan

$serverJob = Start-Job -Name "RL-Socket-Headless" -ScriptBlock {
    param($python, $script, $logFile, $timeout, $maxTransitions)
    $args = @($script, "--host", "127.0.0.1", "--port", "4567", "--out", $logFile, "--verbose")
    if ($timeout -gt 0) { $args += @("--timeout", $timeout) }
    if ($maxTransitions -gt 0) { $args += @("--max-transitions", $maxTransitions) }
    & $python @args
} -ArgumentList $python, $socketScript, $logPath, $Timeout, $MaxTransitions

Start-Sleep -Milliseconds 600

Write-Host "Iniciando headless server: gradlew server:run" -ForegroundColor Cyan

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $gradlew
$startInfo.Arguments = "server:run"
$startInfo.WorkingDirectory = $repoRoot
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardInput = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
$process.Start() | Out-Null

Write-Host "Headless PID: $($process.Id)"
Write-Host "Server log:   $serverLogPath"

Start-Job -Name "HeadlessOut" -ScriptBlock {
    param($reader, $logFile)
    while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()
        if ($line -ne $null) {
            $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -Path $logFile -Value "[$t] $line"
        }
    }
} -ArgumentList $process.StandardOutput, $serverLogPath | Out-Null

Start-Job -Name "HeadlessErr" -ScriptBlock {
    param($reader, $logFile)
    while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()
        if ($line -ne $null) {
            $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -Path $logFile -Value "[$t] [ERR] $line"
        }
    }
} -ArgumentList $process.StandardError, $serverLogPath | Out-Null

if (-not $NoHost) {
    $cmd = "host"
    if (-not [string]::IsNullOrWhiteSpace($Map)) {
        $cmd = "host $Map"
        if (-not [string]::IsNullOrWhiteSpace($Mode)) {
            $cmd += " $Mode"
        }
    }
    Write-Host "Enviando comando: $cmd" -ForegroundColor Cyan
    try {
        $process.StandardInput.WriteLine($cmd)
        $process.StandardInput.Flush()
    } catch {
        Write-Warning "Falha ao enviar comando ao server. Envie manualmente no console."
    }
} else {
    Write-Host "NoHost ativo: envie 'host [map] [mode]' manualmente no console." -ForegroundColor Yellow
}

Write-Host "`nDeixe a IA rodar para gerar transicoes." -ForegroundColor Yellow
if (-not $NoWait -and $Timeout -eq 0 -and $MaxTransitions -eq 0) {
    Write-Host "Pressione ENTER para encerrar a coleta e iniciar treino." -ForegroundColor Yellow
    Read-Host | Out-Null
} else {
    if ($Timeout -gt 0) { Write-Host "Parada automatica por timeout: $Timeout s" -ForegroundColor Yellow }
    if ($MaxTransitions -gt 0) { Write-Host "Parada automatica por transicoes: $MaxTransitions" -ForegroundColor Yellow }

    while ((Get-Job -Name "RL-Socket-Headless" -ErrorAction SilentlyContinue).State -eq "Running") {
        Start-Sleep -Milliseconds 400
    }
}

Write-Host "Parando headless server..." -ForegroundColor Cyan
try {
    if (-not $process.HasExited) {
        $process.StandardInput.WriteLine("exit")
        $process.StandardInput.Flush()
        $process.WaitForExit(8000) | Out-Null
    }
} catch {
    # ignore
}

if (-not $process.HasExited) {
    try { $process.Kill() } catch { }
}

Write-Host "Parando socket server..." -ForegroundColor Cyan
Stop-Job -Name "RL-Socket-Headless" -ErrorAction SilentlyContinue
Remove-Job -Name "RL-Socket-Headless" -ErrorAction SilentlyContinue

Get-Job -Name "HeadlessOut" -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue | Remove-Job -ErrorAction SilentlyContinue | Out-Null
Get-Job -Name "HeadlessErr" -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue | Remove-Job -ErrorAction SilentlyContinue | Out-Null

Write-Host "Treinando Q-table..." -ForegroundColor Cyan
& $python $qlearnScript --log $logPath --out $outQTablePath --epochs $Epochs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao executar rl_qlearn.py"
    exit 1
}

Write-Host "`nTreino concluido." -ForegroundColor Green
Write-Host "Log de transicoes: $logPath"
Write-Host "Q-table gerada:     $outQTablePath"
Write-Host "No mod, confirme config.rlQTableFile/config.rlQTablePath para carregar esse arquivo." -ForegroundColor Green
