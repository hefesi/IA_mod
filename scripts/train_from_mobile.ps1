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

Write-Host "Usando Python: $python"
Write-Host "Iniciando socket server (porta $port)." -ForegroundColor Cyan

$job = Start-Job -Name "RL-Socket" -ScriptBlock {
    param($python, $port, $logFile)
    & $python scripts/rl_socket_server.py --host 0.0.0.0 --port $port --out $logFile --verbose
} -ArgumentList $python, $port, $logFile

Write-Host "Socket server em execução como job 'RL-Socket'." -ForegroundColor Green
Write-Host "
Ação necessária:
 1) No celular, configure ai.js com:\n    config.rlSocketEnabled = true\n    config.rlSocketHost = '<IP-do-PC>'\n2) Rode Mindustry e deixe a IA rodar para gerar transições.

Pressione ENTER quando quiser encerrar a coleta e treinar." -ForegroundColor Yellow

Read-Host | Out-Null

Write-Host "Parando socket server..." -ForegroundColor Cyan
Stop-Job -Name "RL-Socket" -ErrorAction SilentlyContinue
Remove-Job -Name "RL-Socket" -ErrorAction SilentlyContinue

Write-Host "Treinando Q-table (rl_qlearn.py)..." -ForegroundColor Cyan
& $python scripts/rl_qlearn.py --log $logFile --out $outQTable --epochs $epochs

Write-Host "Treinamento concluído. Q-table salva em: $outQTable" -ForegroundColor Green
Write-Host "Coloque o arquivo no caminho esperado pelo mod (config.rlQTableFile)." -ForegroundColor Green
