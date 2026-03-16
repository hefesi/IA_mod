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

    [string]$LogFile = "training_loop.log"
)

function Log($msg) {
    $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$t] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
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

    $process.Start() | Out-Null

    # Log stdout/stderr in background
    $outReader = $process.StandardOutput
    $errReader = $process.StandardError

    Start-Job -Name "TrainOut" -ScriptBlock {
        param($reader, $logFile)
        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if ($line -ne $null) {
                $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $l = "[$t] $line"
                Add-Content -Path $logFile -Value $l
            }
        }
    } -ArgumentList $outReader, $LogFile | Out-Null

    Start-Job -Name "TrainErr" -ScriptBlock {
        param($reader, $logFile)
        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if ($line -ne $null) {
                $t = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $l = "[$t] [ERR] $line"
                Add-Content -Path $logFile -Value $l
            }
        }
    } -ArgumentList $errReader, $LogFile | Out-Null

    $process.WaitForExit()
    $exitCode = $process.ExitCode
    Log "Process exited with code $exitCode";

    # Stop background jobs so they don't keep running
    Get-Job -Name "TrainOut" -ErrorAction SilentlyContinue | Stop-Job -Force | Remove-Job -Force | Out-Null
    Get-Job -Name "TrainErr" -ErrorAction SilentlyContinue | Stop-Job -Force | Remove-Job -Force | Out-Null

    if ($MaxRestarts -gt 0 -and $restartCount -ge $MaxRestarts) {
        Log "Reached max restarts ($MaxRestarts). Stopping."
        break
    }

    Log "Waiting $Delay seconds before restart..."
    Start-Sleep -Seconds $Delay
}

Log "Training loop finished."