<#
PowerShell helper to collect RL transitions from a mobile Mindustry instance (via socket)
and then train a Q-table (or other model) offline.

Usage:
  .\train_from_mobile.ps1

Steps:
 1) Runs rl_socket_server.py on localhost:4567
 2) Waits until you press Enter (while the mobile game is sending transitions)
 3) Stops the socket server
 4) Trains a Q-table using rl_qlearn.py (output: q_table.json)

Requirements:
 - Python must be installed and available as "python", "py" or "python3".
 - The mobile device must be on the same network as the PC.
 - In ai.js, set config.rlSocketEnabled=true and config.rlSocketHost=<PC_IP>.
#>

param(
    [int]$Timeout = 0,
    [int]$MaxTransitions = 0,
    [switch]$NoWait
)

function Get-PythonCommand {
    foreach ($cmd in @("python", "py", "python3", "python3.13")) {
        try {
            $ver = & $cmd --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                return $cmd
            }
        } catch {
            # ignore
        }
    }
    return $null
}

$python = Get-PythonCommand
if (-not $python) {
    Write-Error "Python não encontrado no PATH. Instale Python ou use o Launcher (py)."
    exit 1
}

$port = 4567
$logFile = "rl_socket.log"
$epochs = 5
$outQTable = "q_table.json"

# Detecta os IPs locais para instruir o celular sobre para onde enviar os logs.
function Get-LocalIPv4s {
    $ips = @()
    try {
        $ips += Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notmatch "^127\." -and $_.IPAddress -notmatch "^169\.254\." } |
            Select-Object -ExpandProperty IPAddress
    } catch {
        # Fallback em sistemas que não têm Get-NetIPAddress
    }
    try {
        $host = [System.Net.Dns]::GetHostEntry($env:COMPUTERNAME)
        $ips += $host.AddressList |
            Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.ToString() -notmatch '^127\.' } |
            ForEach-Object { $_.ToString() }
    } catch {
        # ignore
    }
    return $ips | Select-Object -Unique
}

$localIPs = Get-LocalIPv4s

Write-Host "Usando Python: $python"
Write-Host "Iniciando socket server (porta $port)." -ForegroundColor Cyan

$job = Start-Job -Name "RL-Socket" -ScriptBlock {
    param($python, $port, $logFile, $timeout, $maxTrans)
    $args = @("--host", "0.0.0.0", "--port", $port, "--out", $logFile, "--verbose")
    if ($timeout -gt 0) { $args += @("--timeout", $timeout) }
    if ($maxTrans -gt 0) { $args += @("--max-transitions", $maxTrans) }
    & $python scripts/rl_socket_server.py @args
} -ArgumentList $python, $port, $logFile, $Timeout, $MaxTransitions

Write-Host "Socket server em execução como job 'RL-Socket'." -ForegroundColor Green

$ipHint = if ($localIPs -and $localIPs.Count -gt 0) { $localIPs -join ", " } else { "<IP-do-PC>" }
Write-Host "
Ação necessária:
 1) No celular, configure ai.js com:
    config.rlSocketEnabled = true
    config.rlSocketHost = '<IP-do-PC>'

    (Use um dos IPs deste PC: $ipHint)
2) Rode Mindustry e deixe a IA rodar para gerar transições.
" -ForegroundColor Yellow

if (-not $NoWait -and $Timeout -eq 0 -and $MaxTransitions -eq 0) {
    Write-Host "Pressione ENTER quando quiser encerrar a coleta e treinar." -ForegroundColor Yellow
    Read-Host | Out-Null
} else {
    if ($Timeout -gt 0) {
        Write-Host "Servidor irá parar automaticamente após $Timeout segundos de inatividade." -ForegroundColor Yellow
    }
    if ($MaxTransitions -gt 0) {
        Write-Host "Servidor irá parar automaticamente após $MaxTransitions transições." -ForegroundColor Yellow
    }
}

Write-Host "Parando socket server..." -ForegroundColor Cyan
Stop-Job -Name "RL-Socket" -ErrorAction SilentlyContinue
Remove-Job -Name "RL-Socket" -ErrorAction SilentlyContinue

Write-Host "Treinando Q-table (rl_qlearn.py)..." -ForegroundColor Cyan
& $python scripts/rl_qlearn.py --log $logFile --out $outQTable --epochs $epochs

Write-Host "Treinamento concluído. Q-table salva em: $outQTable" -ForegroundColor Green
Write-Host "Coloque o arquivo no caminho esperado pelo mod (config.rlQTableFile)." -ForegroundColor Green
