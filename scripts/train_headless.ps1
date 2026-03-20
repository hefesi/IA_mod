<#
PowerShell helper for headless Mindustry training (gradlew server:run).

Flow:
 1) Start scripts/rl_socket_server.py on 127.0.0.1:4567
 2) Start Gradle headless server (server:run) from Mindustry repo root
 3) Send "host" (optional map/mode) or a curriculum command
 4) Collect transitions until ENTER, timeout or max transitions
 5) Repeat the collection for curriculum slices when requested
 6) Train Stable-Baselines3 PPO with scripts/rl_ppo.py
 7) Optionally export the raw log to Parquet for DuckDB analysis
 8) Export the policy head to nn_model.json for the mod
 9) Optionally run the deterministic validation suite

Quick use:
  .\scripts\train_headless.ps1 -Map "Maze" -Mode "survival" -Timeout 1800 -Epochs 8 -ParquetOut "logs\maze.parquet" -Validate

Curriculum example:
  .\scripts\train_headless.ps1 -CurriculumMaps "Maze","Fork","Archipelago" -CurriculumRuns 6 -CurriculumRandomize -Timeout 600 -Epochs 8

Notes:
  - Make sure config.rlSocketEnabled=true and config.rlSocketHost="127.0.0.1" in scripts/ai.js
  - Server output is saved to headless_server.log
#>

