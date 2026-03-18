# Avaliacao da IA (funcionamento e adaptabilidade para variaveis/mods)

## Resultado geral
Status: **migrado para policy network PPO-style** no fluxo principal.

O mod deixou de depender de `Q-learning/DQN simples` como caminho principal de policy. O runtime agora prioriza `nn_model.json` em `config.rlPolicyMode = "nn"`, e o pipeline offline treina um actor-critic discreto com objetivo PPO-style antes de exportar apenas a cabeca de policy para o jogo.

## O que foi alterado
- `scripts/rl_ppo.py` substitui o DQN simples no treino offline principal.
- `scripts/rl_export_nn_json.py` agora exporta a cabeca de policy de um checkpoint actor-critic para `nn_model.json`.
- `rl_schema.json` centraliza `actions`, `features` e `norms` para o runtime JS e para os trainers Python.
- `scripts/ai.js` passa a:
  - usar `nn` como modo RL padrao;
  - evitar bootstrap aleatorio quando `nn_model.json` nao existe;
  - cair de volta para heuristica se a policy nao estiver treinada;
  - amostrar a ordem de acoes a partir da distribuicao da policy quando o modelo exportado for categorial.
- `scripts/train_headless.ps1`, `scripts/train_on_pc.ps1` e `scripts/train_from_mobile.ps1` agora geram:
  - `ppo_model.pt`
  - `ppo_meta.json`
  - `nn_model.json`

## Como reproduzir
```bash
python3 scripts/evaluate_ai.py
python3 scripts/evaluate_ai.py --log rl_socket.log
python3 -m py_compile scripts/rl_common.py scripts/rl_qlearn.py scripts/rl_ppo.py scripts/rl_dqn.py scripts/rl_export_nn_json.py scripts/rl_socket_server.py scripts/evaluate_ai.py
```

## Adaptabilidade
- Novas acoes continuam entrando automaticamente no treino com base no log.
- O output exportado para o mod carrega `actions`, `features` e `norms` junto com a policy.
- `scripts/ai.js`, `scripts/rl_qlearn.py` e o fluxo `scripts/rl_dqn.py -> scripts/rl_ppo.py` agora leem o mesmo `rl_schema.json`.
- `scripts/train_headless.ps1` agora suporta curriculo de mapas/modos e amostragem aleatoria por rodada para diversificar a coleta offline.
- O caminho legado de `Q-learning` foi mantido como fallback utilitario, mas nao e mais o fluxo recomendado.

## Limitacoes atuais
- O trainer novo e **PPO-style em cima de logs fixos**. Isso melhora bastante a transicao para policy-gradient, mas ainda nao e um loop PPO totalmente on-policy dentro do jogo.
- Para melhores resultados, o ideal continua sendo iterar:
  1. coletar logs novos com a policy mais recente;
  2. retreinar;
  3. reexportar `nn_model.json`.
- Mesmo com curriculo, ainda vale variar seeds, duracao de coleta e mapas ao longo do tempo para nao concentrar o dataset em um unico estilo de partida.
- Se `rl_schema.json` mudar, ainda e preciso regenerar os artefatos derivados (`q_table.json`, `ppo_meta.json` e `nn_model.json`).

## Prioridade pratica sugerida
- Primeiro, usar o novo fluxo `rl_ppo.py -> rl_export_nn_json.py -> nn_model.json` como padrao.
- Depois, tratar `rl_schema.json` como ponto unico para qualquer mudanca em features/acoes/norms.
- Em paralelo, preferir coleta com curriculo de mapas + randomizacao de condicoes para reduzir overfitting em um unico cenario.
- Por fim, se quiser aproximar ainda mais de PPO on-policy, mover a coleta para iteracoes curtas com refresh frequente da policy exportada.
