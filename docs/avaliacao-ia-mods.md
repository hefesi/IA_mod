# Avaliação da IA (funcionamento e adaptabilidade para variáveis/mods)

## Resultado geral
Status: **aprovado** nos checks automatizados locais.

## O que foi validado
- Integridade básica do mod (`mod.json`) e entrypoint (`scripts/main.js`).
- Alinhamento entre a IA no mod (`scripts/ai.js`) e os trainers Python:
  - ações base RL;
  - features/estado RL.
- Execução real do treinamento offline (`scripts/rl_qlearn.py`) com log sintético.
- Adaptabilidade para mods/variáveis: uma ação custom (`customModAction`) foi incorporada automaticamente à policy gerada.

## Como reproduzir
```bash
python3 scripts/evaluate_ai.py
python3 -m py_compile scripts/rl_qlearn.py scripts/rl_dqn.py scripts/rl_socket_server.py scripts/evaluate_ai.py
```

## Observações sobre adaptabilidade
- O pipeline offline já é **adaptável a novas ações** vindas de outros mods, pois `rl_qlearn.py`/`rl_dqn.py` expandem a lista de ações com base no log.
- Para **novas variáveis de estado** (features), ainda é necessário sincronizar manualmente:
  - `rlQMeta.features` em `scripts/ai.js`;
  - `FEATURE_BUCKETS` em `scripts/rl_qlearn.py`;
  - `FEATURES`/`NORMS` em `scripts/rl_dqn.py`.
