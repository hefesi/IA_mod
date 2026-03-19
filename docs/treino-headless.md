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
.\scripts\train_headless.ps1 -Map "Maze" -Mode "survival" -Timeout 1800 -Epochs 8 -ParquetOut "logs\maze.parquet" -Validate
```

Se nao informar `-Map`, o script envia apenas `host` (mapa aleatorio, modo survival).

## Curriculo de mapas
Para reduzir overfitting em um unico estilo de partida, o script tambem pode coletar varias rodadas seguidas antes de treinar:

```powershell
.\scripts\train_headless.ps1 -CurriculumMaps "Maze","Fork","Archipelago" -CurriculumRuns 6 -CurriculumRandomize -CurriculumSeed 42 -Timeout 600 -Epochs 8
```

No fluxo atual, cada `CurriculumRun` tambem encerra automaticamente quando a partida dispara `GameOver` (por exemplo: nucleo perdido, ataque concluido ou objetivo de sobrevivencia fechado). O `-Timeout` continua valendo como fallback.

Se voce ja souber os comandos exatos que quer alternar, pode usar `-CurriculumCommands` diretamente:

```powershell
.\scripts\train_headless.ps1 -CurriculumCommands "host Maze survival","host Fork survival","host Archipelago survival" -CurriculumRuns 9 -CurriculumRandomize -Timeout 600
```

## Mapas Default detectados
Na listagem mais recente do servidor, estes mapas apareceram no pack `Default`:

- `Ancient_Caldera` (`256x256`)
- `Archipelago` (`500x500`)
- `Debris_Field` (`400x400`)
- `Domain` (`494x494`)
- `Fork` (`250x300`)
- `Fortress` (`256x256`)
- `Glacier` (`150x250`)
- `Islands` (`256x256`)
- `Labyrinth` (`200x200`)
- `Maze` (`256x256`)
- `Molten_Lake` (`400x400`)
- `Mud_Flats` (`400x400`)
- `Passage` (`500x120`)
- `Shattered` (`350x350`)
- `Tendrils` (`300x300`)
- `Triad` (`200x200`)
- `Veins` (`350x200`)
- `Wasteland` (`300x300`)

Use esses nomes exatamente como apareceram no log ao preencher `-Map`, `-CurriculumMaps` ou `-CurriculumCommands`.

## Parametros uteis
- `-RepoRoot`: caminho do repo Mindustry (onde fica `gradlew.bat`).
- `-Timeout`: para automaticamente apos N segundos sem conexao.
- `-MaxTransitions`: para quando atingir N transicoes.
- `-CurriculumMaps`: lista de mapas para alternar entre rodadas.
- `-CurriculumModes`: lista de modos para alternar junto com os mapas.
- `-CurriculumCommands`: lista de comandos completos para rodadas customizadas.
- `-CurriculumRuns`: quantas rodadas de coleta executar antes do treino final.
- `-CurriculumRandomize`: sorteia mapas/modos/comandos em vez de usar round-robin.
- `-CurriculumSeed`: seed da amostragem aleatoria do curriculo.
- `-CurriculumDelay`: espera entre rodadas do curriculo.
- `-AppendLog`: preserva o `rl_socket.log` existente em vez de limpar no inicio.
- `-NoHost`: nao envia o comando `host` automaticamente.
- `-NoWait`: nao espera ENTER; util com timeout/transitions.
- `-ParquetOut`: exporta o log consolidado para Parquet ao fim da coleta.
- `-Validate`: roda a suite deterministica `scripts/validate_rl_stack.py` ao final.
- `-WandbProject`: ativa tracking do treino PPO no Weights & Biases.
- `-WandbOffline`: salva o tracking do W&B em modo offline.
- `-Seed`: seed global usada no treino PPO e nos wrappers de validacao.

## Saidas
- Log bruto: `rl_socket.log`
- Log do server: `headless_server.log`
- Dataset analitico opcional: `logs/*.parquet`
- Checkpoint PPO SB3 compativel com export: `ppo_model.pt`
- Metadados do treino: `ppo_meta.json`
- Policy pronta para o mod: `nn_model.json`

Depois, rode o mod com `config.rlPolicyMode = "nn"` e aponte `config.rlNNFile` / `config.rlNNPath` para o `nn_model.json` gerado.
