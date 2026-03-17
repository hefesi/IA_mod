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
.\scripts\train_on_pc.ps1 -Exe "C:\Users\Asus\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Google Play Games\Mindustry.exe" -MindustryArgs "-map maze -mode survival -autoplay" -Timeout 1800 -Epochs 8
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

## Exportando modelo DQN para o mod (PyTorch -> JSON)

Se você treinou com `scripts/rl_dqn.py` (saídas: `dqn_model.pt` e `dqn_meta.json`), converta para o formato lido pelo mod:

```powershell
python .\\scripts\\rl_export_nn_json.py --model dqn_model.pt --meta dqn_meta.json --out nn_model.json
```

Depois, no `scripts/ai.js` do mod:
- `rlPolicyMode: "nn"`
- `rlNNFile: "nn_model.json"` (ou `rlNNPath` apontando para o arquivo exportado)
