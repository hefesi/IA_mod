# Stack RL Recomendada

Esta trilha padroniza o treino da IA do mod com:

- `Stable-Baselines3` como base RL (`PPO`)
- `Gymnasium` como wrapper do loop de decisao
- `Weights & Biases` para tracking opcional
- `Parquet + DuckDB` para analise de logs grandes
- suite automatica com cenarios fixos e seeds controladas

## Instalacao

```bash
python3 -m pip install -r requirements-rl.txt
```

## Treino PPO via SB3

Treino a partir de logs reais coletados pelo socket:

```bash
python3 scripts/rl_ppo.py \
  --log rl_socket.log \
  --out ppo_model.pt \
  --out-meta ppo_meta.json \
  --epochs 8 \
  --n-steps 256 \
  --batch 64 \
  --parquet-out logs/rl_socket.parquet
```

Treino deterministico com cenarios fixos:

```bash
python3 scripts/rl_ppo.py \
  --env scenarios \
  --scenarios tests/fixtures/rl_validation_scenarios.json \
  --out ppo_model.pt \
  --out-meta ppo_meta.json \
  --seed 19
```

Depois do treino, exporte para o formato consumido pelo mod:

```bash
python3 scripts/rl_export_nn_json.py --model ppo_model.pt --meta ppo_meta.json --out nn_model.json
```

## Tracking com W&B

O tracking e opcional e so e ativado quando `--wandb-project` for informado:

```bash
python3 scripts/rl_ppo.py \
  --log rl_socket.log \
  --wandb-project mindustry-ia \
  --wandb-run-name coleta-maze-seed19 \
  --wandb-offline
```

## Logs em Parquet e analise com DuckDB

Converter o log bruto:

```bash
python3 scripts/rl_log_to_parquet.py --log rl_socket.log --out logs/rl_socket.parquet
```

Resumo pronto:

```bash
python3 scripts/rl_duckdb_query.py --parquet logs/rl_socket.parquet --summary
```

Consulta customizada:

```bash
python3 scripts/rl_duckdb_query.py \
  --parquet logs/rl_socket.parquet \
  --sql "select action, count(*) as n, round(avg(reward), 3) as avg_reward from dataset group by action order by n desc"
```

## Validacao automatica

Suite completa:

```bash
python3 scripts/validate_rl_stack.py
```

O suite cobre:

- determinismo do `MindustryScenarioEnv` com seed fixa
- roundtrip `JSONL -> Parquet -> DuckDB`
- smoke test curto de `PPO` em cenarios fixos quando as dependencias estiverem instaladas

## Wrapper Gymnasium

Foram adicionados dois ambientes:

- `MindustryDatasetEnv`: constroi um simulador leve a partir dos logs do mod e indexa transicoes por estado bucketizado + acao
- `MindustryScenarioEnv`: executa cenarios fixos em JSON para validacao e smoke tests reproduziveis

Ambos usam o mesmo `rl_schema.json` para a observacao e preservam as acoes/fichas do mod.
