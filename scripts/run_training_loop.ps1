<#
PowerShell helper to repeatedly launch Mindustry for long training runs.

Usage:
  .\scripts\run_training_loop.ps1 -Exe "C:\path\to\Mindustry.exe" -Args "-config ..." -Delay 5

The script will:
  - Launch Mindustry in a loop
  - Wait for it to exit/crash
  - Log exit code & restart after a delay

Useful when you want the mod to keep training and automatically restart after a loss/crash.
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Exe,

    [string]$Args = "",

    [int]$Delay = 5,

    [int]$MaxRestarts = 0, # 0 = unlimited

    # By default we only restart when the process exits with a non-zero code (crash/abort).
    # If the game exits cleanly (exit code 0) we stop the loop unless this switch is set.
    [switch]$RestartOnNormalExit = $false,

    [string]$LogFile = "training_loop.log"
)

function Log($msg) {
    $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$t] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

function Cleanup-EventRunResources($SourceIds, $Jobs) {
    foreach ($sourceId in $SourceIds) {
        if ([string]::IsNullOrWhiteSpace($sourceId)) {
            continue
        }
        Get-EventSubscriber | Where-Object { $_.SourceIdentifier -eq $sourceId } | Unregister-Event -Force -ErrorAction SilentlyContinue
        Get-Event | Where-Object { $_.SourceIdentifier -eq $sourceId } | Remove-Event -ErrorAction SilentlyContinue
    }
    foreach ($job in $Jobs) {
        if ($null -eq $job) {
            continue
        }
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path $Exe)) {
    Write-Error "Executable not found: $Exe"
    exit 1
}

$restartCount = 0

Log "Starting training loop (exe=$Exe args='$Args')"

while ($true) {
    $restartCount++
    if ($MaxRestarts -gt 0 -and $restartCount -gt $MaxRestarts) {
        Log "Reached max restarts ($MaxRestarts). Exiting."
        break
    }

    Log "Launching (run #$restartCount)..."
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $Exe
    $startInfo.Arguments = $Args
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $outSourceId = "training-loop.stdout.$PID.$restartCount"
    $errSourceId = "training-loop.stderr.$PID.$restartCount"
    $eventMessageData = @{ LogFile = $LogFile }
    $outEventJob = $null
    $errEventJob = $null

    $process.Start() | Out-Null

    # Log stdout/stderr asynchronously using event handlers
    $outEventAction = {
        param([object]$sender, [System.Diagnostics.DataReceivedEventArgs]$e)
        $logPath = $Event.MessageData.LogFile
        if (-not [string]::IsNullOrEmpty($e.Data) -and -not [string]::IsNullOrEmpty($logPath)) {
            $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $l = "[$t] $($e.Data)"
            Add-Content -Path $logPath -Value $l
        }
    }

    $errEventAction = {
        param([object]$sender, [System.Diagnostics.DataReceivedEventArgs]$e)
        $logPath = $Event.MessageData.LogFile
        if (-not [string]::IsNullOrEmpty($e.Data) -and -not [string]::IsNullOrEmpty($logPath)) {
            $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $l = "[$t] [ERR] $($e.Data)"
            Add-Content -Path $logPath -Value $l
        }
    }

    try {
        $outEventJob = Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -SourceIdentifier $outSourceId -MessageData $eventMessageData -Action $outEventAction
        $errEventJob = Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -SourceIdentifier $errSourceId -MessageData $eventMessageData -Action $errEventAction

        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()

        $process.WaitForExit()
        $exitCode = $process.ExitCode
        Log "Process exited with code $exitCode"
    }
    finally {
        try { $process.CancelOutputRead() } catch {}
        try { $process.CancelErrorRead() } catch {}
        Cleanup-EventRunResources -SourceIds @($outSourceId, $errSourceId) -Jobs @($outEventJob, $errEventJob)
        $process.Dispose()
    }

    # If the process exited cleanly (exit code 0), stop here unless the user explicitly asked to restart.
    if ($exitCode -eq 0 -and -not $RestartOnNormalExit) {
        Log "Process exited cleanly (0). Stopping." 
        break
    }

    if ($MaxRestarts -gt 0 -and $restartCount -ge $MaxRestarts) {
        Log "Reached max restarts ($MaxRestarts). Stopping."
        break
    }

    Log "Waiting $Delay seconds before restart..."
    Start-Sleep -Seconds $Delay
}

Log "Training loop finished."