param(
    [string]$RepoRoot = "",
    [string]$Map = "",
    [string]$Mode = "",
    [string[]]$CurriculumMaps = @(),
    [string[]]$CurriculumModes = @(),
    [string[]]$CurriculumCommands = @(),
    [string[]]$SerpuloMaps = @(),
    [string[]]$SerpuloModes = @(),
    [string[]]$SerpuloCommands = @(),
    [string[]]$ErekirMaps = @(),
    [string[]]$ErekirModes = @(),
    [string[]]$ErekirCommands = @(),
    [int]$CurriculumRuns = 0,
    [int]$PlanetCurriculumRuns = 0,
    [switch]$CurriculumRandomize,
    [int]$CurriculumSeed = 7,
    [int]$CurriculumDelay = 2,
    [int]$Timeout = 0,
    [int]$MaxTransitions = 0,
    [int]$Epochs = 5,
    [int]$RolloutSteps = 256,
    [int]$BatchSize = 64,
    [int]$Seed = 7,
    [string]$LogFile = "rl_socket.log",
    [string]$OutModel = "ppo_model.pt",
    [string]$OutMeta = "ppo_meta.json",
    [string]$OutNNJson = "nn_model.json",
    [string]$ParquetOut = "",
    [string]$ServerLog = "headless_server.log",
    [string]$WandbProject = "",
    [string]$WandbEntity = "",
    [string]$WandbRunName = "",
    [switch]$WandbOffline,
    [switch]$Validate,
    [int]$MinPlanetTransitions = 40,
    [int]$MinPlanetActions = 3,
    [switch]$AppendLog,
    [switch]$NoWait,
    [switch]$NoHost,
    [switch]$BindPublic,
    [string]$Token = ""
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

function Get-CleanList {
    param([string[]]$Items)
    $out = @()
    foreach ($item in ($Items | Where-Object { $_ -ne $null })) {
        $text = [string]$item
        if (-not [string]::IsNullOrWhiteSpace($text)) {
            $out += $text.Trim()
        }
    }
    return $out
}

function Get-HostCommand {
    param([string]$SelectedMap, [string]$SelectedMode)
    $cmd = "host"
    if (-not [string]::IsNullOrWhiteSpace($SelectedMap)) {
        $cmd += " $SelectedMap"
        if (-not [string]::IsNullOrWhiteSpace($SelectedMode)) {
            $cmd += " $SelectedMode"
        }
    }
    return $cmd
}

function Select-Value {
    param(
        [string[]]$Pool,
        [int]$Index,
        [System.Random]$Randomizer
    )
    if (-not $Pool -or $Pool.Count -eq 0) { return "" }
    if ($Randomizer -ne $null) {
        return $Pool[$Randomizer.Next(0, $Pool.Count)]
    }
    return $Pool[$Index % $Pool.Count]
}

function New-CurriculumSpecs {
    param(
        [string]$BaseMap,
        [string]$BaseMode,
        [string[]]$MapList,
        [string[]]$ModeList,
        [string[]]$CommandList,
        [int]$RunCount,
        [switch]$Randomize,
        [int]$Seed
    )

    $cleanCommands = Get-CleanList -Items $CommandList
    $cleanMaps = Get-CleanList -Items $MapList
    $cleanModes = Get-CleanList -Items $ModeList

    if ($cleanMaps.Count -eq 0 -and -not [string]::IsNullOrWhiteSpace($BaseMap)) {
        $cleanMaps = @($BaseMap.Trim())
    }
    if ($cleanModes.Count -eq 0 -and -not [string]::IsNullOrWhiteSpace($BaseMode)) {
        $cleanModes = @($BaseMode.Trim())
    }
    if ($cleanMaps.Count -eq 0 -and $cleanCommands.Count -eq 0 -and $cleanModes.Count -gt 0) {
        throw "CurriculumModes requer Map/CurriculumMaps ou CurriculumCommands."
    }

    $runs = 1
    if ($RunCount -gt 0) {
        $runs = $RunCount
    } elseif ($cleanCommands.Count -gt 0) {
        $runs = $cleanCommands.Count
    } elseif ($cleanMaps.Count -gt 0 -or $cleanModes.Count -gt 0) {
        $runs = [Math]::Max([Math]::Max($cleanMaps.Count, 1), [Math]::Max($cleanModes.Count, 1))
    }

    $randomizer = $null
    if ($Randomize) {
        $randomizer = New-Object System.Random($Seed)
    }

    $specs = @()
    for ($i = 0; $i -lt $runs; $i++) {
        if ($cleanCommands.Count -gt 0) {
            $command = Select-Value -Pool $cleanCommands -Index $i -Randomizer $randomizer
            $specs += [pscustomobject]@{
                Index = $i + 1
                Label = "cmd:$command"
                Command = $command
                Map = ""
                Mode = ""
            }
            continue
        }

        $selectedMap = Select-Value -Pool $cleanMaps -Index $i -Randomizer $randomizer
        $selectedMode = Select-Value -Pool $cleanModes -Index $i -Randomizer $randomizer
        $command = Get-HostCommand -SelectedMap $selectedMap -SelectedMode $selectedMode
        $label = if (-not [string]::IsNullOrWhiteSpace($selectedMap)) {
            if (-not [string]::IsNullOrWhiteSpace($selectedMode)) { "$selectedMap/$selectedMode" } else { $selectedMap }
        } else {
            "host-default"
        }

        $specs += [pscustomobject]@{
            Index = $i + 1
            Label = $label
            Command = $command
            Map = $selectedMap
            Mode = $selectedMode
        }
    }

    return $specs
}

function Clone-CurriculumSpec {
    param(
        [pscustomobject]$Spec,
        [int]$Index,
        [string]$Planet
    )

    $planetLabel = if ([string]::IsNullOrWhiteSpace($Planet)) { "mixed" } else { $Planet.Trim().ToLowerInvariant() }
    return [pscustomobject]@{
        Index = $Index
        Label = "$planetLabel/$($Spec.Label)"
        Command = $Spec.Command
        Map = $Spec.Map
        Mode = $Spec.Mode
        Planet = $planetLabel
    }
}

function New-PlanetBalancedSpecs {
    param(
        [string[]]$SerpuloMapList,
        [string[]]$SerpuloModeList,
        [string[]]$SerpuloCommandList,
        [string[]]$ErekirMapList,
        [string[]]$ErekirModeList,
        [string[]]$ErekirCommandList,
        [int]$RunCount,
        [switch]$Randomize,
        [int]$Seed
    )

    $serpuloRequested = (Get-CleanList -Items $SerpuloMapList).Count -gt 0 -or (Get-CleanList -Items $SerpuloModeList).Count -gt 0 -or (Get-CleanList -Items $SerpuloCommandList).Count -gt 0
    $erekirRequested = (Get-CleanList -Items $ErekirMapList).Count -gt 0 -or (Get-CleanList -Items $ErekirModeList).Count -gt 0 -or (Get-CleanList -Items $ErekirCommandList).Count -gt 0

    if (-not $serpuloRequested -and -not $erekirRequested) {
        return @()
    }

    $targetRuns = if ($RunCount -gt 0) { $RunCount } else { 1 }
    $serpuloSpecs = if ($serpuloRequested) {
        New-CurriculumSpecs -BaseMap "" -BaseMode "" -MapList $SerpuloMapList -ModeList $SerpuloModeList -CommandList $SerpuloCommandList -RunCount $targetRuns -Randomize:$Randomize -Seed $Seed
    } else {
        @()
    }
    $erekirSpecs = if ($erekirRequested) {
        New-CurriculumSpecs -BaseMap "" -BaseMode "" -MapList $ErekirMapList -ModeList $ErekirModeList -CommandList $ErekirCommandList -RunCount $targetRuns -Randomize:$Randomize -Seed ($Seed + 17)
    } else {
        @()
    }

    $combined = @()
    $nextIndex = 1
    $maxRuns = [Math]::Max($serpuloSpecs.Count, $erekirSpecs.Count)
    for ($i = 0; $i -lt $maxRuns; $i++) {
        if ($i -lt $serpuloSpecs.Count) {
            $combined += Clone-CurriculumSpec -Spec $serpuloSpecs[$i] -Index $nextIndex -Planet "serpulo"
            $nextIndex++
        }
        if ($i -lt $erekirSpecs.Count) {
            $combined += Clone-CurriculumSpec -Spec $erekirSpecs[$i] -Index $nextIndex -Planet "erekir"
            $nextIndex++
        }
    }

    return $combined
}

function Clear-FileIfNeeded {
    param([string]$PathToClear, [switch]$KeepExisting)
    if ($KeepExisting) { return }
    $dir = Split-Path -Parent $PathToClear
    if (-not [string]::IsNullOrWhiteSpace($dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    Set-Content -Path $PathToClear -Value $null
}

function Start-SocketCollectionJob {
    param(
        [string]$JobName,
        [string]$Python,
        [string]$SocketScript,
        [string]$LogPath,
        [int]$SliceTimeout,
        [int]$SliceMaxTransitions,
        [string]$BindHost = "127.0.0.1",
        [string]$Token = ""
    )

    $job = Start-Job -Name $JobName -ScriptBlock {
        param($python, $script, $logFile, $timeout, $maxTransitions, $bindHost, $token)
        $args = @($script, "--host", $bindHost, "--port", "4567", "--out", $logFile, "--verbose", "--stop-on-event", "gameOver")
        if ($timeout -gt 0) { $args += @("--timeout", $timeout) }
        if ($maxTransitions -gt 0) { $args += @("--max-transitions", $maxTransitions) }
        if ($token) { $args += @("--token", $token) }
        & $python @args
    } -ArgumentList $Python, $SocketScript, $LogPath, $SliceTimeout, $SliceMaxTransitions, $BindHost, $Token
    return $job
}

function Start-HeadlessProcess {
    param(
        [string]$GradlewPath,
        [string]$WorkingDir
    )

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $GradlewPath
    $startInfo.Arguments = "server:run"
    $startInfo.WorkingDirectory = $WorkingDir
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $process.Start() | Out-Null
    return $process
}

function Start-HeadlessLogJobs {
    param(
        [System.Diagnostics.Process]$Process,
        [string]$LogFile,
        [string]$Prefix
    )

    # Use process events instead of Start-Job with streams for reliable async reading
    # Event handlers are garbage-collected after process exits
    
    $outputScript = {
        param($logFile)
        if ($null -ne $Event.SourceEventArgs.Data) {
            $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -Path $logFile -Value "[$t] $($Event.SourceEventArgs.Data)"
        }
    }
    
    $errorScript = {
        param($logFile)
        if ($null -ne $Event.SourceEventArgs.Data) {
            $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -Path $logFile -Value "[$t] [ERR] $($Event.SourceEventArgs.Data)"
        }
    }
    
    # Register event handlers for process output
    $outEventName = "Process-Output-$($Process.Id)"
    $errEventName = "Process-Error-$($Process.Id)"
    
    Register-ObjectEvent -InputObject $Process -EventName OutputDataReceived -SourceIdentifier $outEventName -Action $outputScript -ArgumentList $LogFile | Out-Null
    Register-ObjectEvent -InputObject $Process -EventName ErrorDataReceived -SourceIdentifier $errEventName -Action $errorScript -ArgumentList $LogFile | Out-Null
    
    # Start async reading of streams
    $Process.BeginOutputReadLine()
    $Process.BeginErrorReadLine()
    
    return @{
        Process = $Process
        OutEventName = $outEventName
        ErrEventName = $errEventName
    }
}

function Stop-HeadlessLogJobs {
    param([hashtable]$LogJobInfo)
    
    if ($null -ne $LogJobInfo -and $LogJobInfo.OutEventName -and $LogJobInfo.ErrEventName) {
        try {
            Unregister-Event -SourceIdentifier $LogJobInfo.OutEventName -ErrorAction SilentlyContinue
            Unregister-Event -SourceIdentifier $LogJobInfo.ErrEventName -ErrorAction SilentlyContinue
        } catch {
            # ignore
        }
    }
}

function Stop-JobSafe {
    param([string]$JobName)
    $job = Get-Job -Name $JobName -ErrorAction SilentlyContinue
    if ($job) {
        Stop-Job -Name $JobName -ErrorAction SilentlyContinue
        Remove-Job -Name $JobName -ErrorAction SilentlyContinue
    }
}

function Stop-HeadlessProcess {
    param([System.Diagnostics.Process]$Process)
    if ($Process -eq $null) { return }
    try {
        if (-not $Process.HasExited) {
            $Process.StandardInput.WriteLine("exit")
            $Process.StandardInput.Flush()
            $Process.WaitForExit(8000) | Out-Null
        }
    } catch {
        # ignore
    }

    if (-not $Process.HasExited) {
        try { $Process.Kill() } catch { }
    }
}

function Wait-ForCollectionStop {
    param(
        [string]$SocketJobName,
        [string]$RunLabel,
        [int]$SliceTimeout,
        [int]$SliceMaxTransitions,
        [switch]$SkipWait
    )

    if (-not $SkipWait -and $SliceTimeout -eq 0 -and $SliceMaxTransitions -eq 0) {
        Write-Host "Rodada ${RunLabel}: pressione ENTER para encerrar a coleta." -ForegroundColor Yellow
        Read-Host | Out-Null
        return
    }

    if ($SliceTimeout -gt 0) {
        Write-Host "Rodada ${RunLabel}: parada automatica por timeout em $SliceTimeout s." -ForegroundColor Yellow
    }
    if ($SliceMaxTransitions -gt 0) {
        Write-Host "Rodada ${RunLabel}: parada automatica por $SliceMaxTransitions transicoes." -ForegroundColor Yellow
    }

    while ((Get-Job -Name $SocketJobName -ErrorAction SilentlyContinue).State -eq "Running") {
        Start-Sleep -Milliseconds 400
    }
}

$python = Get-PythonCommand
if (-not $python) {
    Write-Error "Python nao encontrado no PATH. Instale Python (ou py launcher)."
    exit 1
}

if ($NoWait -and $Timeout -eq 0 -and $MaxTransitions -eq 0) {
    Write-Error "Use -Timeout ou -MaxTransitions junto com -NoWait para evitar coleta infinita."
    exit 1
}

if ($NoHost -and (($CurriculumRuns -gt 1) -or $CurriculumMaps.Count -gt 0 -or $CurriculumModes.Count -gt 0 -or $CurriculumCommands.Count -gt 0 -or $SerpuloMaps.Count -gt 0 -or $SerpuloModes.Count -gt 0 -or $SerpuloCommands.Count -gt 0 -or $ErekirMaps.Count -gt 0 -or $ErekirModes.Count -gt 0 -or $ErekirCommands.Count -gt 0 -or $PlanetCurriculumRuns -gt 0)) {
    Write-Error "NoHost nao pode ser combinado com curriculo automatico."
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
$ppoScript = Resolve-PathIfRelative -Path "scripts/rl_ppo.py" -Base $modRoot
$exportScript = Resolve-PathIfRelative -Path "scripts/rl_export_nn_json.py" -Base $modRoot
$validateScript = Resolve-PathIfRelative -Path "scripts/validate_rl_stack.py" -Base $modRoot
$evaluateScript = Resolve-PathIfRelative -Path "scripts/evaluate_ai.py" -Base $modRoot
$logPath = Resolve-PathIfRelative -Path $LogFile -Base $modRoot
$outModelPath = Resolve-PathIfRelative -Path $OutModel -Base $modRoot
$outMetaPath = Resolve-PathIfRelative -Path $OutMeta -Base $modRoot
$outNNJsonPath = Resolve-PathIfRelative -Path $OutNNJson -Base $modRoot
$parquetOutPath = if ([string]::IsNullOrWhiteSpace($ParquetOut)) { "" } else { Resolve-PathIfRelative -Path $ParquetOut -Base $modRoot }
$serverLogPath = Resolve-PathIfRelative -Path $ServerLog -Base $modRoot

$specs = $null
try {
    $specs = if ($NoHost) {
        @([pscustomobject]@{
            Index = 1
            Label = "manual"
            Command = ""
            Map = ""
            Mode = ""
            Planet = ""
        })
    } elseif ($SerpuloMaps.Count -gt 0 -or $SerpuloModes.Count -gt 0 -or $SerpuloCommands.Count -gt 0 -or $ErekirMaps.Count -gt 0 -or $ErekirModes.Count -gt 0 -or $ErekirCommands.Count -gt 0 -or $PlanetCurriculumRuns -gt 0) {
        New-PlanetBalancedSpecs -SerpuloMapList $SerpuloMaps -SerpuloModeList $SerpuloModes -SerpuloCommandList $SerpuloCommands -ErekirMapList $ErekirMaps -ErekirModeList $ErekirModes -ErekirCommandList $ErekirCommands -RunCount $PlanetCurriculumRuns -Randomize:$CurriculumRandomize -Seed $CurriculumSeed
    } else {
        New-CurriculumSpecs -BaseMap $Map -BaseMode $Mode -MapList $CurriculumMaps -ModeList $CurriculumModes -CommandList $CurriculumCommands -RunCount $CurriculumRuns -Randomize:$CurriculumRandomize -Seed $CurriculumSeed
    }
} catch {
    Write-Error $_
    exit 1
}

if (-not $specs -or $specs.Count -eq 0) {
    Write-Error "Nenhuma rodada de coleta foi definida. Informe mapas/comandos do curriculo."
    exit 1
}

Clear-FileIfNeeded -PathToClear $logPath -KeepExisting:$AppendLog
Clear-FileIfNeeded -PathToClear $serverLogPath -KeepExisting:$AppendLog

Write-Host "Repo root: $repoRoot"
Write-Host "Mod root:  $modRoot"
Write-Host "Usando Python: $python"
Write-Host "Rodadas de coleta: $($specs.Count)"
if ($CurriculumRandomize) {
    Write-Host "Curriculo aleatorio ativo (seed=$CurriculumSeed)." -ForegroundColor Cyan
}
if (($specs | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Planet) }).Count -gt 0) {
    Write-Host "Curriculo balanceado por planeta ativo." -ForegroundColor Cyan
}

foreach ($spec in $specs) {
    $runLabel = "$($spec.Index)/$($specs.Count) [$($spec.Label)]"
    $socketJobName = "RL-Socket-Headless-$($spec.Index)"
    $logJobPrefix = "Headless-$($spec.Index)"

    Write-Host ""
    Write-Host "Iniciando coleta $runLabel" -ForegroundColor Cyan
    Write-Host "Iniciando socket server em 127.0.0.1:4567..." -ForegroundColor Cyan

    $bindHost = if ($BindPublic) { "0.0.0.0" } else { "127.0.0.1" }
    $serverJob = Start-SocketCollectionJob -JobName $socketJobName -Python $python -SocketScript $socketScript -LogPath $logPath -SliceTimeout $Timeout -SliceMaxTransitions $MaxTransitions -BindHost $bindHost -Token $Token
    Start-Sleep -Milliseconds 600

    Write-Host "Iniciando headless server: gradlew server:run" -ForegroundColor Cyan
    $process = Start-HeadlessProcess -GradlewPath $gradlew -WorkingDir $repoRoot
    Write-Host "Headless PID: $($process.Id)"
    Write-Host "Server log:   $serverLogPath"

    $logJobInfo = Start-HeadlessLogJobs -Process $process -LogFile $serverLogPath -Prefix $logJobPrefix

    if (-not [string]::IsNullOrWhiteSpace($spec.Command)) {
        Write-Host "Enviando comando: $($spec.Command)" -ForegroundColor Cyan
        try {
            $process.StandardInput.WriteLine($spec.Command)
            $process.StandardInput.Flush()
        } catch {
            Write-Warning "Falha ao enviar comando ao server. Envie manualmente no console."
        }
    } else {
        Write-Host "NoHost ativo: envie 'host [map] [mode]' manualmente no console." -ForegroundColor Yellow
    }

    Write-Host "Deixe a IA rodar para gerar transicoes." -ForegroundColor Yellow
    Wait-ForCollectionStop -SocketJobName $socketJobName -RunLabel $runLabel -SliceTimeout $Timeout -SliceMaxTransitions $MaxTransitions -SkipWait:$NoWait

    Write-Host "Parando headless server..." -ForegroundColor Cyan
    Stop-HeadlessProcess -Process $process
    Stop-HeadlessLogJobs -LogJobInfo $logJobInfo

    Write-Host "Parando socket server..." -ForegroundColor Cyan
    Stop-JobSafe -JobName $socketJobName

    if ($CurriculumDelay -gt 0 -and $spec.Index -lt $specs.Count) {
        Write-Host "Aguardando $CurriculumDelay s antes da proxima rodada..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $CurriculumDelay
    }
}

Write-Host "Treinando policy PPO (Stable-Baselines3)..." -ForegroundColor Cyan
$ppoArgs = @(
    $ppoScript,
    "--log", $logPath,
    "--out", $outModelPath,
    "--out-meta", $outMetaPath,
    "--epochs", $Epochs,
    "--n-steps", $RolloutSteps,
    "--batch", $BatchSize,
    "--seed", $Seed
)
if (-not [string]::IsNullOrWhiteSpace($parquetOutPath)) {
    $ppoArgs += @("--parquet-out", $parquetOutPath)
}
if (-not [string]::IsNullOrWhiteSpace($WandbProject)) {
    $ppoArgs += @("--wandb-project", $WandbProject)
}
if (-not [string]::IsNullOrWhiteSpace($WandbEntity)) {
    $ppoArgs += @("--wandb-entity", $WandbEntity)
}
if (-not [string]::IsNullOrWhiteSpace($WandbRunName)) {
    $ppoArgs += @("--wandb-run-name", $WandbRunName)
}
if ($WandbOffline) {
    $ppoArgs += "--wandb-offline"
}
& $python @ppoArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao executar rl_ppo.py"
    exit 1
}

Write-Host "Exportando policy para nn_model.json..." -ForegroundColor Cyan
& $python $exportScript --model $outModelPath --meta $outMetaPath --out $outNNJsonPath --export-activation tanh
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao executar rl_export_nn_json.py"
    exit 1
}

if ($Validate) {
    Write-Host "Rodando suite deterministica de validacao..." -ForegroundColor Cyan
    & $python $validateScript
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha na validacao automatica da stack RL"
        exit 1
    }

    Write-Host "Validando contrato do modelo e cobertura minima por planeta..." -ForegroundColor Cyan
    & $python $evaluateScript --log $logPath --min-planet-transitions $MinPlanetTransitions --min-planet-actions $MinPlanetActions
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha na avaliacao automatica de contrato/cobertura RL"
        exit 1
    }
}

Write-Host ""
Write-Host "Treino concluido." -ForegroundColor Green
Write-Host "Log de transicoes: $logPath"
Write-Host "Checkpoint PPO:     $outModelPath"
Write-Host "Meta PPO:           $outMetaPath"
Write-Host "Policy exportada:   $outNNJsonPath"
if (-not [string]::IsNullOrWhiteSpace($parquetOutPath)) {
    Write-Host "Dataset Parquet:    $parquetOutPath"
}
Write-Host "No mod, confirme config.rlPolicyMode='nn' e config.rlNNFile/config.rlNNPath para carregar esse arquivo." -ForegroundColor Green
