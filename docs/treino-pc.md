# Treino no PC (Mindustry v7, sem celular)

Este fluxo roda tudo no mesmo computador (jogo + socket + treino).

## Pré-requisitos
- Python no PATH (`python`, `py` ou `python3`).
- Mindustry v7 instalado no PC.
- Mod com RL por socket habilitado.

## Configuração do mod
No `scripts/ai.js` do mod:
- `rlSocketEnabled: true`
- `rlSocketHost: "127.0.0.1"`
- `rlSocketPort: 4567`

## Execução recomendada
No PowerShell, dentro do repositório:

```powershell
.\scripts\train_on_pc.ps1 -Exe "C:\caminho\Mindustry.exe" -MindustryArgs "-map maze -mode survival -autoplay" -Timeout 1800 -Epochs 8
```

Parâmetros úteis:
- `-Timeout`: para automaticamente após N segundos sem nova conexão.
- `-MaxTransitions`: para quando atingir N transições.
- `-NoLaunch`: não abre o jogo automaticamente (você abre manualmente).
- `-NoWait`: não espera ENTER; útil com timeout/transitions.

## Saídas
- Log bruto: `rl_socket.log`
- Modelo Q-table: `q_table.json`

Depois, aponte `config.rlQTableFile` / `config.rlQTablePath` para a Q-table gerada.
