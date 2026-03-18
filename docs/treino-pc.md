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
.\scripts\train_on_pc.ps1 -Exe "C:\Users\Asus\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Google Play Games\Mindustry.exe" -MindustryArgs "-map Maze -mode survival -autoplay" -Timeout 1800 -Epochs 8
```

Para curriculo de mapas e randomizacao automatizada de rodadas, hoje o caminho mais simples e confiavel e usar `scripts/train_headless.ps1`.

Quando quiser fixar um mapa aqui, prefira o nome exatamente como o servidor lista no pack `Default`, por exemplo `Maze`, `Fork`, `Archipelago` ou `Wasteland`.

Parâmetros úteis:
- `-Timeout`: para automaticamente após N segundos sem nova conexão.
- `-MaxTransitions`: para quando atingir N transições.
- `-NoLaunch`: não abre o jogo automaticamente (você abre manualmente).
- `-NoWait`: não espera ENTER; útil com timeout/transitions.

## Saídas
- Log bruto: `rl_socket.log`
- Checkpoint PPO-style: `ppo_model.pt`
- Metadados do treino: `ppo_meta.json`
- Policy pronta para o mod: `nn_model.json`

Depois, no `scripts/ai.js` do mod:
- `rlPolicyMode: "nn"`
- `rlNNFile: "nn_model.json"` (ou `rlNNPath` apontando para o arquivo exportado)
