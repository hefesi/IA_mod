# Treino Headless (server:run)

Este fluxo usa o servidor headless do Mindustry (Gradle) para treinar sem interface grafica.

## Pre-requisitos
- Python no PATH (`python`, `py` ou `python3`).
- Mindustry repo com `gradlew(.bat)`.
- Mod com RL por socket habilitado.

## Configuracao do mod
No `scripts/ai.js` do mod:
- `rlSocketEnabled: true`
- `rlSocketHost: "127.0.0.1"`
- `rlSocketPort: 4567`

## Execucao recomendada
No PowerShell, dentro do repositorio do mod:

```powershell
.\scripts\train_headless.ps1 -Map "maze" -Mode "survival" -Timeout 1800 -Epochs 8
```

Se nao informar `-Map`, o script envia apenas `host` (mapa aleatorio, modo survival).

## Parametros uteis
- `-RepoRoot`: caminho do repo Mindustry (onde fica `gradlew.bat`).
- `-Timeout`: para automaticamente apos N segundos sem conexao.
- `-MaxTransitions`: para quando atingir N transicoes.
- `-NoHost`: nao envia o comando `host` automaticamente.
- `-NoWait`: nao espera ENTER; util com timeout/transitions.

## Saidas
- Log bruto: `rl_socket.log`
- Log do server: `headless_server.log`
- Modelo Q-table: `q_table.json`

Depois, aponte `config.rlQTableFile` / `config.rlQTablePath` para a Q-table gerada.
